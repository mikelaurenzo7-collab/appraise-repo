import { describe, expect, it } from "vitest";

import {
  decodeManusAuthState,
  encodeManusAuthState,
  sanitizeReturnTo,
} from "../shared/manusAuth";

describe("Manus auth state helpers", () => {
  it("round-trips redirect and return paths", () => {
    const encoded = encodeManusAuthState({
      redirectUri: "https://appraise.example.com/api/oauth/callback",
      returnTo: "/portfolio?tab=appeals#active",
    });

    expect(decodeManusAuthState(encoded)).toEqual({
      redirectUri: "https://appraise.example.com/api/oauth/callback",
      returnTo: "/portfolio?tab=appeals#active",
    });
  });

  it("supports legacy states that only encode the redirect URI", () => {
    const encoded = Buffer.from(
      "https://appraise.example.com/api/oauth/callback",
      "utf-8"
    ).toString("base64");

    expect(decodeManusAuthState(encoded)).toEqual({
      redirectUri: "https://appraise.example.com/api/oauth/callback",
      returnTo: null,
    });
  });

  it("rejects unsafe return paths", () => {
    expect(sanitizeReturnTo("https://evil.example.com")).toBeNull();
    expect(sanitizeReturnTo("//evil.example.com")).toBeNull();
    expect(sanitizeReturnTo("/api/oauth/callback?loop=1")).toBeNull();
    expect(sanitizeReturnTo("/dashboard?tab=active")).toBe(
      "/dashboard?tab=active"
    );
  });
});