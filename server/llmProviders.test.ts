import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  process.env = { ...originalEnv };
});

function mockJsonFetch(payloads: Array<Record<string, unknown>>) {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => payloads.shift() ?? {},
  })) as unknown as typeof fetch;
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock as unknown as ReturnType<typeof vi.fn>;
}

function mockMixedFetch(
  responses: Array<{
    ok: boolean;
    body: Record<string, unknown> | string;
    status?: number;
    statusText?: string;
  }>
) {
  const fetchMock = vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error("unexpected fetch call");
    return {
      ok: next.ok,
      status: next.status ?? (next.ok ? 200 : 500),
      statusText: next.statusText ?? (next.ok ? "OK" : "Error"),
      json: async () => (typeof next.body === "string" ? {} : next.body),
      text: async () =>
        typeof next.body === "string" ? next.body : JSON.stringify(next.body),
    };
  }) as unknown as typeof fetch;
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock as unknown as ReturnType<typeof vi.fn>;
}

describe("llmProviders", () => {
  it("defaults to the duo pipeline when Anthropic and OpenAI keys are configured", async () => {
    process.env.ANTHROPIC_API_KEY = "anthropic-key";
    process.env.OPENAI_API_KEY = "openai-key";
    const fetchMock = mockJsonFetch([
      { content: [{ type: "text", text: "claude draft" }] },
      { output_text: "openai final" },
    ]);

    const { callDuo } = await import("./_core/llmProviders");
    const result = await callDuo({
      messages: [{ role: "user", content: "Review this assessment." }],
      maxTokens: 250,
    });

    expect(result).toEqual({
      text: "openai final",
      model: "claude-sonnet-4-20250514+gpt-5.2",
      provider: "duo",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const openAIBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(openAIBody.input[0].content[0].text).toContain("Claude draft");
    expect(openAIBody.store).toBe(false);
  });

  it("falls back to OpenAI when Anthropic is not configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.OPENAI_API_KEY = "openai-key";
    mockJsonFetch([{ output_text: "openai only" }]);

    const { callDuo } = await import("./_core/llmProviders");
    const result = await callDuo({
      messages: [{ role: "user", content: "Classify this property." }],
    });

    expect(result.provider).toBe("openai");
    expect(result.text).toBe("openai only");
  });

  it("fingerprints cache sources by active provider route and model", async () => {
    process.env.ANTHROPIC_API_KEY = "anthropic-key";
    process.env.OPENAI_API_KEY = "openai-key";
    process.env.OPENAI_MODEL = "gpt-5.2-pro";

    const { llmCacheSource } = await import("./_core/llmProviders");
    expect(llmCacheSource("claude-opus-4-7")).toBe(
      "duo:claude-opus-4-7+gpt-5.2-pro"
    );
  });

  it("keeps the Claude draft if the OpenAI reviewer fails", async () => {
    process.env.ANTHROPIC_API_KEY = "anthropic-key";
    process.env.OPENAI_API_KEY = "openai-key";
    mockMixedFetch([
      {
        ok: true,
        body: { content: [{ type: "text", text: "usable claude draft" }] },
      },
      {
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        body: "rate limited",
      },
    ]);

    const { callDuo } = await import("./_core/llmProviders");
    const result = await callDuo({
      messages: [{ role: "user", content: "Draft the appeal summary." }],
    });

    expect(result).toEqual({
      text: "usable claude draft",
      model: "claude-sonnet-4-20250514",
      provider: "anthropic",
    });
  });

  it("keeps the Claude draft if the OpenAI reviewer returns empty text", async () => {
    process.env.ANTHROPIC_API_KEY = "anthropic-key";
    process.env.OPENAI_API_KEY = "openai-key";
    mockMixedFetch([
      {
        ok: true,
        body: { content: [{ type: "text", text: "non-empty claude draft" }] },
      },
      { ok: true, body: { output_text: "" } },
    ]);

    const { callDuo } = await import("./_core/llmProviders");
    const result = await callDuo({
      messages: [{ role: "user", content: "Draft the appeal summary." }],
    });

    expect(result).toEqual({
      text: "non-empty claude draft",
      model: "claude-sonnet-4-20250514",
      provider: "anthropic",
    });
  });

  it("routes generic vision calls directly to OpenAI when image content is present", async () => {
    process.env.ANTHROPIC_API_KEY = "anthropic-key";
    process.env.OPENAI_API_KEY = "openai-key";
    const fetchMock = mockJsonFetch([{ output_text: "vision finding" }]);

    const { callDuo } = await import("./_core/llmProviders");
    const result = await callDuo({
      messages: [
        { role: "system", content: "Analyze property photos." },
        {
          role: "user",
          content: [
            { type: "text", text: "Find visible defects." },
            {
              type: "image_url",
              image_url: {
                url: "https://example.com/foundation.jpg",
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    expect(result).toEqual({
      text: "vision finding",
      model: "gpt-5.2",
      provider: "openai",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.input[0].content).toEqual([
      { type: "input_text", text: "Find visible defects." },
      {
        type: "input_image",
        image_url: "https://example.com/foundation.jpg",
        detail: "high",
      },
    ]);
  });

  it("sends photo evidence to OpenAI as image inputs", async () => {
    process.env.OPENAI_API_KEY = "openai-key";
    const fetchMock = mockJsonFetch([{ output_text: "photo finding" }]);

    const { callOpenAI } = await import("./_core/llmProviders");
    await callOpenAI({
      provider: "openai",
      messages: [
        { role: "system", content: "Return JSON only." },
        {
          role: "user",
          content: [
            { type: "text", text: "Inspect the roof." },
            {
              type: "image_url",
              image_url: {
                url: "https://example.com/roof.jpg",
                detail: "high",
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "photo_finding",
          strict: false,
          schema: { type: "object", properties: { ok: { type: "boolean" } } },
        },
      },
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.input[0].content).toEqual([
      { type: "input_text", text: "Inspect the roof." },
      {
        type: "input_image",
        image_url: "https://example.com/roof.jpg",
        detail: "high",
      },
    ]);
    expect(body.text).toEqual({
      format: {
        type: "json_schema",
        name: "photo_finding",
        strict: false,
        schema: { type: "object", properties: { ok: { type: "boolean" } } },
      },
    });
  });

  it("strips markdown fences from valid JSON reviewer output", async () => {
    process.env.ANTHROPIC_API_KEY = "anthropic-key";
    process.env.OPENAI_API_KEY = "openai-key";
    mockJsonFetch([
      { content: [{ type: "text", text: '{"score":7}' }] },
      { output_text: '```json\n{"score":8}\n```' },
    ]);

    const { callDuo } = await import("./_core/llmProviders");
    const result = await callDuo({
      messages: [{ role: "user", content: "Return JSON." }],
      response_format: { type: "json_object" },
    });

    expect(result).toEqual({
      text: '{"score":8}',
      model: "claude-sonnet-4-20250514+gpt-5.2",
      provider: "duo",
    });
  });

  it("falls back to Claude JSON when the reviewer breaks a JSON contract", async () => {
    process.env.ANTHROPIC_API_KEY = "anthropic-key";
    process.env.OPENAI_API_KEY = "openai-key";
    mockJsonFetch([
      { content: [{ type: "text", text: '{"score":7}' }] },
      { output_text: "score: eight" },
    ]);

    const { callDuo } = await import("./_core/llmProviders");
    const result = await callDuo({
      messages: [{ role: "user", content: "Return JSON." }],
      response_format: { type: "json_object" },
    });

    expect(result).toEqual({
      text: '{"score":7}',
      model: "claude-sonnet-4-20250514",
      provider: "anthropic",
    });
  });
});
