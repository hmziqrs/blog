import type { D1Database } from "@cloudflare/workers-types";

export async function checkSubscribeRateLimit(
  db: D1Database,
  ip: string,
  email: string,
): Promise<boolean> {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  await db.prepare("DELETE FROM rate_limits WHERE timestamp < ?").bind(oneHourAgo).run();

  const ipCount = await db
    .prepare("SELECT COUNT(*) as count FROM rate_limits WHERE ip = ? AND timestamp > ?")
    .bind(ip, oneHourAgo)
    .first<{ count: number }>();

  if ((ipCount?.count ?? 0) >= 2) return false;

  const emailCount = await db
    .prepare("SELECT COUNT(*) as count FROM rate_limits WHERE email = ? AND timestamp > ?")
    .bind(email, oneHourAgo)
    .first<{ count: number }>();

  if ((emailCount?.count ?? 0) >= 2) return false;

  await db
    .prepare("INSERT INTO rate_limits (ip, email, timestamp) VALUES (?, ?, ?)")
    .bind(ip, email, now)
    .run();

  return true;
}

export async function checkUnsubscribeRateLimit(db: D1Database, ip: string): Promise<boolean> {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  await db.prepare("DELETE FROM rate_limits WHERE timestamp < ?").bind(oneHourAgo).run();

  const count = await db
    .prepare("SELECT COUNT(*) as count FROM rate_limits WHERE ip = ? AND timestamp > ?")
    .bind(ip, oneHourAgo)
    .first<{ count: number }>();

  if ((count?.count ?? 0) >= 3) return false;

  await db.prepare("INSERT INTO rate_limits (ip, timestamp) VALUES (?, ?)").bind(ip, now).run();

  return true;
}
