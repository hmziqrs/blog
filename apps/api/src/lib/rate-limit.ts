const WINDOW_MS = 60 * 60 * 1000;
const WINDOW_SECONDS = 60 * 60;

async function checkAndRecord(kv: KVNamespace, key: string, limit: number): Promise<boolean> {
  const now = Date.now();
  const raw = await kv.get(key);

  let timestamps: number[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) timestamps = parsed;
    } catch {
      // corrupt / non-JSON value — treat as empty so a single bad write
      // can't permanently 500 the rate limiter
    }
  }

  const pruned = timestamps.filter((t) => now - t < WINDOW_MS);

  if (pruned.length >= limit) {
    return false;
  }

  pruned.push(now);
  await kv.put(key, JSON.stringify(pruned), { expirationTtl: WINDOW_SECONDS });
  return true;
}

export async function checkSubscribeRateLimit(
  kv: KVNamespace,
  ip: string,
  email: string,
): Promise<boolean> {
  const ipOk = await checkAndRecord(kv, `rl:ip:${ip}`, 2);
  if (!ipOk) return false;

  const emailOk = await checkAndRecord(kv, `rl:email:${email}`, 2);
  if (!emailOk) return false;

  return true;
}

export async function checkUnsubscribeRateLimit(kv: KVNamespace, ip: string): Promise<boolean> {
  return checkAndRecord(kv, `rl:ip:${ip}`, 3);
}
