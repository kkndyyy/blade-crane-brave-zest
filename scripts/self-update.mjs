#!/usr/bin/env node
/**
 * Applies update.zip over this folder when its version is newer.
 * Understands GitHub archive zips (repo-main/...).
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const zipPath = join(root, "update.zip");
const localVersionPath = join(root, "public", "version.json");

function readVersion(text) {
  try {
    const v = JSON.parse(text);
    return typeof v.version === "string" ? v.version : "0";
  } catch {
    return "0";
  }
}

function localVersion() {
  if (!existsSync(localVersionPath)) return "0";
  return readVersion(readFileSync(localVersionPath, "utf8"));
}

function unzipEntries(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let eocd = u8.length - 22;
  while (eocd > 0 && dv.getUint32(eocd, true) !== 0x06054b50) eocd -= 1;
  if (eocd <= 0) throw new Error("not a zip");
  const cdOff = dv.getUint32(eocd + 16, true);
  const cdSize = dv.getUint32(eocd + 12, true);
  const out = {};
  let p = cdOff;
  const end = cdOff + cdSize;
  while (p < end) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const comp = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const localOff = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (!name || name.endsWith("/")) continue;
    const lName = dv.getUint16(localOff + 26, true);
    const lExtra = dv.getUint16(localOff + 28, true);
    const dataStart = localOff + 30 + lName + lExtra;
    const data = u8.subarray(dataStart, dataStart + comp);
    if (method === 0) out[name] = data;
    else if (method === 8) out[name] = inflateRawSync(data);
    else throw new Error(`zip method ${method} not supported (${name})`);
  }
  return out;
}

function stripArchiveRoot(files) {
  const keys = Object.keys(files);
  if (!keys.length) return files;
  const first = keys[0].split("/")[0];
  const allPrefixed = keys.every((k) => k === first || k.startsWith(first + "/"));
  const looksLikeGithub = allPrefixed && /^.+-main$/.test(first);
  if (!looksLikeGithub) return files;
  const next = {};
  for (const [k, v] of Object.entries(files)) {
    const rest = k.slice(first.length + 1);
    if (rest) next[rest] = v;
  }
  return next;
}

if (!existsSync(zipPath)) process.exit(0);

let files;
try {
  files = stripArchiveRoot(unzipEntries(readFileSync(zipPath)));
} catch (err) {
  console.error("[update] cannot read update.zip:", err?.message || err);
  process.exit(1);
}

const remoteText = files["public/version.json"] || files["version.json"];
const remote = remoteText ? readVersion(new TextDecoder().decode(remoteText)) : "0";
const local = localVersion();
if (remote === local && existsSync(join(root, "src", "lib", "store.ts"))) {
  console.log(`[update] already ${local}`);
  process.exit(0);
}

console.log(`[update] ${local} -> ${remote || "update.zip"}`);
const skipPart = new Set([
  "node_modules",
  "dist",
  ".git",
  "screenshots",
  "artifacts",
  "update.zip",
  "hellforge-editor.zip",
  "hellforge-update.zip",
]);
const skipFile = new Set(["update.bat", "run.bat", "update-mirrors.txt"]);
for (const [name, data] of Object.entries(files)) {
  const parts = name.split("/").filter(Boolean);
  if (parts.some((x) => skipPart.has(x))) continue;
  if (skipFile.has(parts[parts.length - 1])) continue;
  const dest = join(root, ...parts);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, data);
}
console.log("[update] done");
