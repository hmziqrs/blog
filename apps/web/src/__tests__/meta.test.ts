import { describe, expect, test } from "bun:test";
import { extractTwitterHandle } from "../utils/meta";

describe("extractTwitterHandle", () => {
  test("extracts handle from an x.com URL", () => {
    const socials = [{ platform: "x", url: "https://x.com/hmziqrs" }];
    expect(extractTwitterHandle(socials)).toBe("hmziqrs");
  });

  test("extracts handle from a twitter.com URL", () => {
    const socials = [{ platform: "x", url: "https://twitter.com/hmziqrs" }];
    expect(extractTwitterHandle(socials)).toBe("hmziqrs");
  });

  test("handles URL with trailing slash", () => {
    const socials = [{ platform: "x", url: "https://x.com/hmziqrs/" }];
    expect(extractTwitterHandle(socials)).toBe("hmziqrs");
  });

  test("returns undefined when no x social exists", () => {
    const socials = [{ platform: "github", url: "https://github.com/hmziqrs" }];
    expect(extractTwitterHandle(socials)).toBeUndefined();
  });

  test("returns undefined for empty socials array", () => {
    expect(extractTwitterHandle([])).toBeUndefined();
  });

  test("returns undefined for undefined socials", () => {
    expect(extractTwitterHandle(undefined)).toBeUndefined();
  });

  test("returns undefined when url segment is empty", () => {
    const socials = [{ platform: "x", url: "https://x.com/" }];
    expect(extractTwitterHandle(socials)).toBeUndefined();
  });
});
