// Usage:
//   bun run scripts/newsletter-admin.ts stats
//   bun run scripts/newsletter-admin.ts subscribers
//   bun run scripts/newsletter-admin.ts sends
//   bun run scripts/newsletter-admin.ts status

import { queryD1, listNewsletterIssues, getSentSlugs } from "./newsletter-utils.ts";

async function stats() {
  const [active] = await queryD1<{ count: number }>(
    "SELECT COUNT(*) as count FROM subscribers WHERE status = 'active'",
  );
  const [pending] = await queryD1<{ count: number }>(
    "SELECT COUNT(*) as count FROM subscribers WHERE status = 'pending'",
  );
  const recentSends = await queryD1<{ issue_slug: string; sent_at: string }>(
    "SELECT issue_slug, sent_at FROM newsletter_sent ORDER BY sent_at DESC LIMIT 5",
  );

  console.log(`Active subscribers:  ${active?.count ?? 0}`);
  console.log(`Pending subscribers: ${pending?.count ?? 0}`);
  console.log("\nRecent sends:");
  if (recentSends.length === 0) {
    console.log("  (none)");
  } else {
    for (const s of recentSends) console.log(`  ${s.sent_at}  ${s.issue_slug}`);
  }
}

async function subscribers() {
  const rows = await queryD1<{ email: string; status: string; subscribed_at: string }>(
    "SELECT email, status, subscribed_at FROM subscribers ORDER BY subscribed_at DESC LIMIT 100",
  );
  if (rows.length === 0) {
    console.log("No subscribers.");
    return;
  }
  console.log(`${"email".padEnd(40)} ${"status".padEnd(10)} subscribed_at`);
  console.log("-".repeat(70));
  for (const r of rows) {
    console.log(`${r.email.padEnd(40)} ${r.status.padEnd(10)} ${r.subscribed_at}`);
  }
}

async function sends() {
  const rows = await queryD1<{ issue_slug: string; sent_at: string }>(
    "SELECT issue_slug, sent_at FROM newsletter_sent ORDER BY sent_at DESC LIMIT 20",
  );
  if (rows.length === 0) {
    console.log("No newsletters sent yet.");
    return;
  }
  for (const r of rows) console.log(`${r.sent_at}  ${r.issue_slug}`);
}

async function status() {
  const issues = listNewsletterIssues();
  const sentSlugs = await getSentSlugs();
  const sentSet = new Set(sentSlugs);

  if (issues.length === 0) {
    console.log("No newsletter issues found in content/newsletters/");
    return;
  }

  console.log(`${"slug".padEnd(25)} ${"date".padEnd(12)} ${"title".padEnd(30)} status`);
  console.log("-".repeat(80));

  let sentCount = 0;
  let unsentCount = 0;

  for (const issue of issues) {
    const isSent = sentSet.has(issue.slug);
    if (isSent) sentCount++;
    else unsentCount++;

    const sentLabel = isSent ? "sent" : "unsent";
    const dateStr = issue.date.toISOString().slice(0, 10);
    const title = issue.title.length > 28 ? issue.title.slice(0, 27) + "…" : issue.title;
    console.log(`${issue.slug.padEnd(25)} ${dateStr.padEnd(12)} ${title.padEnd(30)} ${sentLabel}`);
  }

  console.log("-".repeat(80));
  console.log(`Total: ${issues.length}  |  Sent: ${sentCount}  |  Unsent: ${unsentCount}`);
}

async function main() {
  if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN || !process.env.D1_DATABASE_ID) {
    console.error("Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, D1_DATABASE_ID");
    process.exit(1);
  }

  const cmd = process.argv[2] ?? "stats";

  switch (cmd) {
    case "stats":
      await stats();
      break;
    case "subscribers":
      await subscribers();
      break;
    case "sends":
      await sends();
      break;
    case "status":
      await status();
      break;
    default:
      console.error(`Unknown command: ${cmd}. Use: stats | subscribers | sends | status`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
