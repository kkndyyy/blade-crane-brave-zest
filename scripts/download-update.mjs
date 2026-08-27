#!/usr/bin/env node
/**
 * Downloads the latest hellforge update.zip from mirrors listed in update-mirrors.txt
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import https from "node:https";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dest = join(root, "update.zip");
const listFile = join(root, "update-mirrors.txt");

const FALLBACK = [
  "https://github.com/kkndyyy/blade-crane-brave-zest/archive/refs/heads/main.zip",
];

function mirrors() {
  const out = [];
  if (existsSync(listFile)) {
    for (const line of readFileSync(listFile, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (t && !t.startsWith("#")) out.push(t);
    }
  }
  for (const u of FALLBACK) if (!out.includes(u)) out.push(u);
  return out;
}

function fetchBuffer(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 8) return reject(new Error("too many redirects"));
    const lib = url.startsWith("https:") ? https : http;
    const req = lib.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 HellforgeUpdater/1.4.6",
          Accept: "*/*",
        },
      },
      (res) => {
        const code = res.statusCode ?? 0;
        if (code >= 300 && code < 400 && res.headers.location) {
          const next = new URL(res.headers.location, url).href;
          res.resume();
          resolve(fetchBuffer(next, redirects + 1));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          resolve({ status: code, buf: Buffer.concat(chunks) });
        });
      },
    );
    req.on("error", reject);
    req.setTimeout(120000, () => {
      req.destroy(new Error("timeout"));
    });
  });
}

function isZip(buf) {
  return buf.length > 64 && buf[0] === 0x50 && buf[1] === 0x4b;
}

const urls = mirrors();
let lastErr = "no mirrors";
for (const url of urls) {
  console.log("[download]", url);
  try {
    const { status, buf } = await fetchBuffer(url);
    if (status >= 400) {
      lastErr = `HTTP ${status}`;
      console.log("  ", lastErr);
      continue;
    }
    if (!isZip(buf)) {
      lastErr = "not a zip (" + buf.length + " bytes)";
      console.log("  ", lastErr);
      continue;
    }
    writeFileSync(dest, buf);
    console.log("[download] saved update.zip", buf.length, "bytes");
    process.exit(0);
  } catch (err) {
    lastErr = err?.message || String(err);
    console.log("  ", lastErr);
  }
}

if (existsSync(dest)) {
  console.log("[download] keeping existing update.zip");
  process.exit(0);
}

console.error("[download] failed:", lastErr);
process.exit(1);
