// Usage:
//   bun run scripts/newsletter-admin.ts stats
//   bun run scripts/newsletter-admin.ts subscribers
//   bun run scripts/newsletter-admin.ts sends

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN ?? "";
const D1_DATABASE_ID = process.env.D1_DATABASE_ID ?? "";

async function queryD1<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
    },
  );

  if (!response.ok) throw new Error(`D1 query failed: ${response.statusText}`);

  const data = await response.json<{
    success: boolean;
    errors: Array<{ message: string }>;
    result: Array<{ results: T[] }>;
  }>();
  if (!data.success) throw new Error(`D1 error: ${data.errors[0].message}`);

  return data.result[0].results;
}

async function stats() {
  const [active] = await queryD1<{ count: number }>(
    "SELECT COUNT(*) as count FROM subscribers WHERE status = 'active'",
  );
  const [pending] = await queryD1<{ count: number }>(
    "SELECT COUNT(*) as count FROM subscribers WHERE status = 'pending'",
  );
  const recentSends = await queryD1<{ post_slug: string; sent_at: string }>(
    "SELECT post_slug, sent_at FROM newsletter_sent ORDER BY sent_at DESC LIMIT 5",
  );

  console.log(`Active subscribers:  ${active?.count ?? 0}`);
  console.log(`Pending subscribers: ${pending?.count ?? 0}`);
  console.log("\nRecent sends:");
  if (recentSends.length === 0) {
    console.log("  (none)");
  } else {
    for (const s of recentSends) console.log(`  ${s.sent_at}  ${s.post_slug}`);
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
  const rows = await queryD1<{ post_slug: string; sent_at: string }>(
    "SELECT post_slug, sent_at FROM newsletter_sent ORDER BY sent_at DESC LIMIT 20",
  );
  if (rows.length === 0) {
    console.log("No newsletters sent yet.");
    return;
  }
  for (const r of rows) console.log(`${r.sent_at}  ${r.post_slug}`);
}

async function main() {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN || !D1_DATABASE_ID) {
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
    default:
      console.error(`Unknown command: ${cmd}. Use: stats | subscribers | sends`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
