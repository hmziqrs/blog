Titles

---

Vibe coding my blog in astro as deployed on cloudflare.

Finally rebuilt my blog 3rd time.

----


1) Why?

Framework, Architechture, Deployment, CI/CD flows, Vibe coding, and Goal/Roadmap.


Framework
First of all I wanted my blog to be absolute minimal by design and codebase.
Using React wasn't an option becuase of huge bundle size and astro is a close to react like.
I didn't want to use svelte becuase I wanted to try cloudflare and astro has first class support for it.

Architecture
I did not want an published/deployed admin panel as managing it is too much and useless work and very mentally taxing for a simple blog.
So local markdown files made so much sense. as it can be managed by GIT, I can edit and preview them in my IDE, and any change on them will auto publish/udpate them VIA github actions.
Also there's under the hood stuff like private database database for managing newsletter,
KV for rate limitting to prevent abuse. and queues for sending emails.

Deployment
I really wanted to self host this on my VPS but decided against it due to cloudflare emails for my newsletter.
I mean $0.35 for 1,000 emails is not brainer I meant yeah AWS SES more than 3 times cheaper but the pain of navigating thorugh AWS console, and keep getting rejected by lord bezos is definilty not worth the cheap cost. Cloudflare console is way simple to navigate and actually looks nice and if your domain is managed by cloudflare than setting up domain security is just one click. and I used cloudflare D1, R2, workers, qeueue, KV, and pages and they provide a very generous tier for all that. So hence cloudflare. Also I personally wanted to use cloudflare services for once. and this seems like an appropriate occasion.

CI/CD
Obviosuly Github Actions as it's free for open source projects and I've put itelligent triggers for my production, and staging for both article publishing and sending newsletter.

Vibe coding
Is it vibe coded? Yes and no.
No: Everything was planned and fixed by me nothing was one-shotted. like the layout (everypage had different container width which made the site look hidious), theme light mode and dark mode even the inverted images on theme toggle, CI/CD workflow for triggering stage and prod environment deployments. using appropriate database for rate limiting like KV (AI had me used D1 which fine but not the best). So I basically worked as Senior lead/Project manager and used AI my junior engineer.

AI is very smart and fast to prototype and testing stuff but it get's some obvious stuff very wrong. Personally my goal with is to never outsource my thinking I think of the core stuff and use AI to implement it.

Ai Tools I used: claude-code (GLM-5.1), opencode (kimi-2.6 and Deepseek v4 pro)

Goal/Roadmap
My goal was to have this blog very modular and pluggable into existing project but I pivioted from that idea. This will be a standalone blog project I probably won't be extending this into plugable project.
My endgoal would be to have a dedicated admin and get get rid of markdown files.
and create proper relational ACID complaint DB. and have meta fields like tags, categories abd author information and all that stuff normalized in database.

Also this was my 3rd try to build a personal blog my first one was built on nextJS and github pages. 2 one was fullstack rust in Dioxus but I got burned out in that project so decided to park it permanentaly. Finally had this one built.
