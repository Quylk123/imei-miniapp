// Deploy CDN bundle lên Supabase Storage.
// Bypass quy trình `zmp deploy` của Zalo: shell-miniapp đã được duyệt 1 lần,
// script này chỉ đẩy bundle mới lên CDN — shell tự fetch khi user mở app.
//
// Run: node scripts/deploy-cdn.mjs
//   env:
//     SUPABASE_URL                - bắt buộc (đọc từ .env)
//     SUPABASE_SERVICE_ROLE_KEY   - bắt buộc (đọc từ .env, KHÔNG commit)
//     CDN_VERSION                 - tuỳ chọn, override version (mặc định YYYY.MM.DD-N)
//     CDN_BUCKET                  - tuỳ chọn, mặc định "mini-app"

import { createClient } from "@supabase/supabase-js";
import { readFileSync, statSync, readdirSync } from "node:fs";
import { join, relative, posix } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// ---------- helpers ----------
function loadEnv(path) {
  try {
    const raw = readFileSync(path, "utf-8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
      if (!m) continue;
      const [, key, rawVal] = m;
      if (process.env[key]) continue;
      let val = rawVal;
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function contentTypeOf(filename) {
  const ext = filename.toLowerCase().split(".").pop();
  switch (ext) {
    case "js":
    case "mjs":
      return "application/javascript; charset=utf-8";
    case "css":
      return "text/css; charset=utf-8";
    case "json":
      return "application/json; charset=utf-8";
    case "html":
      return "text/html; charset=utf-8";
    case "svg":
      return "image/svg+xml";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "woff":
      return "font/woff";
    case "woff2":
      return "font/woff2";
    case "ttf":
      return "font/ttf";
    case "ico":
      return "image/x-icon";
    case "map":
      return "application/json; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

function computeDateVersion(existingVersions) {
  const today = new Date();
  const ymd = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
  let n = 1;
  const prefix = `${ymd}-`;
  for (const v of existingVersions) {
    if (v.startsWith(prefix)) {
      const num = Number(v.slice(prefix.length));
      if (Number.isFinite(num) && num >= n) n = num + 1;
    }
  }
  return `${ymd}-${n}`;
}

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

// ---------- main ----------
const __projectRoot = fileURLToPath(new URL("..", import.meta.url));
loadEnv(join(__projectRoot, ".env"));

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.CDN_BUCKET ?? "mini-app";

if (!SUPABASE_URL) {
  console.error("✗ Thiếu SUPABASE_URL trong .env");
  process.exit(1);
}
if (!SERVICE_KEY) {
  console.error("✗ Thiếu SUPABASE_SERVICE_ROLE_KEY trong .env");
  console.error("  Lấy ở: Supabase Dashboard → Project Settings → API → service_role key");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

console.log(`→ Project: ${SUPABASE_URL}`);
console.log(`→ Bucket:  ${BUCKET}`);

// 1) Verify bucket
const { data: bucketInfo, error: bucketErr } =
  await supabase.storage.getBucket(BUCKET);
if (bucketErr || !bucketInfo) {
  console.error(`✗ Bucket "${BUCKET}" không tồn tại hoặc không truy cập được.`);
  console.error(`  Error: ${bucketErr?.message ?? "unknown"}`);
  console.error(`  Tạo bucket public ở Supabase Dashboard → Storage → New bucket → Public.`);
  process.exit(1);
}
if (!bucketInfo.public) {
  console.error(`✗ Bucket "${BUCKET}" không phải public.`);
  console.error(`  Bootloader fetch không kèm auth — bucket phải public.`);
  console.error(`  Bật ở Dashboard → Storage → ${BUCKET} → Edit bucket → Public.`);
  process.exit(1);
}
console.log(`✓ Bucket public OK`);

// 2) Compute VERSION
let VERSION = process.env.CDN_VERSION;
if (!VERSION) {
  const { data: existing } = await supabase.storage
    .from(BUCKET)
    .list("bundles", { limit: 1000 });
  const names = (existing ?? []).map((e) => e.name);
  VERSION = computeDateVersion(names);
}
console.log(`→ Version: ${VERSION}`);

// 3) Vite build
const CDN_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;
const distDir = join(__projectRoot, "dist-cdn");
console.log(`→ Building (CDN_PREFIX=${CDN_PREFIX})...`);
const build = spawnSync(
  "npx vite build --config vite.config.cdn.mts",
  {
    cwd: __projectRoot,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      CDN_VERSION: VERSION,
      CDN_PREFIX,
    },
  },
);
if (build.status !== 0) {
  console.error("✗ Vite build failed");
  if (build.error) console.error(`  Error: ${build.error.message}`);
  if (build.signal) console.error(`  Signal: ${build.signal}`);
  console.error(`  Status: ${build.status}`);
  process.exit(build.status ?? 1);
}

// 4) Walk + upload
let files;
try {
  files = walk(distDir);
} catch (err) {
  console.error(`✗ Không đọc được ${distDir}: ${err.message}`);
  process.exit(1);
}

// Bỏ manifest.json + .map khỏi upload
const uploadable = files.filter((f) => {
  const rel = relative(distDir, f).replace(/\\/g, "/");
  if (rel.endsWith(".map")) return false;
  if (rel === ".vite/manifest.json") return false;
  return true;
});

console.log(`→ Uploading ${uploadable.length} files to bundles/${VERSION}/ ...`);
let totalBytes = 0;
let uploaded = 0;
for (const file of uploadable) {
  const rel = relative(distDir, file).replace(/\\/g, "/");
  const remote = posix.join("bundles", VERSION, rel);
  const buf = readFileSync(file);
  totalBytes += buf.length;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(remote, buf, {
      contentType: contentTypeOf(rel),
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    if (error.message?.includes("already exists")) {
      console.error(`✗ Conflict: ${remote} đã tồn tại. Version ${VERSION} đã từng deploy?`);
      console.error(`  Đặt CDN_VERSION khác hoặc xoá folder cũ trên dashboard.`);
      process.exit(1);
    }
    console.error(`✗ Upload thất bại ${remote}: ${error.message}`);
    process.exit(1);
  }
  uploaded++;
  process.stdout.write(`\r  ${uploaded}/${uploadable.length}  ${rel}`.padEnd(80));
}
process.stdout.write("\n");

// 5) Upload version.json (no-cache, upsert)
const manifest = {
  version: VERSION,
  deployedAt: new Date().toISOString(),
  appId: process.env.APP_ID ?? null,
};
const manifestBuf = Buffer.from(JSON.stringify(manifest, null, 2), "utf-8");
const { error: manifestErr } = await supabase.storage
  .from(BUCKET)
  .upload("version.json", manifestBuf, {
    contentType: "application/json; charset=utf-8",
    cacheControl: "0",
    upsert: true,
  });
if (manifestErr) {
  console.error(`✗ Upload version.json thất bại: ${manifestErr.message}`);
  process.exit(1);
}

const publicBase = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;
console.log("");
console.log("✓ Deploy thành công");
console.log(`  Version:    ${VERSION}`);
console.log(`  Files:      ${uploaded}`);
console.log(`  Total size: ${fmtBytes(totalBytes)}`);
console.log(`  Manifest:   ${publicBase}/version.json`);
console.log(`  Main:       ${publicBase}/bundles/${VERSION}/main.js`);
console.log("");
console.log("→ Mở Mini App: shell sẽ fetch version.json và load bundle mới.");
