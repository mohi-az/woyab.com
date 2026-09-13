import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch


def load_module(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).parents[1] / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


release = load_module("release")
backup_module = load_module("backup")
OLD = "a" * 40
NEW = "b" * 40
FRONTEND = release.REGISTRY + "frontend@sha256:" + "c" * 64
API = release.REGISTRY + "api@sha256:" + "d" * 64


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        for directory in ("state", "env", "infra"):
            (self.root / directory).mkdir()
        for service in ("api", "frontend"):
            (self.root / "env" / f"{service}.env").write_text("test")
        (self.root / "infra" / "Caddyfile.template").write_text("127.0.0.1:__FRONTEND_PORT__ 127.0.0.1:__API_PORT__")
        self.caddy = self.root / "Caddyfile"
        self.caddy.write_text("127.0.0.1:3000 127.0.0.1:4000")
        self.old = dict(revision=OLD, frontend=FRONTEND, api=API, sequence=1,
                        slot="blue", frontend_port=3000, api_port=4000)
        (self.root / "state" / "releases.json").write_text(json.dumps({"current": self.old, "previous": None}))
        self.commands = []
        self.now = 0
        self.readiness_failure = False
        self.stability_failure = False
        self.label = NEW
        self.controller = release.Controller(self.root, self.caddy, execute=self.execute,
                                             get_json=self.get_json, sleep=self.sleep,
                                             available=lambda: 2 * 1024**3, clock=lambda: self.now,
                                             origin_json=lambda host, path: dict(status="ok", revision=self.label,
                                                                                service="api" if host.startswith("api.") else "frontend"))

    def sleep(self, seconds):
        self.now += seconds

    def execute(self, command):
        self.commands.append(command)
        if command[:3] == ["docker", "image", "inspect"]:
            return self.label
        if command[:2] == ["docker", "create"]:
            return "asset-container"
        if "ps" in command:
            return "frontend-id\napi-id"
        if command[:2] == ["docker", "inspect"]:
            state = dict(State=dict(Status="running", OOMKilled=self.stability_failure,
                                    Health=dict(Status="healthy")), RestartCount=0)
            return json.dumps([state])
        return ""

    def get_json(self, url):
        if ":2019/" in url:
            return self.caddy.read_text()
        if self.readiness_failure:
            raise RuntimeError("private DB connection details must not be printed")
        service = "frontend" if ":300" in url else "api"
        return dict(status="ok", service=service, revision=self.label)

    def deploy(self, sequence=2):
        return self.controller.deploy(NEW, FRONTEND, API, sequence)

    def stopped_slots(self):
        return [c[c.index("--project-name") + 1] for c in self.commands if "down" in c]

    def test_success_switches_both_and_stops_old_after_checks(self):
        result = self.deploy()
        self.assertEqual(result["slot"], "green")
        self.assertEqual(self.caddy.read_text(), "127.0.0.1:3001 127.0.0.1:4001")
        self.assertEqual(self.controller.load("current"), result)
        self.assertEqual(self.controller.load("previous"), self.old)
        self.assertEqual(self.stopped_slots(), ["woyab-blue"])
        self.assertGreaterEqual(self.now, 60)
        self.assertEqual(sum(c[:2] == ["caddy", "reload"] for c in self.commands), 1)

    def test_readiness_failure_does_not_switch_or_stop_current(self):
        self.readiness_failure = True
        with self.assertRaisesRegex(RuntimeError, "readiness timed out"):
            self.deploy()
        self.assertEqual(self.caddy.read_text(), "127.0.0.1:3000 127.0.0.1:4000")
        self.assertEqual(self.controller.load("current"), self.old)
        self.assertEqual(self.stopped_slots(), ["woyab-green"])
        self.assertFalse(any(c[:2] == ["caddy", "reload"] for c in self.commands))

    def test_post_switch_failure_restores_proxy_and_current(self):
        self.stability_failure = True
        with self.assertRaisesRegex(RuntimeError, "stability"):
            self.deploy()
        self.assertEqual(self.caddy.read_text(), "127.0.0.1:3000 127.0.0.1:4000")
        self.assertEqual(self.controller.load("current"), self.old)
        self.assertEqual(self.stopped_slots(), ["woyab-green"])
        self.assertEqual(sum(c[:2] == ["caddy", "reload"] for c in self.commands), 2)

    def test_wrong_revision_through_origin_https_rolls_back(self):
        self.controller.origin_json = lambda host, path: dict(status="ok", service="frontend", revision=OLD)
        with self.assertRaisesRegex(RuntimeError, "Origin proxy"):
            self.deploy()
        self.assertEqual(self.caddy.read_text(), "127.0.0.1:3000 127.0.0.1:4000")
        self.assertEqual(self.controller.load("current"), self.old)
        self.assertEqual(self.stopped_slots(), ["woyab-green"])

    def test_initial_release_does_not_require_cert_before_dns_cutover(self):
        (self.root / "state" / "releases.json").unlink()
        self.controller.origin_json = lambda host, path: self.fail("HTTPS is verified after initial cutover")
        result = self.deploy(1)
        self.assertEqual(result["slot"], "blue")
        self.assertIsNone(self.controller.load("previous"))

    def test_failed_proxy_restore_keeps_both_pairs_alive(self):
        normal = self.execute
        reloads = 0
        def failing(command):
            nonlocal reloads
            if command[:2] == ["caddy", "reload"]:
                reloads += 1
                if reloads == 2:
                    raise RuntimeError("restore failed")
            return normal(command)
        self.controller.execute = failing
        self.stability_failure = True
        with self.assertRaisesRegex(RuntimeError, "restore failed"):
            self.deploy()
        self.assertEqual(self.stopped_slots(), [])
        self.assertEqual(self.controller.load("current"), self.old)

    def test_journal_write_failure_rolls_back_before_stopping_candidate(self):
        normal = release.atomic_write
        def failing(path, content, mode=0o600):
            if Path(path).name == "releases.json":
                raise OSError("disk full")
            return normal(path, content, mode)
        with patch.object(release, "atomic_write", side_effect=failing):
            with self.assertRaises(OSError):
                self.deploy()
        self.assertEqual(self.controller.load("current"), self.old)
        self.assertEqual(self.caddy.read_text(), "127.0.0.1:3000 127.0.0.1:4000")
        self.assertEqual(self.stopped_slots(), ["woyab-green"])

    def test_low_memory_rejects_before_any_docker_or_proxy_changes(self):
        self.controller.available = lambda: 900 * 1024**2
        with self.assertRaisesRegex(RuntimeError, "Insufficient memory"):
            self.deploy()
        self.assertEqual(self.commands, [])

    def test_old_sequence_rejected_before_any_changes(self):
        with self.assertRaisesRegex(RuntimeError, "out-of-order"):
            self.deploy(1)
        self.assertEqual(self.commands, [])

    def test_wrong_image_revision_rejected_before_start(self):
        self.label = OLD
        with self.assertRaisesRegex(RuntimeError, "revision label"):
            self.deploy()
        self.assertFalse(any("up" in c or "down" in c for c in self.commands))

    def test_rollback_uses_previous_pair_with_new_sequence(self):
        self.deploy()
        self.label = OLD
        result = self.controller.rollback(3)
        self.assertEqual(result["revision"], OLD)
        self.assertEqual(result["slot"], "blue")
        self.assertEqual(result["sequence"], 3)
        self.assertEqual(self.controller.load("previous")["revision"], NEW)

    def test_missing_rollback_target_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "No previous"):
            self.controller.rollback(2)

    def test_invalid_ssh_arguments_rejected(self):
        for revision, frontend, api, sequence in (
            ("main", FRONTEND, API, 2), (NEW, "ghcr.io/mohi-az/fargo-frontend:latest", API, 2),
            (NEW, FRONTEND, "ghcr.io/other/image@sha256:" + "d" * 64, 2),
            (NEW, FRONTEND, API, "2; reboot"), (NEW, FRONTEND, API, 0),
        ):
            with self.assertRaises(ValueError):
                self.controller.deploy(revision, frontend, api, sequence)
        self.assertEqual(self.commands, [])


class BackupTests(unittest.TestCase):
    def test_only_seven_successful_archives_and_unrelated_file_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "media").mkdir()
            (root / "media" / "photo.txt").write_text("media")
            destination = root / "backups"
            destination.mkdir()
            unrelated = destination / "railway-export.tar.gz"
            unrelated.write_text("preserve")
            for _ in range(9):
                target = backup_module.backup(root)
            self.assertEqual(len(list(destination.glob("woyab-*.tar.gz"))), 7)
            self.assertEqual(unrelated.read_text(), "preserve")
            with backup_module.tarfile.open(target) as archive:
                self.assertEqual(archive.extractfile("media/photo.txt").read(), b"media")
            self.assertFalse(list(destination.glob("*.partial")))


if __name__ == "__main__":
    unittest.main()
