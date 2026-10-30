#!/usr/bin/env node
/**
 * build.mjs
 *
 * Turns posts/*.md into a fully static site in docs/.
 * No frameworks, no runtime markdown, no dependencies to install — the
 * markdown parser (marked, MIT) is vendored in src/vendor.
 *
 *   node build.mjs      (or: npm run build)
 */

import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "./src/vendor/marked.esm.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.join(ROOT, "posts");
const SRC_DIR = path.join(ROOT, "src");
const OUT_DIR = path.join(ROOT, "docs");
const STATIC_DIR = path.join(ROOT, "static");

const SITE = {
  lang: "en",
  name: "animate",
  description: "A small notebook on software, light, and the things in between.",
};

marked.setOptions({ gfm: true, breaks: false });

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const slugify = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";

function frontMatter(source) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(source);
  if (!match) return { meta: {}, body: source };

  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colon = trimmed.indexOf(":");
    if (colon === -1) continue;

    const key = trimmed.slice(0, colon).trim().toLowerCase();
    let value = trimmed.slice(colon + 1).trim();
    const quoted =
      value.length > 1 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")));
    if (quoted) value = value.slice(1, -1);
    meta[key] = value;
  }

  return { meta, body: source.slice(match[0].length) };
}

function parseDate(value) {
  if (!value) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (iso) return new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const readingTime = (text) =>
  Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 220));

