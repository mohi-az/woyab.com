#!/usr/bin/env bash
set -euo pipefail
# AuthorizedKeys forces this root-owned receiver. Reject shell syntax and forwarding.
command=${SSH_ORIGINAL_COMMAND:-}
sha='[0-9a-f]{40}'
digest='[0-9a-f]{64}'
sequence='[1-9][0-9]{0,15}'
if [[ $command =~ ^deploy\ ($sha)\ (ghcr\.io/mohi-az/fargo-frontend@sha256:$digest)\ (ghcr\.io/mohi-az/fargo-api@sha256:$digest)\ ($sequence)$ ]]; then
    exec sudo -n /usr/local/sbin/woyab-deploy deploy "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}" "${BASH_REMATCH[3]}" "${BASH_REMATCH[4]}"
elif [[ $command =~ ^rollback\ ($sequence)$ ]]; then
    exec sudo -n /usr/local/sbin/woyab-deploy rollback "${BASH_REMATCH[1]}"
else
    printf 'Only a validated deployment or rollback command is allowed.\n' >&2
    exit 64
fi
