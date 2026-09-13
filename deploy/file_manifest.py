#!/usr/bin/env python3
"""Inventory/compare recovered files without copying or deleting originals."""
import argparse
import hashlib
import json
from pathlib import Path


def inventory(directory):
    root = Path(directory).resolve(strict=True)
    if not root.is_dir():
        raise ValueError("Expected a directory")
    entries = {}
    for path in sorted(root.rglob("*")):
        if path.is_symlink():
            raise ValueError("Symlinks require manual review before transfer")
        if path.is_file():
            digest = hashlib.sha256()
            with path.open("rb") as source:
                for chunk in iter(lambda: source.read(1024 * 1024), b""):
                    digest.update(chunk)
            entries[path.relative_to(root).as_posix()] = {
                "size": path.stat().st_size, "sha256": digest.hexdigest(),
            }
    return {"count": len(entries), "bytes": sum(e["size"] for e in entries.values()), "files": entries}


def compare(first, second):
    a, b = first["files"], second["files"]
    return {
        "missing": sorted(a.keys() - b.keys()), "extra": sorted(b.keys() - a.keys()),
        "different": sorted(k for k in a.keys() & b.keys() if a[k] != b[k]),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest="action", required=True)
    create = commands.add_parser("create")
    create.add_argument("directory")
    create.add_argument("output")
    check = commands.add_parser("compare")
    check.add_argument("source")
    check.add_argument("destination")
    options = parser.parse_args()
    if options.action == "create":
        result = inventory(options.directory)
        # Refuse to overwrite an existing recovery inventory.
        with Path(options.output).open("x", encoding="utf-8") as output:
            json.dump(result, output, indent=2)
        print(f"Inventoried {result['count']} files, {result['bytes']} bytes")
    else:
        result = compare(json.loads(Path(options.source).read_text()), json.loads(Path(options.destination).read_text()))
        print(json.dumps(result, indent=2))
        raise SystemExit(1 if any(result.values()) else 0)
