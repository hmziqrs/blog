import { parseNewsletterIssue } from "./newsletter-utils.ts";

const SITE_URL = process.env.SITE_URL ?? "";
const NEWSLETTER_SEND_SECRET = process.env.NEWSLETTER_SEND_SECRET ?? "";

async function main() {
  const issueSlug = process.argv[2];
  if (!issueSlug) {
    console.error("Usage: bun run newsletter:send <issue-slug>");
    process.exit(1);
  }

  if (!NEWSLETTER_SEND_SECRET) {
    console.error("NEWSLETTER_SEND_SECRET is required");
    process.exit(1);
  }

  if (!SITE_URL) {
    console.error("SITE_URL is required");
    process.exit(1);
  }

  const issue = parseNewsletterIssue(issueSlug);
  if (!issue) {
    console.error(`Newsletter issue "${issueSlug}" not found in content/newsletters/`);
    process.exit(1);
  }

  console.log(`Sending: "${issue.subject}" (${issue.slug})`);

  const response = await fetch(`${SITE_URL}/api/newsletter/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Send-Secret": NEWSLETTER_SEND_SECRET,
    },
    body: JSON.stringify({
      slug: issue.slug,
      subject: issue.subject,
      htmlBody: issue.htmlBody,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Send failed (${response.status}): ${text}`);
    process.exit(1);
  }

  const result = (await response.json()) as { queued?: number; message?: string };
  console.log(result.message ?? `Queued: ${result.queued ?? 0}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
