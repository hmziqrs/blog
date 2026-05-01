const WINDOW_MS = 60 * 60 * 1000;

export async function checkSubscribeRateLimit(
  db: D1Database,
  ip: string,
  email: string,
): Promise<boolean> {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  const ipResult = await db
    .prepare("SELECT COUNT(*) as count FROM rate_limits WHERE ip = ? AND timestamp > ?")
    .bind(ip, cutoff)
    .first<{ count: number }>();
  if ((ipResult?.count ?? 0) >= 2) return false;

  const emailResult = await db
    .prepare("SELECT COUNT(*) as count FROM rate_limits WHERE email = ? AND timestamp > ?")
    .bind(email, cutoff)
    .first<{ count: number }>();
  if ((emailResult?.count ?? 0) >= 2) return false;

  await db.prepare("INSERT INTO rate_limits (ip, timestamp, email) VALUES (?, ?, ?)").bind(ip, now, email).run();
  return true;
}

export async function checkUnsubscribeRateLimit(db: D1Database, ip: string): Promise<boolean> {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  const ipResult = await db
    .prepare("SELECT COUNT(*) as count FROM rate_limits WHERE ip = ? AND timestamp > ?")
    .bind(ip, cutoff)
    .first<{ count: number }>();
  if ((ipResult?.count ?? 0) >= 3) return false;

  await db.prepare("INSERT INTO rate_limits (ip, timestamp, email) VALUES (?, ?, ?)").bind(ip, now, null).run();
  return true;
}
