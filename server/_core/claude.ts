/**
 * Claude API client — high-value analysis use cases.
 *
 * Sits alongside the legacy `invokeLLM` shim. Each service that uses
 * this module falls back to `invokeLLM` when ANTHROPIC_API_KEY is absent,
 * so the pipeline keeps working without any env changes.
 *
 * What you get over the Forge path:
 *  • Adaptive thinking (Opus 4.7) — multi-step comparable-sales reasoning
 *  • Prompt caching — stable system prompts cached across calls (~90% token cost cut)
 *  • Streaming — long PDF narratives without gateway timeouts
 *  • Message Batches API — portfolio analysis at ~50% cost, async
 *  • Claude vision — superior property defect detection in photos
 *
 * Set ANTHROPIC_API_KEY in your Manus environment variables to enable.
 */

import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "./env";

// ---------------------------------------------------------------------------
// Client lifecycle
// ---------------------------------------------------------------------------

let _client: Anthropic | null = null;

export function getClaudeClient(): Anthropic | null {
  if (!ENV.anthropicApiKey) return null;
  _client ??= new Anthropic({ apiKey: ENV.anthropicApiKey });
  return _client;
}

export function isClaudeAvailable(): boolean {
  return Boolean(ENV.anthropicApiKey);
}

// ---------------------------------------------------------------------------
// Prompt caching helpers
// ---------------------------------------------------------------------------

/** Wrap a stable system prompt so it gets cached on repeated calls. */
export function cachedSystemBlock(text: string): Anthropic.TextBlockParam & { cache_control: { type: "ephemeral" } } {
  return {
    type: "text",
    text,
    cache_control: { type: "ephemeral" },
  };
}

// ---------------------------------------------------------------------------
// analyzeWithClaude — reasoning + prompt caching + streaming
// ---------------------------------------------------------------------------

export type ClaudeAnalysisParams = {
  /** Stable system prompt (will be prompt-cached). */
  systemPrompt: string;
  /** User message content — string or rich content array. */
  userContent: string | Anthropic.MessageParam["content"];
  /** Max output tokens. Default 8192. */
  maxTokens?: number;
  /**
   * Effort level. "xhigh" is the best setting on Opus 4.7 for analytical
   * work like comparable-sales reasoning. "high" is the default API value.
   */
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
};

/**
 * Run analysis with Claude Opus 4.7 + adaptive thinking + prompt caching.
 * Streams internally so long completions don't time out.
 * Returns the final text string.
 *
 * Throws `Error("ANTHROPIC_API_KEY not configured")` if the key is absent
 * — callers should check `isClaudeAvailable()` or catch and fall back.
 */
export async function analyzeWithClaude(params: ClaudeAnalysisParams): Promise<string> {
  const client = getClaudeClient();
  if (!client) throw new Error("ANTHROPIC_API_KEY not configured");

  const { systemPrompt, userContent, maxTokens = 8192, effort = "xhigh" } = params;

  const stream = client.messages.stream({
    model: "claude-opus-4-7",
    max_tokens: maxTokens,
    // Adaptive thinking: Claude decides when and how much to think.
    // budget_tokens is deprecated on Opus 4.7; adaptive is the only on-mode.
    thinking: { type: "adaptive" },
    // Effort inside output_config (GA, no beta header required on Opus 4.7).
    ...({ output_config: { effort } } as object),
    system: [cachedSystemBlock(systemPrompt)],
    messages: [{ role: "user", content: userContent }],
  } as Parameters<typeof client.messages.stream>[0]);

  const finalMsg = await stream.finalMessage();

  const textBlock = finalMsg.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content");
  }
  return textBlock.text;
}

// ---------------------------------------------------------------------------
// analyzePhotoWithClaude — vision + prompt caching
// ---------------------------------------------------------------------------

export type ClaudePhotoParams = {
  systemPrompt: string;
  userInstruction: string;
  /** Must be an https:// URL (SSRF guard enforced in photoAnalyzer). */
  imageUrl: string;
  maxTokens?: number;
};

/**
 * Analyze a single property photo with Claude Opus 4.7 vision.
 * System prompt is prompt-cached across the batch of photos.
 * Returns the raw text (JSON string when caller asks for JSON via the system prompt).
 */
