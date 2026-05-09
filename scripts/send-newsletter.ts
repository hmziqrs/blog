import { parseNewsletterIssue, listNewsletterIssues, getSentSlugs } from "./newsletter-utils.ts";

const SITE_URL = process.env.SITE_URL ?? "";
const NEWSLETTER_SEND_SECRET = process.env.NEWSLETTER_SEND_SECRET ?? "";
const force = process.argv.includes("--force");

async function sendIssue(issueSlug: string) {
  const issue = parseNewsletterIssue(issueSlug);
  if (!issue) {
    console.error(`Newsletter issue "${issueSlug}" not found in content/newsletters/`);
    process.exit(1);
  }

  console.log(`Sending: "${issue.subject}" (${issue.slug})${force ? " [force]" : ""}`);

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
      force,
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

async function main() {
  if (!NEWSLETTER_SEND_SECRET) {
    console.error("NEWSLETTER_SEND_SECRET is required");
    process.exit(1);
  }
  if (!SITE_URL) {
    console.error("SITE_URL is required");
    process.exit(1);
  }

  const args = process.argv.slice(2).filter((a) => a !== "--force");
  const explicitSlug = args[0] || process.env.ISSUE_SLUG;
  if (explicitSlug) {
    await sendIssue(explicitSlug);
    return;
  }

  console.log("No slug provided, auto-detecting next unsent issue...");

  const issues = listNewsletterIssues();
  if (issues.length === 0) {
    console.log("No newsletter issues found in content/newsletters/");
    process.exit(0);
  }

  if (force) {
    const latest = issues[issues.length - 1];
    console.log(`Force-sending latest issue: "${latest.subject}" (${latest.slug})`);
    await sendIssue(latest.slug);
    return;
  }

  const sentSlugs = await getSentSlugs();
  const sentSet = new Set(sentSlugs);
  const unsent = issues.filter((i) => !sentSet.has(i.slug));

  if (unsent.length === 0) {
    console.log("No unsent issues found.");
    process.exit(0);
  }

  const next = unsent[0];
  console.log(
    `Found unsent issue: "${next.subject}" (${next.slug}) from ${next.date.toISOString().slice(0, 10)}`,
  );
  await sendIssue(next.slug);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
