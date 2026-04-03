import { defineSiteConfig, formatPageTitle } from "./packages/site";

export const siteConfig = defineSiteConfig({
  name: "hmziq.rs",
  siteUrl: "https://hmziq.rs",
  basePath: "/",
  footerDescription: "Writing about software engineering, tools, and systems.",
  primaryNav: [
    { page: "about", label: "About" },
    { page: "contact", label: "Contact" },
  ],
  footerNav: [
    { page: "tags", label: "Tags" },
    { page: "categories", label: "Categories" },
    { page: "contact", label: "Contact" },
    { page: "privacy", label: "Privacy" },
    { page: "terms", label: "Terms" },
  ],
  blog: {
    homeTitle: "hmziq.rs",
    homeDescription: "Writing about software engineering, tools, and ideas.",
  },
  pages: {
    about: {
      title: "About",
      description:
        "What hmziq.rs is for, what it pays attention to, and why the writing stays concrete.",
      intro: [
        "I’m a software engineer interested in the parts of software that survive first launch: architecture, tooling, performance, and the decisions that quietly shape a product over time.",
        "hmziq.rs is where I write those decisions down. The point is not to posture about trends. It is to make tradeoffs visible, keep implementation details honest, and document what actually holds up in practice.",
        "Most of the writing sits at the intersection of systems thinking and product craft: clear boundaries, sharp tools, low-friction workflows, and interfaces that feel considered.",
      ],
      focusAreas: [
        {
          title: "Systems",
          body: "Architecture, boundaries, data flow, and delivery decisions that keep products understandable as they grow.",
        },
        {
          title: "Tools",
          body: "Build pipelines, local workflow, automation, and the small utilities that save teams from repeat friction.",
        },
        {
          title: "Craft",
          body: "Interaction details and implementation choices that make software feel deliberate instead of merely functional.",
        },
      ],
      principles: [
        "Concrete implementation over vague advice.",
        "Tradeoffs stated plainly instead of hidden behind abstractions.",
        "Useful tools over fashionable ones.",
        "Taste backed by working software.",
      ],
    },
    contact: {
      title: "Contact",
      description: "A few simple ways to reach me.",
      paragraphs: [
        "If you want the fastest reply, message me on X. I check that more often than email or Telegram.",
        "I’m also available to hire for freelance, contract, and full-time software work.",
      ],
      methods: [
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
          label: "X",
          value: "@hmziqrs",
          href: "https://x.com/hmziqrs",
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
      title: "Privacy",
      description:
        "A concise explanation of what this site collects, what it does not collect, how analytics are used, and how advertising appears on the site.",
      badgeLabel: "Policy",
      effectiveDate: "March 31, 2026",
      intro:
        "This site is a read-only publication. It does not offer account creation, user logins, paid memberships, comment systems, or email newsletters. In normal use, you can browse the site without directly submitting personal profile information.",
      sections: [
        {
          title: "What this site collects",
          body: "The site uses Firebase Analytics to understand overall traffic and general usage patterns. Depending on Google's analytics processing, that may include information such as browser type, device category, approximate location, referring source, page views, and interaction events.",
        },
        {
          title: "What this site does not collect",
          body: "This site is not designed around user accounts or marketing funnels. It does not maintain subscriber databases, authentication records, or profile dashboards for readers.",
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
      title: "Terms",
      description:
        "A straightforward set of conditions for reading, referencing, and using the site.",
      badgeLabel: "Terms Of Use",
      effectiveDate: "March 31, 2026",
      intro:
        "This site publishes writing, notes, and references for general informational purposes. The content is provided in good faith, but it may change over time and is offered without any warranty of completeness, accuracy, availability, or fitness for a particular purpose.",
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
