const TOKEN_VERSION = "v1";

function getKeyMaterial(secret: string): string {
  return `${TOKEN_VERSION}:${secret}`;
}

/**
 * Derive a deterministic unsubscribe token from a secret and subscriber ID.
 * Uses HMAC-SHA256 for cryptographically secure derivation.
 */
export async function deriveUnsubscribeToken(
  secret: string,
  subscriberId: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getKeyMaterial(secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(subscriberId));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/[+/=]/g, "")
    .slice(0, 32);
}

/**
 * Compute SHA-256 hash of a token for DB storage/lookup.
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/[+/=]/g, "")
    .slice(0, 32);
}
