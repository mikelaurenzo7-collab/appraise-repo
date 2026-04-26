import { afterEach, describe, expect, it, vi } from "vitest";

const originalJwtSecret = process.env.JWT_SECRET;
const originalOAuthServerUrl = process.env.OAUTH_SERVER_URL;

afterEach(() => {
  process.env.JWT_SECRET = originalJwtSecret;
  process.env.OAUTH_SERVER_URL = originalOAuthServerUrl;
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("SDKServer session verification", () => {
  it("accepts session payloads without a display name", async () => {
    process.env.JWT_SECRET = "test-secret";
    process.env.OAUTH_SERVER_URL = "https://example.com";

    vi.resetModules();
    vi.spyOn(console, "log").mockImplementation(() => {});

    const { SDKServer } = await import("./_core/sdk");

    const sdk = new SDKServer();
    const token = await sdk.signSession({
      openId: "user-1",
      appId: "app-1",
      name: "",
    });

    await expect(sdk.verifySession(token)).resolves.toEqual({
      openId: "user-1",
      appId: "app-1",
      name: "",
    });
  });
});