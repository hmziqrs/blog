export interface MarkdownHeading {
  depth: number;
  slug: string;
  text: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

export function extractHeadings(markdown: string): MarkdownHeading[] {
  const headings: MarkdownHeading[] = [];
  const lines = markdown.split("\n");

  for (const line of lines) {
    const match = /^(#{2,3})\s+(.+)$/.exec(line.trim());
    if (!match) continue;

    const depth = match[1].length;
    const text = match[2].replace(/\s+#+\s*$/, "").trim();
    headings.push({ depth, slug: slugify(text), text });
  }

  return headings;
}
