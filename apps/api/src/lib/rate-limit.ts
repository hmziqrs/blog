const WINDOW_MS = 60 * 60 * 1000;
const WINDOW_SECONDS = 60 * 60;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec?: number;
}

async function checkAndRecord(
  kv: KVNamespace,
  key: string,
  limit: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const raw = await kv.get(key);

  let timestamps: number[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) timestamps = parsed;
    } catch {
      // corrupt value — treat as empty so a bad write can't permanently 500
    }
  }

  const pruned = timestamps.filter((t) => now - t < WINDOW_MS);
  if (pruned.length >= limit) {
    const oldest = Math.min(...pruned);
    const retryAfterSec = Math.ceil((oldest + WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }

  pruned.push(now);
  try {
    await kv.put(key, JSON.stringify(pruned), { expirationTtl: WINDOW_SECONDS });
  } catch {
    // KV enforces 1 write/second/key — treat a rejected write as rate-limited
    return { allowed: false, retryAfterSec: 1 };
  }
  return { allowed: true };
}

export async function checkSubscribeRateLimit(
  kv: KVNamespace,
  ip: string,
  email: string,
): Promise<RateLimitResult> {
  const ipResult = await checkAndRecord(kv, `rl:ip:${ip}`, 2);
  if (!ipResult.allowed) return ipResult;

  const emailResult = await checkAndRecord(kv, `rl:email:${email}`, 2);
  if (!emailResult.allowed) return emailResult;

  return { allowed: true };
}

export async function checkUnsubscribeRateLimit(
  kv: KVNamespace,
  ip: string,
): Promise<RateLimitResult> {
  return checkAndRecord(kv, `rl:ip:${ip}`, 3);
}
