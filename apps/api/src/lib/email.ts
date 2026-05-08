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

  let local = raw.slice(0, atIndex).toLowerCase().trim();
  let domain = raw
    .slice(atIndex + 1)
    .toLowerCase()
    .trim();

  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.split("+")[0] ?? local;
    local = local.replaceAll(".", "");
  } else {
    local = local.split("+")[0] ?? local;
  }

  return `${local}@${domain}`;
}
