Titles

---

Vibe coding my blog in astro as deployed on cloudflare.

Finally rebuilt my blog 3rd time.

----


1) Why?

Framework, Architecture, Deployment, CI/CD flows, Vibe coding, and Goal/Roadmap.


Framework
First of all I wanted my blog to be absolutely minimal by design and codebase.
Using React wasn't an option because of its huge bundle size, and Astro feels close to React.
I didn't want to use Svelte because I wanted to try Cloudflare, and Astro has first-class support for it.

Architecture
I did not want a dedicated admin panel. Managing it is too much useless work and mentally taxing for a simple blog.
Local markdown files made so much sense: managed by Git, editable and previewable in my IDE, and any change auto publishes via GitHub Actions.
There's also under the hood stuff like a private database for managing the newsletter,
KV for rate limiting to prevent abuse, and queues for sending emails.

Deployment
I really wanted to self-host this on my VPS but decided against it because of Cloudflare's email offering for my newsletter.
I mean $0.35 for 1,000 emails is a no-brainer. Yeah, AWS SES is more than 3x cheaper, but the pain of navigating through the AWS console and getting rejected by Lord Bezos is definitely not worth the savings. Cloudflare's console is way simpler to navigate and actually looks nice, and if your domain is managed by Cloudflare, setting up domain security is just one click. I used Cloudflare D1, R2, Workers, Queues, KV, and Pages. They provide a very generous free tier for all of that. So, Cloudflare. Also I personally wanted to use Cloudflare services for once, and this seemed like the right occasion.

CI/CD
Obviously GitHub Actions, since it's free for open source projects. I've set up intelligent triggers for production and staging, covering both article publishing and newsletter sends.

Vibe coding
Is it vibe coded? Yes and no.
No: Everything was planned and fixed by me. Nothing was one-shotted. Things like the layout (every page had a different container width, which made the site look hideous), the light/dark theme toggle (even the inverted images on theme switch), the CI/CD workflow for triggering staging and production deployments, using the right database for rate limiting (KV vs D1: the AI had me use D1, which was fine but not optimal). I basically worked as Senior Lead / Project Manager and used AI as my junior engineer.

AI is very smart and fast at prototyping, automnomous testing and verification, but it gets some obvious things very wrong. My personal goal is to never outsource my thinking: I work through the core decisions myself and use AI to implement them.

AI tools I used: Claude Code (GLM-5.1), Opencode (Kimi-2.6 (when It was 3x :D) and DeepSeek v4 Pro)

Goal/Roadmap
My goal was to make this blog modular and pluggable into other projects, but I semi-pivoted away from that idea as I'm also building (vibe coding) svelete kit based fullstack boilerplate If it succeeds, then this won't be modular and won't extend it into a pluggable project.

My end goal for this project is a dedicated admin panel and getting rid of markdown files, with a proper relational ACID-compliant database, meta fields like tags, categories, and author info, all normalized in the database.

This was my 3rd attempt at building a personal blog. The first was Next.js on GitHub Pages. The second was a full-stack Rust blog in Dioxus, but I burned out on that project and parked it permanently. Finally got this one built.


End Notes
Building also building these projects on side.
vibekit - SvelteKit based fullstack boilerplate for SaaS
torii.tools GPUI based native desktop Request client
mizu.tools GPUI based rich text editor
nutter.tools An arsenal for tools general use tools image conversions, video, audio, JSON and whatnot etc.

