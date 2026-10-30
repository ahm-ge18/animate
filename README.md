# animate

**Live:** https://ahm-ge18.github.io/animate/

A small, quiet blog. Markdown in, static HTML out. No framework, no build
service, no client-side markdown parser — just a folder of `.md` files, one
stylesheet, and a script that renders everything ahead of time.

Inspired by the reference screenshot: light warm-grey paper (`#f1f2f3`),
near-black ink (`#333`), a narrow column set off from the left edge, a small
bold wordmark, and a lot of air.

## Quick start

Requires Node 18 or newer (only for building — the published site is plain
HTML/CSS/JS).

```sh
npm run build   # posts/*.md → docs/
npm run dev     # build, then serve http://localhost:4321 and rebuild on edits
```

Open `docs/index.html` directly if you like; the site has no server
requirements.

## Writing a post

Drop a markdown file into `posts/`. The filename becomes the URL
(`posts/the-garden.md` → `/posts/the-garden.html`).

```md
---
title: The Garden
date: 2026-10-24
description: A flower learns the shape of its own sky.
---

For three hundred frames, Petal Seven had accepted…
```

Front matter is optional. Supported keys:

| Key | Notes |
| --- | --- |
| `title` | Falls back to a leading `# Heading`, then the filename |
| `date` | `YYYY-MM-DD` (or anything `Date` understands); used for sorting |
| `description` | Used for `<meta name="description">`; otherwise taken from the first paragraph |
| `slug` | Overrides the filename for the URL |
| `draft` | `true` hides the post from the build |

A leading `# Heading` in the body is treated as the title and not repeated
inside the article.

Markdown is rendered with [marked](https://github.com/markedjs/marked) (GFM:
tables, lists, fenced code, etc.). Images and other files placed next to your
markdown (for example `posts/images/photo.jpg`) are copied into the build, and
links to other posts can be written as `[The Garden](the-garden.md)` — the
build rewrites them to `.html`.

## Deploying to GitHub Pages

1. Run `npm run build`.
2. Commit the generated `docs/` folder.
3. In the repository, go to **Settings → Pages** and choose **Deploy from a
   branch → `main` → `/docs`**.

Everything uses relative paths, so it works at a project URL
(`user.github.io/repo/`) or a custom domain. The build writes a `.nojekyll`
file so that GitHub serves the folder as-is. For a custom domain or extra
files such as `robots.txt`, put them in `static/` — they are copied into
`docs/` on every build (so a `CNAME` file survives).

If you would rather not commit build output, add a GitHub Actions workflow
that runs `npm run build` and publishes `docs/`; the output is a plain static
folder either way.

## Making it yours

- **Name and description** live in the `SITE` object at the top of
  `build.mjs`.
- **Colours, column width, offset and type scale** are CSS custom properties
  at the top of `src/style.css` (`--bg`, `--ink`, `--offset`, `--measure`,
  `--gutter`, `--leading`).
- **Posts:** replace the sample files in `posts/` with your own. The
  `posts/images/light-study.svg` file is just demo content.

## Project structure

```
posts/              your markdown (plus any images next to it)
  images/
src/
  style.css         the entire design
  app.js            copy buttons for code blocks (the site works without it)
  fonts/            Inter variable, latin subset, self-hosted
  vendor/           marked + its license (build-time only)
static/             optional extra files copied to the root of the build
build.mjs           markdown → docs/
dev.mjs             local preview server with rebuilds
docs/               build output — this is what gets deployed
```

## Notes

- Responsive: the desktop column keeps the reference's left-of-centre offset;
  on phones it becomes a normal full-width reading column.
- Dark mode is included via `prefers-color-scheme`.
- Reading time is estimated at ~220 words per minute.
- Fonts are self-hosted, so there are no third-party requests at runtime.

## Credits

- [marked](https://github.com/markedjs/marked) — MIT
- [Inter](https://rsms.me/inter/) — SIL Open Font License
