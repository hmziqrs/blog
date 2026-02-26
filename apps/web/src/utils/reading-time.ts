export function readingTime(body: string): number {
  const words = body.trim().split(/\s+/).length;
  return Math.ceil(words / 200);
}
