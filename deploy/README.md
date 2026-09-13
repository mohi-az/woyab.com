# VPS deployment (not yet activated)

The production database stays in Neon. These deployment commands **never** run
Prisma migrations, `db push`, reset, or seed. Prisma Client generation is build-only.

## Current status

Local implementation includes Docker builds, a web-only frozen pnpm lock,
Compose, paired Blue/Green readiness, Caddy routing, a restricted SSH receiver,
GitHub Actions, persistent bind mounts and seven daily local backups.

VPS bootstrap, real Linux builds, secrets, media recovery, DNS cutover and end-to-end
production checks remain pending. `VPS_DEPLOY_ENABLED` must stay unset/false until
the initial deployment and HTTPS checks pass. Infrastructure files are installed
separately; pushing app images does not upgrade the root-owned release controller.

## Safe initial deployment

1. Verify VPS IP/OS/resources, SSH host-key fingerprint via provider console,
   existing services and firewall rules. Do not overwrite an occupied server.
2. Transfer this `deploy/` directory; run `bash bootstrap.sh` as root on verified
   Ubuntu 24.04 amd64. Review firewall rules before enabling it; only 22/80/443 are
   intended public TCP ports. Docker app ports are bound to loopback, not public.
3. Export the actual Railway production environments privately. Install
   `/opt/woyab/env/frontend.env` and `/opt/woyab/env/api.env`, root:root mode 0600.
   The `.example` files are not runnable configuration. Preserve Neon URLs,
   AUTH_SECRET, OAuth, 2FA and AI encryption keys, and INTERNAL_API_SECRET.
4. Download the Railway frontend volume with the official CLI to a private local
   directory. First verify access using `railway volume files --volume ID list /`;
   then use `railway volume files --volume ID download / LOCAL_DIRECTORY`.
   Do not renew, pay, delete Railway resources, or assume local uploads are complete.
   Preserve the raw export locally; generate inventories using `file_manifest.py`.
   Transfer into `/opt/woyab/media/business-images`, compare names/sizes/SHA256,
   then set image ownership UID/GID 1000. Recover legacy `/uploads` separately.
   Test reading existing AND newly uploaded files before claiming recovery.
5. Keep images/GHCR packages private. User production secrets exist only in the
   VPS environment files, not Git or builds. Next generates its internal action
   key per built image; commit deploymentId triggers refresh for version skew.
   Do not pass AUTH_SECRET, OAuth, AI or 2FA encryption keys to image builds.
6. Commit/push validated source to `main`; keep auto-deploy disabled. The workflow
   builds/tests in Linux and publishes both images. Use its summary's full commit
   SHA and immutable digests. Configure private GHCR read-only login on the VPS
   via stdin, not command-line tokens; root Docker config stays private.
7. Initial manual release (substitute verified values, never `latest`):

   ```sh
   /usr/local/sbin/woyab-deploy deploy COMMIT_SHA ghcr.io/mohi-az/fargo-frontend@sha256:FRONTEND_DIGEST ghcr.io/mohi-az/fargo-api@sha256:API_DIGEST WORKFLOW_RUN_NUMBER
   ```

   The systemd-owned process survives SSH disconnect. Reconcile release state and
   logs if SSH ends unexpectedly; a failed connection is not proof of rollback.
   Verify both loopback readiness endpoints, application pages and real data.
8. Only now replace the two Cloudflare CNAME records with A records for
   `191.96.94.70`, initially DNS-only. Preserve every mail/verification record and
   create no unverified AAAA. Confirm Caddy certificates and HTTPS, then enable
   proxy for both names and set manual Full (strict), not Flexible. Confirm cache
   bypass for API/login/private/dynamic HTML, with no Cache Everything rule.
9. Generate a dedicated SSH key; install its public key as the root-owned,
   user-readable `/home/woyab-deploy/.ssh/authorized_keys` (0644) entry:

   ```text
   restrict,command="/usr/local/sbin/woyab-ssh-entrypoint" ssh-ed25519 PUBLIC_KEY
   ```

   Never grant Docker group membership, arbitrary sudo commands, a root password,
   interactive shell or port forwarding to GitHub. Store the private key only in
   GitHub `VPS_SSH_KEY` and a protected local recovery directory. Set
   `VPS_KNOWN_HOSTS` from the independently verified SSH host key. Configure the
   production environment/protections and public Sentry DSN variable if needed.
10. Exercise successful deploy, intentionally failed build and readiness,
    post-switch rollback, consecutive pushes, old tabs, media writes and reboot.
    Test login/2FA without modifying production data unnecessarily. Then set
    repository variable `VPS_DEPLOY_ENABLED=true`.

## Operations

```sh
cat /opt/woyab/state/releases.json
journalctl -u 'woyab-release-*' --since today
journalctl -u caddy -n 100 --no-pager
docker compose -p woyab-blue --env-file /opt/woyab/slots/blue.env -f /opt/woyab/infra/compose.yaml logs --tail 100
systemctl status woyab-backup.timer
systemctl start woyab-backup.service
```

Use the active slot from `releases.json`; private application logs must not be
published. Manual rollback is the workflow's `rollback` dispatch, using a new run
number. The root wrapper also supports `rollback NEW_SEQUENCE`; it restores only
the previous validated pair, never the database. An emergency manual sequence can
cause subsequent lower-numbered CI deployments to be rejected: reconcile CI run
numbers before re-enabling it.

Admission requires at least 960 MiB available before starting another pair. API and
frontend limits are 256/512 MiB per slot. A refused candidate must not change the
current proxy. This is not an unconditional zero-downtime guarantee on a 2GB VPS.

Daily UTC backups include `media`, `env`, and release state and keep seven successful
archives under `/opt/woyab/backups`. These contain secrets: root-only, never Git.
Copy backups off-server separately. Inspect and extract archives into a separate
recovery directory, compare file manifests, and restore only selected paths after
review; do not blindly overwrite the live media or environment.

## Local validation

```sh
python3 -m unittest discover -s deploy/tests -v
node --test apps/api/tests/*.test.mjs apps/frontend/tests/*.test.mjs packages/shared/tests/*.test.mjs
pnpm --filter api typecheck
pnpm --dir apps/frontend exec tsc --noEmit
```

GitHub additionally builds `verification` in Docker before either deployment is
eligible. Only the intended four web packages participate; mobile changes cannot
silently change container dependencies. The lock preserves the frontend's tracked
versions and existing installed API/database/shared resolutions.
