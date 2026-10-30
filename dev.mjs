#!/usr/bin/env node
/**
 * dev.mjs — build, serve docs/ on localhost, rebuild on changes.
 *
 *   node dev.mjs       (or: npm run dev)
 */

import { spawn } from "node:child_process";
import { createReadStream, watch } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, "docs");
const PORT = Number(process.env.PORT) || 4321;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
};

function build() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["build.mjs"], {
      cwd: ROOT,
      stdio: "inherit",
    });
    child.on("close", resolve);
  });
}

await build();

http
  .createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      let file = path.normalize(path.join(OUT, pathname));

      if (file !== OUT && !file.startsWith(OUT + path.sep)) {
        res.writeHead(403).end("Forbidden");
        return;
      }

      let info = await stat(file).catch(() => null);
      if (info?.isDirectory()) {
        file = path.join(file, "index.html");
        info = await stat(file).catch(() => null);
      }

      if (!info?.isFile()) {
        res.writeHead(404, {
          "content-type": TYPES[".html"],
          "cache-control": "no-store",
        });
        createReadStream(path.join(OUT, "404.html")).pipe(res);
        return;
      }

      res.writeHead(200, {
        "content-type":
          TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream",
        "cache-control": "no-store",
      });
      createReadStream(file).pipe(res);
    } catch {
      res.writeHead(500).end("Something went wrong");
    }
  })
  .listen(PORT, () => {
    console.log(`\n  animate → http://localhost:${PORT}\n`);
  });

let timer;
const rebuild = () => {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    console.log("\nchange detected — rebuilding…\n");
    await build();
  }, 150);
};

for (const dir of [
  "posts",
  "posts/images",
  "src",
  "src/fonts",
  "src/vendor",
]) {
  const target = path.join(ROOT, dir);
  try {
    watch(target, rebuild);
  } catch {
    // A missing optional folder is fine.
  }
}
