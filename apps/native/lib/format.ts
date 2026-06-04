export function formatDate(
  dateStr: string,
  style: "short" | "long" = "short",
): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: style === "long" ? "long" : "short",
    day: "numeric",
  });
}

export function estimateReadingTime(text: string): number {
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}
