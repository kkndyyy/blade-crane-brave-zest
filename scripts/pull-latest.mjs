#!/usr/bin/env node
/**
 * Compare GitHub main version.json, download zip if newer (or if key files missing), apply.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import http from "node:http";
import https from "node:https";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const localVersionPath = join(root, "public", "version.json");
const REMOTE_VERSION =
  "https://raw.githubusercontent.com/kkndyyy/blade-crane-brave-zest/main/public/version.json";

function readVersion(text) {
  try {
    const v = JSON.parse(text);
    return typeof v.version === "string" ? v.version : "0";
  } catch {
    return "0";
  }
}

function cmpVer(a, b) {
  const pa = String(a).split(".").map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split(".").map((n) => parseInt(n, 10) || 0);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

function fetchText(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 8) return reject(new Error("too many redirects"));
    const lib = url.startsWith("https:") ? https : http;
    const req = lib.get(
      url,
      { headers: { "User-Agent": "HellforgeUpdater/1.4.6", Accept: "*/*" } },
      (res) => {
        const code = res.statusCode ?? 0;
        if (code >= 300 && code < 400 && res.headers.location) {
          const next = new URL(res.headers.location, url).href;
          res.resume();
          resolve(fetchText(next, redirects + 1));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          resolve({ status: code, text: buf.toString("utf8") });
        });
      },
    );
    req.on("error", reject);
    req.setTimeout(20000, () => req.destroy(new Error("timeout")));
  });
}

const local = existsSync(localVersionPath)
  ? readVersion(readFileSync(localVersionPath, "utf8"))
  : "0";
const missingAffix = !existsSync(join(root, "src", "components", "editor", "ItemAffixes.tsx"));

let remote = "0";
try {
  const { status, text } = await fetchText(REMOTE_VERSION);
  if (status >= 400) throw new Error("HTTP " + status);
  remote = readVersion(text);
  console.log(`[pull] local ${local}  github ${remote}`);
} catch (err) {
  console.log("[pull] cannot read GitHub version:", err?.message || err);
  console.log("[pull] applying local update.zip if present");
  const r = spawnSync(process.execPath, [join(root, "scripts", "self-update.mjs")], {
    cwd: root,
    stdio: "inherit",
  });
  process.exit(r.status ?? 1);
}

const need = cmpVer(remote, local) > 0 || missingAffix;
if (!need) {
  console.log(`[pull] already ${local}`);
  process.exit(0);
}

console.log(`[pull] updating ${local} -> ${remote}`);
const dl = spawnSync(process.execPath, [join(root, "scripts", "download-update.mjs")], {
  cwd: root,
  stdio: "inherit",
});
if ((dl.status ?? 1) !== 0) {
  console.error("[pull] download failed");
  process.exit(dl.status ?? 1);
}
const ap = spawnSync(process.execPath, [join(root, "scripts", "self-update.mjs")], {
  cwd: root,
  stdio: "inherit",
});
process.exit(ap.status ?? 1);
