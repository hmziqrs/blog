---
title: "Vibe Coding My Blog in Astro, Deployed on Cloudflare"
description: "Third attempt at a blog. Finally got this one built."
date: 2026-05-10
category: "Engineering"
tags: ["astro", "cloudflare", "vibe-coding", "blog", "web-dev"]
draft: true
---

Third attempt at a personal blog. The first was Next.js on GitHub Pages. The second was full-stack Rust in Dioxus. Burned out, parked it permanently. Finally got this one built.

## Why?

Framework, Architecture, Deployment, CI/CD, Vibe coding, Goal/Roadmap.

### Framework

Wanted something minimal. React was out, huge bundle size. Astro feels close enough and has first-class Cloudflare support. Done.

### Architecture

No admin panel. Managing one is useless work for a simple blog. Local markdown files, managed by Git. Edit and preview in my IDE. Any change auto publishes via GitHub Actions.

Newsletter backend runs on a Hono worker. D1 stores subscribers. KV handles rate limiting. Queues send in batches of 100. Dead letter queue catches permanent failures and auto-blacklists. Unsubscribe is a soft-delete. Row stays, status changes. No email enumeration. Turnstile CAPTCHA with a honeypot field. Set up so I never have to babysit it.

### Deployment

Almost self-hosted on my VPS. Cloudflare's email offering changed that. $0.35 per 1,000 emails is a no brainer. AWS SES is 3x cheaper but navigating their console and getting rejected by Lord Bezos isn't worth cheap cost. Cloudflare's console is simple, actually looks nice, and domain security is one click if your domain is already there.

Used D1, R2, Workers, Queues, KV, and Pages. Generous free tier across all of them. Wanted to try Cloudflare for once and this seemed like the right occasion.

Media pipeline: images upload to R2 with content-hash dedup. A script rewrites local paths to CDN URLs. Generates a manifest with dimensions. OG images get proper size automatically. Zero manual URL work.

### CI/CD

Obviously GitHub Actions, because it's free for open source. Staging deploys on every push to master. Production only deploys when content or changelog files change. No wasted builds.

### Vibe Coding

Is it vibe coded? Yes and no.

Everything was planned and fixed by me. Nothing was one shotted. The layout had mismatched container widths on every page. The theme toggle needed inverted images for light and dark. CI/CD had to distinguish staging from prod. Rate limiting belonged on KV, not D1. The AI had me use D1, which worked but wasn't optimal.

I worked as Senior Lead / Project Manager and used AI as my junior engineer.

AI is fast at prototyping and testing. It also gets obvious things very wrong. My rule: never outsource the thinking. I work through the core decisions. AI implements them.

Tools: Claude Code (GLM-5.1), Opencode (Kimi-2.6, when it was 3x :D, and DeepSeek v4 Pro)

### Goal/Roadmap

Originally wanted this blog modular, pluggable into other projects. Semi-pivoted. Also building a SvelteKit fullstack boilerplate. If that succeeds, this stays standalone.

End goal: dedicated admin panel, no more markdown files, proper database migrations. Tags, categories, author info. All normalized.

### End Notes

Side projects in progress.

- [vibekit.link](https://vibekit.link) — SvelteKit based fullstack boilerplate for SaaS
- [torii.tools](https://torii.tools) torii.tools — GPUI based native desktop Request client
- [nutter.tools](https://nutter.tools) — An arsenal of tools: image conversions, video, audio, JSON, and whatnot.
