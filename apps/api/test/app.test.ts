import { env, createExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import app from "../src/index";

const ctx = createExecutionContext();

function req(path: string, init?: RequestInit) {
  return new Request(`http://localhost${path}`, init);
}

describe("App-level", () => {
  it("returns 404 for unknown routes", async () => {
    const res = await app.fetch(
      req("/api/nonexistent"),
      env,
      ctx,
    );
    expect(res.status).toBe(404);
    const body = await res.json<{ error: string }>();
    expect(body.error).toBe("Not found");
  });

  it("returns 404 for root path", async () => {
    const res = await app.fetch(
      req("/"),
      env,
      ctx,
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 for non-API paths", async () => {
    const res = await app.fetch(
      req("/some/random/page"),
      env,
      ctx,
    );
    expect(res.status).toBe(404);
  });
});
