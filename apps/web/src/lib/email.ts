const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHTML(raw: string): string {
  return raw.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch);
}

export function normalizeEmail(raw: string): string {
  const atIndex = raw.lastIndexOf("@");
  if (atIndex === -1) return raw.toLowerCase().trim();

  const local = raw.slice(0, atIndex).toLowerCase().trim();
  const domain = raw
    .slice(atIndex + 1)
    .toLowerCase()
    .trim();

  const canonicalDomain = GMAIL_DOMAINS.has(domain) ? "gmail.com" : domain;

  // Strip plus-addressing for all providers
  let normalizedLocal = local.split("+")[0] ?? local;

  if (GMAIL_DOMAINS.has(domain)) {
    normalizedLocal = normalizedLocal.replaceAll(".", "");
  }

  return `${normalizedLocal}@${canonicalDomain}`;
}
