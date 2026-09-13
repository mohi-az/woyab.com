#!/usr/bin/env bash
# Run ONLY after verifying VPS identity, existing services and its SSH host key.
# Does not install production secrets, change DNS, or touch any database.
set -euo pipefail
[[ $(id -u) == 0 ]] || { echo 'Root is required.' >&2; exit 1; }
source /etc/os-release
[[ $ID == ubuntu && $VERSION_ID == 24.04 ]] || { echo 'Expected Ubuntu 24.04.' >&2; exit 1; }
[[ $(dpkg --print-architecture) == amd64 ]] || { echo 'Expected amd64.' >&2; exit 1; }
source_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
[[ -f $source_dir/release.py && -f $source_dir/compose.yaml ]] || exit 1
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl gnupg python3 sudo ufw debian-keyring debian-archive-keyring apt-transport-https
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
printf 'Types: deb\nURIs: https://download.docker.com/linux/ubuntu\nSuites: noble\nComponents: stable\nArchitectures: amd64\nSigned-By: /etc/apt/keyrings/docker.asc\n' > /etc/apt/sources.list.d/docker.sources
curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key -o /etc/apt/keyrings/woyab-caddy.asc
gpg --batch --yes --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/keyrings/woyab-caddy.asc
curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt -o /etc/apt/sources.list.d/caddy-stable.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin caddy
systemctl enable --now docker caddy

install -d -m 0755 /opt/woyab /opt/woyab/infra /opt/woyab/assets
install -d -m 0700 /opt/woyab/env /opt/woyab/state /opt/woyab/slots /opt/woyab/backups
install -d -m 0755 /opt/woyab/media /opt/woyab/media/business-images /opt/woyab/media/uploads /opt/woyab/cache /opt/woyab/cache/google-photos
chown 1000:1000 /opt/woyab/media/business-images /opt/woyab/media/uploads /opt/woyab/cache/google-photos
for file in release.py backup.py compose.yaml Caddyfile.template; do
    install -o root -g root -m 0644 "$source_dir/$file" "/opt/woyab/infra/$file"
done
install -o root -g root -m 0755 "$source_dir/ssh-entrypoint.sh" /usr/local/sbin/woyab-ssh-entrypoint
install -o root -g root -m 0755 "$source_dir/woyab-deploy.sh" /usr/local/sbin/woyab-deploy
if ! id woyab-deploy >/dev/null 2>&1; then
    useradd --create-home --shell /bin/bash woyab-deploy
fi
# Locked password still permits key authentication. Never add this user to docker.
passwd -l woyab-deploy
chown root:root /home/woyab-deploy
chmod 0755 /home/woyab-deploy
install -o root -g root -d -m 0755 /home/woyab-deploy/.ssh
if [[ ! -e /home/woyab-deploy/.ssh/authorized_keys ]]; then
    install -o root -g root -m 0644 /dev/null /home/woyab-deploy/.ssh/authorized_keys
fi
printf 'woyab-deploy ALL=(root) NOPASSWD: /usr/local/sbin/woyab-deploy\n' > /etc/sudoers.d/woyab-deploy
chmod 0440 /etc/sudoers.d/woyab-deploy
visudo -cf /etc/sudoers.d/woyab-deploy
printf 'Match User woyab-deploy\n    ForceCommand /usr/local/sbin/woyab-ssh-entrypoint\n    AuthenticationMethods publickey\n    PasswordAuthentication no\n    PermitTTY no\n    AllowTcpForwarding no\n    AllowAgentForwarding no\n    X11Forwarding no\n    PermitTunnel no\nMatch all\n' > /etc/ssh/sshd_config.d/60-woyab-deploy.conf
/usr/sbin/sshd -t
systemctl reload ssh
install -o root -g root -m 0644 "$source_dir/woyab-backup.service" /etc/systemd/system/woyab-backup.service
install -o root -g root -m 0644 "$source_dir/woyab-backup.timer" /etc/systemd/system/woyab-backup.timer
systemctl daemon-reload
systemctl enable --now woyab-backup.timer

# Preserve existing firewall rules; first inspect them and verify port 22 is SSH.
# Docker publishes application ports ONLY to loopback in compose.yaml.
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw default deny incoming
ufw default allow outgoing
ufw --force enable
docker compose version
caddy version
printf 'Bootstrap installed. Production environment, restricted key and initial release remain separate steps.\n'
