import { env, createExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import app from "../src/app";

const ctx = createExecutionContext();

function req(path: string, init?: RequestInit) {
  return new Request(`http://localhost${path}`, init);
}

describe("App-level", () => {
  it("returns 404 for unknown routes", async () => {
    const res = await app.fetch(req("/api/nonexistent"), env, ctx);
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Not found");
  });

  it("returns 404 for root path", async () => {
    const res = await app.fetch(req("/"), env, ctx);
    expect(res.status).toBe(404);
  });

  it("returns 404 for non-API paths", async () => {
    const res = await app.fetch(req("/some/random/page"), env, ctx);
    expect(res.status).toBe(404);
  });

  it("applies CORS headers when ALLOWED_ORIGIN is set", async () => {
    const originalOrigin = env.ALLOWED_ORIGIN;
    env.ALLOWED_ORIGIN = "https://example.com";

    try {
      const res = await app.fetch(
        req("/api/newsletter/subscribe", {
          method: "OPTIONS",
          headers: {
            origin: "https://example.com",
            "access-control-request-method": "POST",
          },
        }),
        env,
        ctx,
      );
      expect(res.status).toBe(204);
      expect(res.headers.get("access-control-allow-origin")).toBe("https://example.com");
      expect(res.headers.get("access-control-allow-methods")).toContain("POST");
    } finally {
      env.ALLOWED_ORIGIN = originalOrigin;
    }
  });

  // L9: X-Content-Type-Options header
  it("sets X-Content-Type-Options: nosniff on API responses", async () => {
    const res = await app.fetch(req("/api/nonexistent"), env, ctx);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("does not apply CORS when ALLOWED_ORIGIN is empty", async () => {
    const originalOrigin = env.ALLOWED_ORIGIN;
    env.ALLOWED_ORIGIN = "";

    try {
      const res = await app.fetch(
        req("/api/newsletter/subscribe", {
          method: "OPTIONS",
          headers: {
            origin: "https://example.com",
            "access-control-request-method": "POST",
          },
        }),
        env,
        ctx,
      );
      expect(res.status).toBe(404);
    } finally {
      env.ALLOWED_ORIGIN = originalOrigin;
    }
  });
});
