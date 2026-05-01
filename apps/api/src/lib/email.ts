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
  const domain = raw.slice(atIndex + 1).toLowerCase().trim();

  const normalizedLocal = local.split("+")[0] ?? local;

  return `${normalizedLocal}@${domain}`;
}
