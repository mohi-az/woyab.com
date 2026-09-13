#!/usr/bin/env python3
"""Back up persistent media and private configuration; keep seven successful archives."""
from datetime import datetime, timezone
import os
from pathlib import Path
import tarfile


def backup(root=Path("/opt/woyab")):
    destination = root / "backups"
    destination.mkdir(mode=0o700, parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S-%f")
    target = destination / f"woyab-{stamp}.tar.gz"
    temporary = destination / f".woyab-{stamp}.partial"
    try:
        descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "wb") as output, tarfile.open(fileobj=output, mode="w:gz") as archive:
            for name in ("media", "env", "state"):
                path = root / name
                if path.exists():
                    archive.add(path, arcname=name, recursive=True)
        os.replace(temporary, target)
    finally:
        temporary.unlink(missing_ok=True)
    for old in sorted(destination.glob("woyab-????????-??????-??????.tar.gz"), reverse=True)[7:]:
        if old.is_file() and not old.is_symlink():
            old.unlink()
    print(f"Backup complete: {target.name}")
    return target


if __name__ == "__main__":
    if os.geteuid() != 0:
        raise SystemExit("Backups must run as root")
    backup()
