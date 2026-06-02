import { defineSiteConfig, formatPageTitle } from "./packages/site/index.ts";

export const siteConfig = defineSiteConfig({
  name: "Hmziq blog",
  siteUrl: process.env.PUBLIC_SITE_URL ?? "https://blog.hmziq.rs",
  copyrightSiteName: "hmziq.rs",
  copyrightSiteURL: "https://hmziq.rs",
  basePath: "/",
  author: {
    name: "hmziqrs",
    url: "https://hmziq.rs/",
    socials: [
      { platform: "x", url: "https://x.com/hmziqrs" },
      { platform: "github", url: "https://github.com/hmziqrs" },
      { platform: "linkedin", url: "https://www.linkedin.com/in/hmziqrs" },
      { platform: "telegram", url: "https://t.me/hmziqrs" },
      { platform: "reddit", url: "https://www.reddit.com/user/hmziq_rs" },
    ],
  },
  primaryNav: [
    { page: "about", label: "About" },
    { page: "contact", label: "Contact" },
  ],
  footerNav: [
    { page: "tags", label: "Tags" },
    { page: "categories", label: "Categories" },
    { href: "/newsletter", label: "Newsletter" },
    { page: "advertise", label: "Advertise" },
    { page: "contact", label: "Contact" },
    { page: "privacy", label: "Privacy" },
    { page: "terms", label: "Terms" },
    { href: "/changelog", label: "Changelog" },
  ],
  tagDisplayNames: {
    astro: "Astro",
    blog: "Blog",
    cloudflare: "Cloudflare",
    "web-dev": "Web Development",
    typescript: "TypeScript",
    rust: "Rust",
    flutter: "Flutter",
  },
  blog: {
    homeTitle: "Hmziq Blog — Software Engineering, Web Dev & Tools",
    homeDescription:
      "Practical software engineering insights on TypeScript, Rust, Astro, Cloudflare, and modern web development. Learn from real projects, code examples, and engineering deep-dives.",
  },
  advertisement: {
    href: "",
    imageUrl: "",
    alt: "",
    title: "",
    description: "",
  },
  pages: {
    about: {
      title: "About Hmziq — Full-Stack Engineer & Software Writer",
      description:
        "Learn about Hmziq, a full-stack engineer specializing in TypeScript, Rust, and cloud-native web development. Building tools, writing about software, and shipping production apps.",
      paragraphs: [
        "I have been building software for nearly a decade, working across full-stack web development, mobile applications, and cloud infrastructure. My day-to-day revolves around TypeScript, Rust, and modern frontend frameworks — writing production code that ships to real users, not just demos. Over the years I have shipped SaaS products, CLI tools, mobile apps, and everything in between.",
        "This blog is where I write about what I learn along the way. Posts range from hands-on engineering guides and architecture breakdowns to opinionated takes on developer tooling and workflow. The focus is practical: real code, real projects, and lessons that come from things breaking in production rather than polished tutorials that only work in isolation.",
        "The tech stack I write about most includes Astro for static sites and content-driven apps, Cloudflare Workers and D1 for edge computing, Rust for performance-critical tooling, and TypeScript for just about everything else. I also maintain and contribute to open-source projects, and I occasionally write about Flutter for cross-platform mobile work.",
        "If you want to follow along, subscribe to the newsletter or find me on GitHub and X. I share new posts, project updates, and the occasional unfiltered take on software engineering.",
      ],
      focusAreas: [
        {
          title: "Full-Stack Web Development",
          body: "Building production apps with TypeScript, Astro, and modern frameworks",
        },
        {
          title: "Cloud Infrastructure",
          body: "Deploying on Cloudflare Workers, D1, R2, and edge computing",
        },
        {
          title: "Developer Tooling",
          body: "Creating CLI tools and dev utilities in Rust and TypeScript",
        },
        { title: "Open Source", body: "Contributing to and maintaining open-source projects" },
      ],
      principles: [
        {
          title: "Ship Fast, Ship Often",
          body: "Real projects over tutorials. Production experience over theory.",
        },
        {
          title: "Practical Over Perfect",
          body: "Working solutions that solve real problems, not over-engineered abstractions.",
        },
        {
          title: "Learn in Public",
          body: "Sharing the process — mistakes, iterations, and wins alike.",
        },
      ],
    },
    contact: {
      title: "Contact Hmziq — Get in Touch for Collaboration & Projects",
      description:
        "Reach out to Hmziq for software engineering collaboration, open-source projects, technical writing opportunities, or just to chat about web development and developer tooling.",
      paragraphs: [
        "Whether you have a project idea, an open-source collaboration in mind, or a technical writing opportunity, I am always open to hearing from fellow developers and teams. I work across full-stack web development, cloud infrastructure, and developer tooling — so if your project involves shipping real software, chances are we can find common ground.",
        "I typically respond within a day or two, sometimes faster on X. For longer proposals or project briefs, email works best. If you want to see what I am currently working on, check my GitHub — it is usually the most up-to-date reflection of what I am building.",
        "I am currently available for freelance and contract work, open-source collaborations, and technical writing or content partnerships. If any of that sounds like a fit, reach out through any of the channels below.",
      ],
      methods: [
        {
          label: "X",
          value: "@hmziqrs",
          href: "https://x.com/hmziqrs",
        },
        {
          label: "Email",
          value: "hmziqrs@gmail.com",
          href: "mailto:hmziqrs@gmail.com",
        },
        {
          label: "Telegram",
          value: "@hmziqrs",
          href: "https://t.me/hmziqrs",
        },
        {
          label: "GitHub",
          value: "hmziqrs",
          href: "https://github.com/hmziqrs",
        },
        {
          label: "LinkedIn",
          value: "hmziqrs",
          href: "https://www.linkedin.com/in/hmziqrs",
        },
      ],
    },
    privacy: {
      title: "Privacy Policy — How Hmziq Blog Handles Your Data",
      description:
        "Comprehensive privacy policy for Hmziq Blog covering data collection, analytics, newsletter subscriber info, cookies, and how your personal information is protected.",
      badgeLabel: "Policy",
      effectiveDate: "April 19, 2026",
      preamble: [
        "This site is a read-only publication. It does not offer account creation, user logins, paid memberships, or comment systems. It does offer an optional email newsletter for readers who choose to subscribe. In normal use, you can browse the site without directly submitting personal profile information.",
      ],
      sections: [
        {
          title: "What this site collects",
          body: "The site uses Firebase Analytics to understand overall traffic and general usage patterns. Depending on Google's analytics processing, that may include information such as browser type, device category, approximate location, referring source, page views, and interaction events. If you subscribe to the newsletter, the site collects your email address for the purpose of sending newsletter updates.",
        },
        {
          title: "What this site does not collect",
          body: "This site is not designed around user accounts or marketing funnels. It does not maintain authentication records or profile dashboards for readers. Newsletter subscriber email addresses are stored solely for sending newsletter updates and can be removed at any time via the unsubscribe link.",
        },
        {
          title: "Advertising",
          body: "This site may display static advertising or sponsorship placements alongside content. Those placements are part of the page presentation and are not currently described here as behaviorally targeted advertising based on reader profiles.",
        },
        {
          title: "How analytics data is used",
          body: "Analytics information is used to understand how the site is read and to improve content, performance, and navigation. It is not used to build advertising profiles or to sell access to reader data.",
        },
        {
          title: "Email newsletters",
          body: "The site offers an optional newsletter that sends notifications when new blog posts are published. Subscriptions require a single opt-in with CAPTCHA verification. You can unsubscribe at any time using the link provided in each email. Newsletter emails are sent via Cloudflare Email Sending. Your email address is stored securely and is never shared with third parties.",
        },
        {
          title: "Third-party processing",
          body: "Firebase Analytics is operated by Google, and its processing is subject to Google's own terms and privacy documentation. Normal hosting, caching, and delivery infrastructure may also process technical request data as part of serving the site. If the site later adopts a third-party advertising network or ad-serving platform, this page may be updated to reflect that change.",
        },
        {
          title: "Contact",
          body: "If you have a privacy-related question about this site, use the details listed on the contact page. Material changes to this page may be reflected here by updating the effective date.",
        },
      ],
    },
    terms: {
      title: "Terms of Use — Hmziq Blog Usage Guidelines & Policies",
      description:
        "Terms and conditions for using Hmziq Blog. Understand your rights and responsibilities when accessing our content, newsletter, and developer resources.",
      badgeLabel: "Terms Of Use",
      effectiveDate: "March 31, 2026",
      preamble: [
        "This site publishes writing, notes, and references for general informational purposes. The content is provided in good faith, but it may change over time and is offered without any warranty of completeness, accuracy, availability, or fitness for a particular purpose.",
      ],
      sections: [
        {
          title: "Permitted use",
          body: "You may read the site, reference it, and share links to its pages. Reasonable quotation with proper attribution is generally acceptable. If a specific post or asset includes a separate license, that license controls its use.",
        },
        {
          title: "Content ownership",
          body: "Unless otherwise stated, original writing and site materials remain the property of the site owner. Reuse beyond normal quotation, citation, or linking should be done with permission.",
        },
        {
          title: "External links",
          body: "The site may link to third-party websites, tools, or references. Those resources are not controlled by this site and are governed by their own terms, policies, and availability.",
        },
        {
          title: "Advertising and sponsorships",
          body: "The site may include static advertisements, sponsorship placements, or promotional mentions. Unless stated otherwise, those placements do not change the ownership of the site content or the reader's responsibility to evaluate products, services, or external offers independently.",
        },
        {
          title: "Acceptable conduct",
          body: "You agree not to misuse the site, attempt unauthorized access, interfere with its infrastructure, or use the site in a way that could disrupt service for others.",
        },
        {
          title: "Liability",
          body: 'To the fullest extent permitted by applicable law, this site is provided on an "as is" basis. The site owner is not liable for losses, interruptions, or decisions made in reliance on the content published here.',
        },
      ],
    },
  },
});

export const routes = siteConfig.routes;

export function pageTitle(value?: string) {
  return formatPageTitle(siteConfig.name, value);
}
