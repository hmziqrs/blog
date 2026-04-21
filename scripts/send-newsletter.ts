import { getLatestPost } from "./newsletter-utils.ts";

const SITE_URL = process.env.SITE_URL ?? "";
const NEWSLETTER_SEND_SECRET = process.env.NEWSLETTER_SEND_SECRET ?? "";

async function main() {
  if (!NEWSLETTER_SEND_SECRET) {
    console.error("NEWSLETTER_SEND_SECRET is required");
    process.exit(1);
  }

  if (!SITE_URL) {
    console.error("SITE_URL is required");
    process.exit(1);
  }

  const post = getLatestPost();
  if (!post) {
    console.error("Could not determine latest post");
    process.exit(1);
  }

  console.log(`Latest post: "${post.title}" (${post.pubDate.toISOString()})`);

  const response = await fetch(`${SITE_URL}/api/newsletter/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Send-Secret": NEWSLETTER_SEND_SECRET,
    },
    body: JSON.stringify({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Trigger failed (${response.status}): ${text}`);
    process.exit(1);
  }

  const result = (await response.json()) as { sent?: number; failed?: number; message?: string };
  console.log(
    result.message ?? `Done. Sent: ${result.sent ?? 0}, Failed: ${result.failed ?? 0}`,
  );

  if ((result.failed ?? 0) > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
