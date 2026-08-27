#!/usr/bin/env node
/**
 * Windows-safe local server. Spawns Vite by file path so PATH/vite.cmd is not required.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const viteJs = join(root, "node_modules", "vite", "bin", "vite.js");

if (!existsSync(viteJs)) {
  console.error("[local-run] vite missing. Run npm install first.");
  process.exit(1);
}

const sep = process.platform === "win32" ? ";" : ":";
const env = {
  ...process.env,
  PATH: `${join(root, "node_modules", ".bin")}${sep}${process.env.PATH ?? ""}`,
};

const child = spawn(
  process.execPath,
  [viteJs, "--host", "127.0.0.1", "--port", "8080"],
  { stdio: "inherit", env, cwd: root },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code) => process.exit(code ?? 1));
