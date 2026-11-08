import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

function loadRuntimeEnvironment(path = ".env") {
  if (!existsSync(path)) return;

  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator < 1) continue;

    const key = line.slice(0, separator).replace(/^export\s+/, "").trim();
    let value = line.slice(separator + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadRuntimeEnvironment();

console.log(`Resend email delivery: ${process.env.RESEND_API_KEY?.trim() ? "configured" : "missing"}.`);

const migration = spawnSync(process.execPath, ["scripts/migrate-db.mjs"], {
  stdio: "inherit",
  env: process.env,
});

if (migration.status !== 0) {
  process.exit(migration.status ?? 1);
}

const commands = [
  spawn(process.execPath, ["server.js"], { stdio: "inherit", env: process.env }),
  spawn(process.execPath, ["/realtime/realtime-server.mjs"], { stdio: "inherit", env: process.env }),
];

let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of commands) if (child.exitCode === null) child.kill("SIGTERM");
  process.exitCode = exitCode;
}

for (const child of commands) {
  child.on("error", (error) => {
    console.error(error);
    stop(1);
  });
  child.on("exit", (code, signal) => stop(signal ? 1 : (code ?? 1)));
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
