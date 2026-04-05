export function readingTime(body: string): number {
  const words = body.match(/\S+/g)?.length ?? 0;
  return Math.ceil(words / 200);
}
