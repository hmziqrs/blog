export interface SiteNavItem {
  href: string;
  label: string;
}

export interface SiteConfig {
  name: string;
  siteUrl: string;
  description: string;
  footerDescription: string;
  contactPath: string;
  primaryNav: SiteNavItem[];
  footerNav: SiteNavItem[];
}

export const siteConfig: SiteConfig = {
  name: "hmziq.rs",
  siteUrl: "https://hmziq.rs",
  description: "Writing about software engineering, tools, and ideas.",
  footerDescription: "Writing about software engineering, tools, and systems.",
  contactPath: "/contact",
  primaryNav: [
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ],
  footerNav: [
    { href: "/tags", label: "Tags" },
    { href: "/categories", label: "Categories" },
    { href: "/contact", label: "Contact" },
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
  ],
};

export function pageTitle(value?: string) {
  return value ? `${value} — ${siteConfig.name}` : siteConfig.name;
}
