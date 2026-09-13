#!/usr/bin/env bash
set -euo pipefail
# systemd owns the release process: disconnecting SSH must not kill it mid-switch.
# The controller takes the global lock and validates ALL arguments before mutations.
exec /usr/bin/systemd-run --quiet --wait --collect \
    --unit="woyab-release-$(date +%s)-$$" --property=Type=exec \
    /usr/bin/python3 /opt/woyab/infra/release.py "$@"
