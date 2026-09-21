#!/usr/bin/env python3
"""
WoYab automated backup system with Google Drive replication and email alerts.
Supports:
  --type=db     : Daily database dump + env + state (retains 7 on VPS, 30d on GDrive)
  --type=media  : Weekly media/uploads archive (retains 4 on VPS, 60d on GDrive)
  --type=all    : Run both backups
  --test-alert  : Send a test alert email to verify SMTP configuration
  --alert-only  : Triggered by systemd OnFailure unit
"""

import argparse
from datetime import datetime, timezone
from email.mime.text import MIMEText
import os
from pathlib import Path
import smtplib
import ssl
import subprocess
import sys
import tarfile
import traceback

DEFAULT_ROOT = Path("/opt/woyab")
DEFAULT_ENV_FILE = DEFAULT_ROOT / "env" / "backup.env"


def load_config(env_path=DEFAULT_ENV_FILE):
    config = {
        "SMTP_HOST": "smtp.gmail.com",
        "SMTP_PORT": "465",
        "SMTP_USER": "m.azizzade@gmail.com",
        "SMTP_PASS": "nnmz yrae rbzm midc",
        "ALERT_EMAIL": "m.azizzade@gmail.com",
        "GDRIVE_REMOTE": "gdrive:woyab-DB-Backup",
    }
    if env_path.is_file():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                config[key.strip()] = val.strip().strip("\"'")
    return config


def send_alert(subject, body, config=None):
    if config is None:
        config = load_config()
    smtp_host = config.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(config.get("SMTP_PORT", 465))
    smtp_user = config.get("SMTP_USER")
    smtp_pass = config.get("SMTP_PASS")
    alert_to = config.get("ALERT_EMAIL", smtp_user)

    if not (smtp_user and smtp_pass and alert_to):
        print("Warning: SMTP credentials not configured; skipping email alert.")
        return False

    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = f"WoYab Backup Alert <{smtp_user}>"
    msg["To"] = alert_to
    msg["Date"] = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")

    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context) as server:
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
    print(f"Alert email sent to {alert_to}")
    return True


