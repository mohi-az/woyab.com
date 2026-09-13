#!/usr/bin/env python3
"""Root-owned release controller. No migrations and no arbitrary SSH commands."""
import argparse
import http.client
import json
import os
from pathlib import Path
import re
import socket
import ssl
import subprocess
import tempfile
import time
from urllib.request import Request, urlopen

SHA = re.compile(r"[0-9a-f]{40}\Z")
REGISTRY = "ghcr.io/mohi-az/fargo-"


def validate_release(revision, frontend, api, sequence):
    if not SHA.fullmatch(revision):
        raise ValueError("Expected a full lowercase Git commit SHA")
    for name, value in (("frontend", frontend), ("api", api)):
        if not re.fullmatch(re.escape(REGISTRY + name) + r"@sha256:[0-9a-f]{64}", value):
            raise ValueError("Image must be an immutable digest in the approved repository")
    if not re.fullmatch(r"[1-9][0-9]{0,15}", str(sequence)):
        raise ValueError("Invalid release sequence")


def atomic_write(path, content, mode=0o600):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=".woyab-", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as output:
            output.write(content)
            output.flush()
            os.fsync(output.fileno())
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def run(command):
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode:
        # Container errors can contain provider credentials; don't echo stderr.
        raise RuntimeError(f"{command[0]} failed (exit {result.returncode})")
    return result.stdout.strip()


def request_json(url):
    with urlopen(Request(url, headers={"Cache-Control": "no-cache"}), timeout=12) as response:
        return json.load(response)


def request_origin(host, path):
    # Verify Caddy directly (including certificate/SNI), without relying on CF DNS/cache.
    context = ssl.create_default_context()
    class OriginConnection(http.client.HTTPSConnection):
        def connect(self):
            peer = socket.create_connection(("127.0.0.1", 443), timeout=12)
            try:
                self.sock = context.wrap_socket(peer, server_hostname=self.host)
            except BaseException:
                peer.close()
                raise
    connection = OriginConnection(host, timeout=12, context=context)
    try:
        connection.request("GET", path, headers={"Cache-Control": "no-cache"})
        response = connection.getresponse()
        if response.status != 200:
            raise RuntimeError("Origin HTTPS readiness failed")
        return json.loads(response.read())
    finally:
        connection.close()


def memory_available():
    for line in Path("/proc/meminfo").read_text().splitlines():
        if line.startswith("MemAvailable:"):
            return int(line.split()[1]) * 1024
    raise RuntimeError("Could not determine available memory")


