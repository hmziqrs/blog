import type { SiteAuthorSocial } from "@blog/site";

export function extractTwitterHandle(socials?: SiteAuthorSocial[]): string | undefined {
  const xSocial = socials?.find((s) => s.platform.toLowerCase() === "x");
  if (!xSocial) return undefined;

  const segments = xSocial.url.replace(/\/+$/, "").split("/");
  const last = segments.pop();
  if (!last || last.includes(".")) return undefined;

  return last.replace("@", "") || undefined;
}
