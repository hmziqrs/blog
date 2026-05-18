---
title: "Vibe Coding My Blog in Astro, Deployed on Cloudflare"
description: "Third attempt at a blog. Finally got this one built."
date: 2026-05-10
updated: 2026-05-18
category: "Engineering"
tags: ["astro", "cloudflare", "vibe-coding", "blog", "web-dev"]
cover: "./media/vibe-coding-astro-cloudflare.jpg"
cover_alt: "Ethereal monochrome line art of a person working late at a laptop in a minimalist dark scene"
draft: false
---

Third attempt at a personal blog. The first was Next.js on GitHub Pages. The second was full-stack Rust in Dioxus. Burned out, parked it permanently. Finally got this one built.

> **TL;DR:** Zero-admin blog on Astro + Cloudflare Pages. Hono worker for newsletters with D1, KV, Queues, and an R2 media pipeline. AI handled implementation, I handled architecture. No JS bloat, free tier everything, auto-deploys on content changes.

## Framework

I wanted this to be absolutely minimal. React wasn't an option because of its huge bundle size, and Astro feels close to React. I didn't want to use Svelte because I wanted to try Cloudflare, and Astro has first-class support for it.

## Architecture

No admin panel. Managing one is useless work and mentally taxing for a simple blog at initial stage. Local markdown files, managed by Git. Edit and preview in my IDE. Any change auto publishes via GitHub Actions.

Newsletter backend runs on a Hono worker. D1 stores subscribers. KV handles rate limiting. Queues send in batches of 100. Dead letter queue catches permanent failures and auto-blacklists. Unsubscribe is a soft-delete. Row stays, status changes. No email enumeration. Turnstile CAPTCHA with a honeypot field. Set up so I never have to babysit it.

## Deployment

I really wanted to self-host this on my VPS. Cloudflare's email offering changed that. I mean, $0.35 for 1,000 emails is a no brainer. AWS SES is 3x cheaper, but navigating their console and getting rejected by Lord Bezos isn't worth the cheap cost. Cloudflare's console is simple, actually looks nice, and domain security is one click if your domain is already there.

I used D1, R2, Workers, Queues, KV, and Pages. They have a generous free tier across all of them. I also just wanted to use Cloudflare services for once, and this seemed like the right occasion.

Media pipeline: images upload to R2 with content-hash dedup. A script rewrites local paths to CDN URLs. Generates a manifest with dimensions. OG images get proper size automatically. Zero manual URL work.

## CI/CD

Obviously GitHub Actions, since it's free for open source. Staging deploys on every push to master. Production only deploys when content or changelog files change. No wasted builds.

## Vibe Coding

Is it vibe coded? Yes and no.

Everything was planned and fixed by me. Nothing was one shotted. The layout had mismatched container widths on every page, which made the site look hideous. The theme toggle needed inverted images for light and dark. CI/CD had to distinguish staging from prod. Rate limiting belonged on KV, not D1. The AI had me use D1, which worked but wasn't optimal.

I basically worked as Senior Lead / Project Manager and used AI as my junior engineer.

AI is fast at prototyping and testing, but it gets some obvious things very wrong. My personal goal is to never outsource the thinking. I work through the core decisions myself and use AI to implement them.

AI tools I used: Claude Code (GLM-5.1), Opencode (Kimi-2.6, when it was 3x :D, and DeepSeek v4 Pro)

## Goal/Roadmap

Originally I wanted this blog modular and pluggable into other projects. I semi-pivoted. I'm also building a SvelteKit fullstack boilerplate. If that succeeds, this stays standalone.

My end goal is a dedicated admin panel later on, no more markdown files, proper database migrations. Tags, categories, author info. All normalized.

## End Notes

Also building these projects on side.

- [vibekit.link](https://vibekit.link) — SvelteKit based fullstack boilerplate for SaaS
- [torii.tools](https://torii.tools) torii.tools — GPUI based native desktop Request client
- [nutter.tools](https://nutter.tools) — An arsenal of tools: image conversions, video, audio, JSON, and whatnot.