class Controller:
    def __init__(self, root=Path("/opt/woyab"), caddy=Path("/etc/caddy/Caddyfile"),
                 execute=run, get_json=request_json, sleep=time.sleep,
                 available=memory_available, clock=time.monotonic, origin_json=request_origin):
        self.root, self.caddy = Path(root), Path(caddy)
        self.execute, self.get_json, self.sleep = execute, get_json, sleep
        self.available, self.clock = available, clock
        self.origin_json = origin_json
        self.state = self.root / "state"

    def load(self, name):
        journal = self.state / "releases.json"
        if journal.exists():
            return json.loads(journal.read_text()).get(name)
        path = self.state / f"{name}.json"
        return json.loads(path.read_text()) if path.exists() else None

    def compose(self, release, *arguments):
        return self.execute([
            "docker", "compose", "--project-name", f"woyab-{release['slot']}",
            "--env-file", str(self.root / "slots" / f"{release['slot']}.env"),
            "--file", str(self.root / "infra" / "compose.yaml"), *arguments,
        ])

    def ready(self, release):
        for port, path, service in (
            (release["api_port"], "/v1/ready", "api"),
            (release["frontend_port"], "/api/ready", "frontend"),
        ):
            response = self.get_json(f"http://127.0.0.1:{port}{path}")
            if (response.get("status"), response.get("service"), response.get("revision")) != (
                "ok", service, release["revision"],
            ):
                raise RuntimeError("Candidate is not ready or has a mismatched revision")

    def wait_ready(self, release):
        deadline = self.clock() + 180
        while True:
            try:
                self.ready(release)
                return
            except Exception:
                if self.clock() >= deadline:
                    raise RuntimeError("Candidate readiness timed out") from None
                self.sleep(3)

    def verify_images(self, release):
        for image in (release["frontend"], release["api"]):
            self.execute(["docker", "pull", image])
            actual = self.execute([
                "docker", "image", "inspect", "--format",
                '{{index .Config.Labels "org.opencontainers.image.revision"}}', image,
            ])
            if actual != release["revision"]:
                raise RuntimeError("Image revision label does not match the release")

    def stage_assets(self, release):
        destination = self.root / "assets" / "_next" / "static"
        destination.mkdir(parents=True, exist_ok=True)
        # Versioned/hashed Next assets from older builds remain available to old tabs.
        container = self.execute(["docker", "create", release["frontend"]])
        try:
            self.execute(["docker", "cp", f"{container}:/app/apps/frontend/.next/static/.", str(destination)])
        finally:
            self.execute(["docker", "rm", container])

    def routing_check(self, release):
        configuration = json.dumps(self.get_json("http://127.0.0.1:2019/config/apps/http/"))
        for port in (release["frontend_port"], release["api_port"]):
            if f"127.0.0.1:{port}" not in configuration:
                raise RuntimeError("Proxy did not activate both candidate upstreams")

    def proxy_ready(self, release):
        for host, path, service in (("woyab.com", "/api/ready", "frontend"),
                                    ("api.woyab.com", "/v1/ready", "api")):
            response = self.origin_json(host, path)
            if (response.get("status"), response.get("service"), response.get("revision")) != (
                "ok", service, release["revision"],
            ):
                raise RuntimeError("Origin proxy served an unavailable or wrong release")

    def containers_check(self, release):
        ids = self.compose(release, "ps", "--quiet").splitlines()
        if len(ids) != 2:
            raise RuntimeError("Expected two candidate containers")
        for identifier in ids:
            state = json.loads(self.execute(["docker", "inspect", identifier]))[0]
            if (state["State"]["Status"] != "running" or state["State"].get("OOMKilled")
                    or state.get("RestartCount", 0) or state["State"].get("Health", {}).get("Status") != "healthy"):
                raise RuntimeError("Candidate container failed its stability check")

    def deploy(self, revision, frontend, api, sequence, rollback=False):
        validate_release(revision, frontend, api, sequence)
        current = self.load("current")
        if current and int(sequence) <= int(current["sequence"]):
            raise RuntimeError("Refusing an out-of-order release")
        if current and current["revision"] == revision and not rollback:
            raise RuntimeError("This revision is already active")
        for name in ("api", "frontend"):
            if not (self.root / "env" / f"{name}.env").is_file():
                raise RuntimeError("Production environment files are not installed")
        # Candidate limits are 512 + 256 MiB; keep another 192 MiB for the host.
        if self.available() < (512 + 256 + 192) * 1024 * 1024:
            raise RuntimeError("Insufficient memory; current release has not been touched")
        slot = "green" if current and current["slot"] == "blue" else "blue"
        release = dict(revision=revision, frontend=frontend, api=api, sequence=int(sequence),
                       slot=slot, frontend_port=3000 if slot == "blue" else 3001,
                       api_port=4000 if slot == "blue" else 4001)
        self.verify_images(release)
        environment = "\n".join((
            f"APP_REVISION={revision}", f"FRONTEND_IMAGE={frontend}", f"API_IMAGE={api}",
            f"FRONTEND_PORT={release['frontend_port']}", f"API_PORT={release['api_port']}", "",
        ))
        atomic_write(self.root / "slots" / f"{slot}.env", environment)
        self.stage_assets(release)
        template = (self.root / "infra" / "Caddyfile.template").read_text()
        candidate = template.replace("__FRONTEND_PORT__", str(release["frontend_port"]))
        candidate = candidate.replace("__API_PORT__", str(release["api_port"]))
        candidate_path = self.state / "Caddyfile.candidate"
        atomic_write(candidate_path, candidate, 0o644)
        self.execute(["caddy", "validate", "--config", str(candidate_path), "--adapter", "caddyfile"])
        original = self.caddy.read_text() if self.caddy.exists() else None
        switched = False
        started = False
        try:
            started = True
            self.compose(release, "up", "--detach", "--remove-orphans", "--wait", "--wait-timeout", "180")
            self.wait_ready(release)
            # The active pair changes in one Caddy configuration reload.
            atomic_write(self.caddy, candidate, 0o644)
            switched = True
            self.execute(["caddy", "reload", "--config", str(self.caddy), "--adapter", "caddyfile"])
            self.routing_check(release)
            for _ in range(6):
                self.ready(release)
                self.containers_check(release)
                if current:
                    self.proxy_ready(release)
                self.sleep(5)
            if not current:
                print("Initial DNS cutover and origin HTTPS verification still required", flush=True)
            # One atomic journal update keeps current and rollback target consistent.
            atomic_write(self.state / "releases.json", json.dumps({
                "current": release, "previous": current,
            }, indent=2) + "\n")
        except BaseException:
            if switched and original is not None:
                # If restoring the proxy fails, leave both pairs alive for recovery.
                atomic_write(self.caddy, original, 0o644)
                self.execute(["caddy", "reload", "--config", str(self.caddy), "--adapter", "caddyfile"])
            elif switched:
                raise RuntimeError("Initial proxy activation failed; candidate retained for diagnosis") from None
            if started:
                self.compose(release, "down", "--timeout", "30")
            raise
        print(f"Activated {revision} in {slot}", flush=True)
        if current:
            self.sleep(30)
            try:
                self.compose(current, "down", "--timeout", "30")
            except Exception:
                print("WARNING: old slot cleanup failed; new release remains active", flush=True)
        return release

    def rollback(self, sequence):
        previous = self.load("previous")
        if not previous:
            raise RuntimeError("No previous release is available")
        return self.deploy(previous["revision"], previous["frontend"], previous["api"], sequence, rollback=True)


def main():
    parser = argparse.ArgumentParser()
    subcommands = parser.add_subparsers(dest="action", required=True)
    deploy = subcommands.add_parser("deploy")
    for argument in ("revision", "frontend", "api", "sequence"):
        deploy.add_argument(argument)
    rollback = subcommands.add_parser("rollback")
    rollback.add_argument("sequence")
    options = parser.parse_args()
    if os.geteuid() != 0:
        raise RuntimeError("Release controller must run as root")
    import fcntl
    Path("/opt/woyab/state").mkdir(parents=True, exist_ok=True)
    with open("/opt/woyab/state/deploy.lock", "a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        controller = Controller()
        if options.action == "rollback":
            controller.rollback(options.sequence)
        else:
            controller.deploy(options.revision, options.frontend, options.api, options.sequence)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Release aborted: {error}", flush=True)
        raise SystemExit(1)