const humanize = (filename) => {
  const words = filename.replace(/\.md$/i, "").replace(/[-_]+/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** Give headings stable ids so they can be linked to. */
function addHeadingIds(html) {
  const seen = new Map();

  return html.replace(
    /<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/g,
    (full, level, attrs, inner) => {
      if (/\bid\s*=/.test(attrs)) return full;

      const text = inner.replace(/<[^>]*>/g, "").trim();
      if (!text) return full;

      const base = slugify(text);
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      const id = count === 0 ? base : `${base}-${count + 1}`;

      return `<h${level}${attrs} id="${id}">${inner}</h${level}>`;
    },
  );
}

/** Let posts link to one another by filename: [other](other.md). */
const rewritePostLinks = (html) =>
  html.replace(/href="([^"#?]+)\.md(#[^"]*)?"/g, 'href="$1.html$2"');

function renderMarkdown(body) {
  const html = addHeadingIds(rewritePostLinks(marked.parse(body)));
  // Let wide tables scroll on small screens without breaking the page.
  return html.replace(
    /<table>[\s\S]*?<\/table>/g,
    (table) => `<div class="table-wrap">\n${table}\n</div>`,
  );
}

/* --------------------------------------------------------------------------
   Posts
   -------------------------------------------------------------------------- */

async function readPosts() {
  const entries = await readdir(POSTS_DIR, { withFileTypes: true });
  const posts = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue;

    const raw = await readFile(path.join(POSTS_DIR, entry.name), "utf8");
    const { meta, body } = frontMatter(raw);

    if (/^(true|yes|1)$/i.test(meta.draft ?? "")) continue;

    // A leading "# Title" is treated as the title, not part of the body.
    const h1 = /^\s*#\s+(.+?)\s*#*\s*(?:\r?\n|$)/.exec(body);
    const title = meta.title || (h1 ? h1[1] : humanize(entry.name));
    const markdown = h1 ? body.replace(h1[0], "") : body;

    const html = renderMarkdown(markdown);
    const text = html
      .replace(/<[^>]*>/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    const date = parseDate(meta.date);
    const description =
      meta.description ||
      (text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text);

    posts.push({
      slug: slugify(meta.slug || entry.name.replace(/\.md$/i, "")),
      title,
      date,
      description,
      html,
      minutes: readingTime(text),
    });
  }

  const seen = new Set();
  for (const post of posts) {
    if (seen.has(post.slug)) {
      throw new Error(`Two posts resolve to the same URL: posts/${post.slug}.html`);
    }
    seen.add(post.slug);
  }

  posts.sort((a, b) => {
    const at = a.date?.getTime() ?? -Infinity;
    const bt = b.date?.getTime() ?? -Infinity;
    return bt - at || a.title.localeCompare(b.title);
  });

  return posts;
}

/* --------------------------------------------------------------------------
   Templates
   -------------------------------------------------------------------------- */

const favicon =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>" +
      "<rect width='64' height='64' rx='14' fill='#333'/>" +
      "<circle cx='32' cy='32' r='11' fill='#f1f2f3'/></svg>",
  );

function layout({ title, description, content, rel = "", published }) {
  const pageTitle = title ? `${escapeHtml(title)} — ${SITE.name}` : SITE.name;
  const summary = description || SITE.description;

  return `<!doctype html>
<html lang="${SITE.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${pageTitle}</title>
<meta name="description" content="${escapeHtml(summary)}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#f1f2f3" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#191a1b" media="(prefers-color-scheme: dark)">
<meta property="og:title" content="${escapeHtml(title || SITE.name)}">
<meta property="og:description" content="${escapeHtml(summary)}">
<meta property="og:type" content="${title ? "article" : "website"}">
${published ? `<meta property="article:published_time" content="${published}">\n` : ""}<link rel="icon" href="${favicon}">
<link rel="stylesheet" href="${rel}style.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <a class="wordmark" href="${rel}index.html">${SITE.name}</a>
</header>
${content}
<script src="${rel}app.js" defer></script>
</body>
</html>
`;
}

function metaLine(post) {
  const parts = [];
  if (post.date) {
    parts.push(
      `<time datetime="${post.date.toISOString().slice(0, 10)}">${dateFormat.format(post.date)}</time>`,
    );
  }
  parts.push(`${post.minutes} min`);
  return parts.join('<span class="sep" aria-hidden="true"> · </span>');
}

function indexPage(posts) {
  const items = posts
    .map(
      (post) => `      <li class="post-item">
        <a class="post-link" href="posts/${post.slug}.html">
          <h2 class="post-list-title">${escapeHtml(post.title)}</h2>
          <span class="post-list-meta">${metaLine(post)}</span>
        </a>
      </li>`,
    )
    .join("\n");

  const content = `<main class="page" id="main">
  <div class="col">
    <h1 class="kicker">Writing</h1>
    <ul class="post-list">
${items}
    </ul>
  </div>
</main>`;

  return layout({ content });
}

function postPage(post) {
  const content = `<main class="page" id="main">
  <article class="col">
    <header class="post-head">
      <h1 class="post-title">${escapeHtml(post.title)}</h1>
      <p class="post-meta">${metaLine(post)}</p>
    </header>
    <div class="prose">
${post.html}
    </div>
    <footer class="post-foot">
      <a href="../index.html">← Index</a>
    </footer>
  </article>
</main>`;

  return layout({
    title: post.title,
    description: post.description,
    content,
    rel: "../",
    published: post.date ? post.date.toISOString().slice(0, 10) : undefined,
  });
}

function notFoundPage() {
  const content = `<main class="page" id="main">
  <section class="col notfound">
    <p class="kicker">404</p>
    <h1 class="post-title">This page isn’t here.</h1>
    <p>It may have moved, or it may never have existed.</p>
    <p class="post-foot"><a href="index.html">← Index</a></p>
  </section>
</main>`;

  return layout({
    title: "Not found",
    description: "There is nothing at this address.",
    content,
  });
}

/* --------------------------------------------------------------------------
   File copying
   -------------------------------------------------------------------------- */

async function copyDirectory(from, to, { skipMarkdown = false } = {}) {
  await mkdir(to, { recursive: true });

  for (const entry of await readdir(from, { withFileTypes: true })) {
    if (entry.name === ".DS_Store") continue;
    if (
      skipMarkdown &&
      entry.isFile() &&
      entry.name.toLowerCase().endsWith(".md")
    ) {
      continue;
    }

    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(source, target, { skipMarkdown });
    } else if (entry.isFile()) {
      await copyFile(source, target);
    }
  }
}

/* --------------------------------------------------------------------------
   Build
   -------------------------------------------------------------------------- */

async function build() {
  const posts = await readPosts();

  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(path.join(OUT_DIR, "posts"), { recursive: true });
  await mkdir(path.join(OUT_DIR, "fonts"), { recursive: true });

  // Site assets
  await copyFile(path.join(SRC_DIR, "style.css"), path.join(OUT_DIR, "style.css"));
  await copyFile(path.join(SRC_DIR, "app.js"), path.join(OUT_DIR, "app.js"));
  await copyFile(
    path.join(SRC_DIR, "fonts", "inter-latin-variable.woff2"),
    path.join(OUT_DIR, "fonts", "inter-latin-variable.woff2"),
  );
  await copyFile(
    path.join(SRC_DIR, "fonts", "Inter-LICENSE.txt"),
    path.join(OUT_DIR, "fonts", "Inter-LICENSE.txt"),
  );

  // Images and other files that sit next to the markdown
  await copyDirectory(POSTS_DIR, path.join(OUT_DIR, "posts"), { skipMarkdown: true });

  // Optional extra files (CNAME, robots.txt, ...)
  if (existsSync(STATIC_DIR)) {
    await copyDirectory(STATIC_DIR, OUT_DIR);
  }

  await writeFile(path.join(OUT_DIR, ".nojekyll"), "");
  await writeFile(path.join(OUT_DIR, "index.html"), indexPage(posts));
  await writeFile(path.join(OUT_DIR, "404.html"), notFoundPage());

  for (const post of posts) {
    await writeFile(
      path.join(OUT_DIR, "posts", `${post.slug}.html`),
      postPage(post),
    );
  }

  const label = posts.length === 1 ? "post" : "posts";
  console.log(`built ${posts.length} ${label} → docs/`);
  for (const post of posts) {
    console.log(`  · posts/${post.slug}.html`);
  }
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