def prune_local(destination, pattern, keep_count):
    files = sorted(destination.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
    for old in files[keep_count:]:
        if old.is_file() and not old.is_symlink():
            try:
                old.unlink()
                print(f"Pruned old local backup: {old.name}")
            except Exception as e:
                print(f"Warning: could not delete {old.name}: {e}")


def rclone_upload_and_prune(target_file, gdrive_subfolder, min_age_delete, config):
    remote = config.get("GDRIVE_REMOTE", "gdrive:woyab-DB-Backup")
    dest_path = f"{remote}/{gdrive_subfolder}/"
    print(f"Uploading {target_file.name} to {dest_path} ...")
    upload_cmd = ["rclone", "copy", str(target_file), dest_path]
    res = subprocess.run(upload_cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"rclone copy failed:\n{res.stderr}")
    print(f"Upload complete: {target_file.name} -> {dest_path}")

    if min_age_delete:
        prune_cmd = ["rclone", "delete", "--min-age", min_age_delete, dest_path]
        pres = subprocess.run(prune_cmd, capture_output=True, text=True)
        if pres.returncode != 0:
            print(f"Warning: rclone prune failed on {dest_path}: {pres.stderr}")


def backup_database(root=DEFAULT_ROOT, config=None):
    if config is None:
        config = load_config()
    destination = root / "backups" / "database"
    destination.mkdir(mode=0o700, parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    target = destination / f"woyab-db-{stamp}.tar.gz"
    temporary = destination / f".woyab-db-{stamp}.partial"
    dump_target = root / "state" / "postgres-woyab.dump"

    print(f"Starting database backup at {stamp} UTC...")
    with open(dump_target, "wb") as dump_file:
        res = subprocess.run(
            ["sudo", "-u", "postgres", "pg_dump", "-Fc", "woyab"],
            stdout=dump_file,
            stderr=subprocess.PIPE,
            check=False,
        )
        if res.returncode != 0:
            dump_target.unlink(missing_ok=True)
            raise RuntimeError(f"pg_dump failed: {res.stderr.decode(errors='replace')}")

    try:
        descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "wb") as output, tarfile.open(fileobj=output, mode="w:gz") as archive:
            for name in ("env", "state"):
                path = root / name
                if path.exists():
                    archive.add(path, arcname=name, recursive=True)
        os.replace(temporary, target)
    finally:
        temporary.unlink(missing_ok=True)
        dump_target.unlink(missing_ok=True)

    prune_local(destination, "woyab-db-*.tar.gz", keep_count=7)
    rclone_upload_and_prune(target, "database", min_age_delete="30d", config=config)
    print(f"Database backup complete: {target.name}")
    return target


def backup_media(root=DEFAULT_ROOT, config=None):
    if config is None:
        config = load_config()
    destination = root / "backups" / "media"
    destination.mkdir(mode=0o700, parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    target = destination / f"woyab-media-{stamp}.tar.gz"
    temporary = destination / f".woyab-media-{stamp}.partial"

    print(f"Starting media backup at {stamp} UTC...")
    try:
        descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "wb") as output, tarfile.open(fileobj=output, mode="w:gz") as archive:
            media_path = root / "media"
            if media_path.exists():
                archive.add(media_path, arcname="media", recursive=True)
        os.replace(temporary, target)
    finally:
        temporary.unlink(missing_ok=True)

    prune_local(destination, "woyab-media-*.tar.gz", keep_count=4)
    rclone_upload_and_prune(target, "media", min_age_delete="60d", config=config)
    print(f"Media backup complete: {target.name}")
    return target


def main():
    parser = argparse.ArgumentParser(description="WoYab Automated Backup Runner")
    parser.add_argument(
        "--type",
        choices=["db", "media", "all"],
        default="db",
        help="Type of backup to perform: db (daily), media (weekly), or all",
    )
    parser.add_argument("--root", default="/opt/woyab", help="Root directory for WoYab")
    parser.add_argument("--test-alert", action="store_true", help="Send a test email alert")
    parser.add_argument("--alert-only", action="store_true", help="Trigger alert for systemd failure")
    parser.add_argument("--service-name", default="woyab-backup", help="Service name reporting failure")
    args = parser.parse_args()

    root = Path(args.root)
    config = load_config(root / "env" / "backup.env")

    if args.test_alert:
        send_alert(
            "[TEST] WoYab Backup Alert System Test",
            f"This is a test notification from the WoYab backup alert system on VPS.\nTimestamp: {datetime.now(timezone.utc).isoformat()} UTC\nHost: 191.96.94.70",
            config=config,
        )
        return

    if args.alert_only:
        send_alert(
            f"[ALERT] Systemd Unit {args.service_name} Failed on VPS",
            f"The backup service '{args.service_name}' failed unexpectedly on VPS (191.96.94.70).\nCheck logs with: journalctl -u {args.service_name} -n 50",
            config=config,
        )
        return

    if os.geteuid() != 0:
        raise SystemExit("Backups must run as root")

    try:
        if args.type in ("db", "all"):
            backup_database(root=root, config=config)
        if args.type in ("media", "all"):
            backup_media(root=root, config=config)
    except Exception as e:
        tb = traceback.format_exc()
        subject = f"[ALERT] WoYab Backup Failed ({args.type}) on VPS"
        body = (
            f"A failure occurred during the WoYab backup ({args.type}) on VPS (191.96.94.70).\n\n"
            f"Timestamp: {datetime.now(timezone.utc).isoformat()} UTC\n"
            f"Error: {e}\n\n"
            f"Traceback:\n{tb}\n"
        )
        try:
            send_alert(subject, body, config=config)
        except Exception as alert_err:
            print(f"Critical: Failed to send alert email: {alert_err}", file=sys.stderr)
        raise


if __name__ == "__main__":
    main()
