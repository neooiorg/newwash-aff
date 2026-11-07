import { spawn, spawnSync } from "node:child_process";

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