export async function analyzePhotoWithClaude(params: ClaudePhotoParams): Promise<string> {
  const client = getClaudeClient();
  if (!client) throw new Error("ANTHROPIC_API_KEY not configured");

  const { systemPrompt, userInstruction, imageUrl, maxTokens = 1024 } = params;

  const msg = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: maxTokens,
    stream: false,
    system: [cachedSystemBlock(systemPrompt)],
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: userInstruction },
          {
            type: "image",
            source: { type: "url", url: imageUrl },
          },
        ],
      },
    ],
  } as Parameters<typeof client.messages.create>[0]);

  const textBlock = (msg as Anthropic.Message).content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude vision returned no text content");
  }
  return textBlock.text;
}

// ---------------------------------------------------------------------------
// generateNarrativeWithClaude — streaming long-form report narrative
// ---------------------------------------------------------------------------

export type ClaudeNarrativeParams = {
  systemPrompt: string;
  userContent: string;
  /** Default 16384 — large enough for comprehensive appraisal reports. */
  maxTokens?: number;
};

/**
 * Generate a long-form narrative (PDF report sections) with Claude streaming.
 * Uses prompt caching on the USPAP template system prompt.
 * Returns the full narrative text once streaming completes.
 */
export async function generateNarrativeWithClaude(params: ClaudeNarrativeParams): Promise<string> {
  const client = getClaudeClient();
  if (!client) throw new Error("ANTHROPIC_API_KEY not configured");

  const { systemPrompt, userContent, maxTokens = 16_384 } = params;

  const stream = client.messages.stream({
    model: "claude-opus-4-7",
    max_tokens: maxTokens,
    thinking: { type: "adaptive" },
    system: [cachedSystemBlock(systemPrompt)],
    messages: [{ role: "user", content: userContent }],
  } as Parameters<typeof client.messages.stream>[0]);

  const finalMsg = await stream.finalMessage();

  const textBlock = finalMsg.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content for narrative");
  }
  return textBlock.text;
}

// ---------------------------------------------------------------------------
// Message Batches API — portfolio analysis at ~50% cost
// ---------------------------------------------------------------------------

export type ClaudeBatchRequest = {
  /** Unique identifier for this request within the batch. */
  customId: string;
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
};

export type ClaudeBatchResult = {
  customId: string;
  text: string;
  error?: string;
};

/**
 * Submit a batch of analysis requests to the Anthropic Message Batches API.
 * Approximately 50% cheaper than real-time calls; results are async.
 *
 * Returns the batch ID. Poll with `pollClaudeBatch(batchId)`.
 */
export async function submitClaudeBatch(requests: ClaudeBatchRequest[]): Promise<string> {
  const client = getClaudeClient();
  if (!client) throw new Error("ANTHROPIC_API_KEY not configured");

  // The batches API mirrors client.messages.create params per request.
  // We cast to any because the TypeScript types for the Batch API may lag
  // the live API in some SDK patch versions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const batches = (client.messages as any).batches;

  const batch = await batches.create({
    requests: requests.map((req) => ({
      custom_id: req.customId,
      params: {
        model: "claude-opus-4-7",
        max_tokens: req.maxTokens ?? 4096,
        thinking: { type: "adaptive" },
        system: [cachedSystemBlock(req.systemPrompt)],
        messages: [{ role: "user", content: req.userMessage }],
      },
    })),
  });

  return batch.id as string;
}

/**
 * Poll a Message Batch until processing ends, then collect results.
 *
 * @param pollIntervalMs  How often to check (default 5s). Don't go below 2s.
 * @param timeoutMs       Give up after this many ms (default 10 min).
 */
export async function pollClaudeBatch(
  batchId: string,
  options: { pollIntervalMs?: number; timeoutMs?: number } = {}
): Promise<ClaudeBatchResult[]> {
  const client = getClaudeClient();
  if (!client) throw new Error("ANTHROPIC_API_KEY not configured");

  const { pollIntervalMs = 5_000, timeoutMs = 600_000 } = options;
  const deadline = Date.now() + timeoutMs;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const batches = (client.messages as any).batches;

  while (Date.now() < deadline) {
    const batch = await batches.retrieve(batchId);

    if (batch.processing_status === "ended") {
      const results: ClaudeBatchResult[] = [];

      for await (const item of await batches.results(batchId)) {
        if (item.result?.type === "succeeded") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const textBlock = (item.result.message.content as any[]).find(
            (b: { type: string }) => b.type === "text"
          );
          results.push({
            customId: item.custom_id as string,
            text: textBlock ? (textBlock.text as string) : "",
          });
        } else {
          results.push({
            customId: item.custom_id as string,
            text: "",
            error: item.result?.error?.message ?? "batch item failed",
          });
        }
      }

      return results;
    }

    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  throw new Error(`Claude batch ${batchId} did not complete within ${timeoutMs}ms`);
}
