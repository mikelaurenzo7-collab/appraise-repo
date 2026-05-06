import { describe, expect, it, vi } from "vitest";
import { createSafeTrpcFetch } from "../client/src/lib/safeTrpcFetch";

describe("createSafeTrpcFetch", () => {
  it("passes JSON tRPC responses through unchanged", async () => {
    const json = [{ result: { data: { json: { ok: true } } } }];
    const response = new Response(JSON.stringify(json), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
    const fetchMock = vi.fn(async () => response) as unknown as typeof fetch;

    const safeFetch = createSafeTrpcFetch(fetchMock);
    const result = await safeFetch("/api/trpc/auth.me");

    expect(result).toBe(response);
    expect(await result.json()).toEqual(json);
  });

  it("converts serverless plain-text failures into parseable tRPC errors", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response("A server error occurred", {
          status: 500,
          statusText: "Internal Server Error",
          headers: { "content-type": "text/plain" },
        })
    ) as unknown as typeof fetch;

    const safeFetch = createSafeTrpcFetch(fetchMock);
    const result = await safeFetch("/api/trpc/auth.signup");

    expect(result.status).toBe(500);
    expect(result.headers.get("content-type")).toContain("application/json");
    await expect(result.json()).resolves.toMatchObject([
      {
        error: {
          message: "A server error occurred",
          data: { httpStatus: 500 },
        },
      },
    ]);
  });

  it("uses a friendly message for HTML error pages", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response("<html>nope</html>", {
          status: 502,
          headers: { "content-type": "text/html" },
        })
    ) as unknown as typeof fetch;

    const safeFetch = createSafeTrpcFetch(fetchMock);
    const result = await safeFetch("/api/trpc/auth.signin");

    await expect(result.json()).resolves.toMatchObject([
      { error: { message: "A server error occurred. Please try again." } },
    ]);
  });
});
