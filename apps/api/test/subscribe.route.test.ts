import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import app from "../src/index";

describe("POST /api/newsletter/subscribe", () => {
  it("rejects requests without a Turnstile token", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", token: "" }),
      }),
      env,
    );
    expect(res.status).toBe(400);
  });
});
