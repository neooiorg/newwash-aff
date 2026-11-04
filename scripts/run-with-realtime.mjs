import { spawn } from "node:child_process";

const mode = process.argv[2] === "start" ? "start" : "dev";
const port = process.env.PORT || "3001";
const nextArgs = ["node_modules/next/dist/bin/next", mode, "--hostname", "127.0.0.1", "--port", port];
const commands = [
  spawn(process.execPath, nextArgs, { stdio: "inherit", env: process.env }),
  spawn(process.execPath, ["scripts/realtime-server.mjs"], { stdio: "inherit", env: process.env }),
];

let stopping = false;
function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of commands) if (child.exitCode === null) child.kill();
  process.exitCode = exitCode;
}
for (const child of commands) {
  child.on("error", (error) => {
    console.error(error);
    stop(1);
  });
  child.on("exit", (code) => stop(code ?? 1));
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
