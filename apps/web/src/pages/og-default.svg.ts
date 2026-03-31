import type { APIRoute } from "astro";
import { siteConfig } from "../config/site";

const width = 1200;
const height = 630;

export const GET: APIRoute = () => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
      <rect width="${width}" height="${height}" fill="#111827" />
      <rect x="48" y="48" width="${width - 96}" height="${height - 96}" rx="32" fill="#172033" stroke="#334155" />
      <text x="96" y="244" fill="#7dd3fc" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace" font-size="28" letter-spacing="8">BLOG</text>
      <text x="96" y="336" fill="#f8fafc" font-family="Georgia, Times New Roman, serif" font-size="76">${siteConfig.name}</text>
      <text x="96" y="408" fill="#94a3b8" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace" font-size="24">software engineering / tools / systems</text>
    </svg>
  `.trim();

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
