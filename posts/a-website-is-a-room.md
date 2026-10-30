---
title: A Website Is a Room
date: 2026-09-02
description: On building a place instead of a product.
---

A website is a room. You can tell a lot about the person who made it by what they leave on the floor.

Most of the modern web is built like an airport: bright, loud, full of signs pointing at things you did not ask for and cannot avoid. Somewhere in the middle of it, I wanted a room with one chair, a window, and a good lamp.

## What it costs

Here is the whole budget for this site:

| Part | Size | What it does |
| --- | ---: | --- |
| Markdown | 2 kB | The words |
| HTML | 4 kB | The words, in a shape |
| CSS | 10 kB | The light |
| JavaScript | 1 kB | Copy buttons, if you want them |
| Typeface | 48 kB | Inter, latin subset |

That is the entire product. No analytics, no cookie banner, no build server, no hydration. The page is a document. It loads once and then it is simply there, the way a room is simply there when you walk into it.

---

## The build

The whole machine is a folder of markdown and a script that turns it into HTML:

```sh
npm run build
# built 4 posts → docs/
```

Then `docs/` goes to GitHub Pages. That is the deploy.

## Rooms hold still

The best thing about a room is that it does not rearrange itself while you are sitting in it. It does not dim the lights to encourage engagement. It has a door, and the door works in both directions.

I think this is what people mean when they call a site *quiet*. Not that it is empty, but that it is finished—that someone made a decision, stopped, and left the result alone.

If you want to see what the room looks like when it is working, read [The Garden](the-garden.md).
