#!/usr/bin/env node
// Ensures 127.0.0.1:5433 forwards to the VPS Postgres (127.0.0.1:5432 on the server).
// Safe to run repeatedly: does nothing if the port is already open.
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const key = path.join(root, ".private", "vps_admin_ed25519");
const knownHosts = path.join(root, ".private", "vps_known_hosts");
const LOCAL_PORT = 5433;
const HOST = process.env.WOYAB_VPS_HOST ?? "root@191.96.94.70";

const isOpen = () =>
  new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port: LOCAL_PORT });
    socket.setTimeout(1500);
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => resolve(false));
    socket.once("timeout", () => { socket.destroy(); resolve(false); });
  });

if (await isOpen()) {
  console.log(`[db-tunnel] 127.0.0.1:${LOCAL_PORT} already open.`);
  process.exit(0);
}

if (!existsSync(key) || !existsSync(knownHosts)) {
  console.warn("[db-tunnel] .private SSH key/known_hosts not found; skipping tunnel.");
  process.exit(0);
}

const child = spawn("ssh", [
  "-N", "-L", `127.0.0.1:${LOCAL_PORT}:127.0.0.1:5432`,
  "-i", key,
  "-o", "BatchMode=yes",
  "-o", "ExitOnForwardFailure=yes",
  "-o", "ServerAliveInterval=30",
  "-o", "StrictHostKeyChecking=yes",
  "-o", `UserKnownHostsFile=${knownHosts.replaceAll("\\", "/")}`,
  HOST,
], { detached: true, stdio: "ignore", windowsHide: true });
child.unref();

for (let attempt = 0; attempt < 20; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  if (await isOpen()) {
    console.log(`[db-tunnel] Tunnel opened on 127.0.0.1:${LOCAL_PORT}.`);
    process.exit(0);
  }
}
console.warn("[db-tunnel] Could not open the tunnel; continuing anyway.");
