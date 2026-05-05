/**
 * LLM Providers — Anthropic Claude + OpenAI advocate-review pipeline.
 *
 * Configure ANTHROPIC_API_KEY and/or OPENAI_API_KEY. When both are present,
 * the default `duo` route asks Claude for the first appraisal draft and then
 * asks OpenAI (GPT-5.2 by default) to audit, strengthen, and finalize it as a
 * user-advocating appraiser. If only one key is configured, callers still get a
 * single-provider response instead of a hard outage.
 */
import { ENV } from "./env";

export type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: { url: string; detail?: "auto" | "low" | "high" };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?:
      | "audio/mpeg"
      | "audio/wav"
      | "application/pdf"
      | "audio/mp4"
      | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoice =
  | "none"
  | "auto"
  | "required"
  | { name: string }
  | { type: "function"; function: { name: string } };

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

export type LLMProvider = "anthropic" | "openai" | "duo";

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  /**
   * `duo` (default) runs Claude then OpenAI when both keys are configured.
   * Use `anthropic` or `openai` to force a single provider for a call.
   */
  provider?: LLMProvider;
  model?: string;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export function isAnthropicAvailable(): boolean {
  return Boolean(ENV.anthropicApiKey);
}

export function isOpenAIAvailable(): boolean {
  return Boolean(ENV.openaiApiKey);
}

export function defaultLLMProvider(): LLMProvider {
  if (isAnthropicAvailable() && isOpenAIAvailable()) return "duo";
  if (isOpenAIAvailable()) return "openai";
  return "anthropic";
}

/**
 * Stable provider fingerprint for LLM cache keys. The api_cache table is keyed
 * only by cacheKey, not by the separate source column, so callers must include
 * this value in their key whenever the active model/review route can change.
 */
export function llmCacheSource(
  anthropicModel = "claude-sonnet-4-20250514"
): string {
  if (isAnthropicAvailable() && isOpenAIAvailable()) {
    return `duo:${anthropicModel}+${ENV.openaiModel}`;
  }
  if (isAnthropicAvailable()) return `anthropic:${anthropicModel}`;
  if (isOpenAIAvailable()) return `openai:${ENV.openaiModel}`;
  return "llm-unavailable";
}

// =============================================================================
// Anthropic
// =============================================================================

export async function callAnthropic(
  messages: LLMMessage[],
  model = "claude-sonnet-4-20250514",
  maxTokens = 32768
): Promise<string> {
  const apiKey = ENV.anthropicApiKey;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const systemMsg = messages.find(m => m.role === "system");
  const conversationMsgs = messages.filter(m => m.role !== "system");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemMsg?.content,
      messages: conversationMsgs.map(m => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `Anthropic API error: ${res.status} ${res.statusText} – ${errorText}`
    );
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

// =============================================================================
// OpenAI Responses API
// =============================================================================

type OpenAIContentPart =
  | { type: "input_text"; text: string }
  | {
      type: "input_image";
      image_url: string;
      detail?: "auto" | "low" | "high";
    };

type OpenAIInputMessage = {
  role: "user" | "assistant";
  content: OpenAIContentPart[];
};

function openAIRole(role: Role): "user" | "assistant" {
  return role === "assistant" ? "assistant" : "user";
}

function toOpenAIContent(
  content: MessageContent | MessageContent[]
): OpenAIContentPart[] {
  if (typeof content === "string")
    return [{ type: "input_text", text: content }];

  const parts = Array.isArray(content) ? content : [content];
  return parts.flatMap((part): OpenAIContentPart[] => {
    if (typeof part === "string") return [{ type: "input_text", text: part }];
    if (part.type === "text") return [{ type: "input_text", text: part.text }];
    if (part.type === "image_url") {
      return [
        {
          type: "input_image",
          image_url: part.image_url.url,
          detail: part.image_url.detail,
        },
      ];
    }
    return [
      {
        type: "input_text",
        text: `[Unsupported file input: ${part.file_url.mime_type ?? "unknown"}] ${part.file_url.url}`,
      },
    ];
  });
}

export function extractValidJsonPayload(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const candidates = [trimmed];
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch?.[1]) candidates.push(fenceMatch[1].trim());

  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.push(trimmed.slice(objectStart, objectEnd + 1));
  }

  const arrayStart = trimmed.indexOf("[");
  const arrayEnd = trimmed.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    candidates.push(trimmed.slice(arrayStart, arrayEnd + 1));
  }

  for (const candidate of candidates) {
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      // Try the next likely JSON slice.
    }
  }

  return null;
}

function extractOpenAIText(data: Record<string, unknown>): string {
  if (typeof data.output_text === "string") return data.output_text;

  const output = Array.isArray(data.output) ? data.output : [];
  const chunks: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown }).content)
      ? (item as { content: unknown[] }).content
      : [];
    for (const block of content) {
      if (!block || typeof block !== "object") continue;
      const maybeText = (block as { text?: unknown }).text;
      if (typeof maybeText === "string") chunks.push(maybeText);
    }
  }
  return chunks.join("\n");
}

function textFormatFor(
  params: Pick<
    InvokeParams,
    "outputSchema" | "output_schema" | "responseFormat" | "response_format"
  >
): Record<string, unknown> | undefined {
  const schema = params.outputSchema ?? params.output_schema;
  const responseFormat = params.responseFormat ?? params.response_format;

  if (responseFormat?.type === "json_schema") {
    return {
      format: {
        type: "json_schema",
        name: responseFormat.json_schema.name,
        schema: responseFormat.json_schema.schema,
        strict: responseFormat.json_schema.strict ?? true,
      },
    };
  }

  if (schema) {
    return {
      format: {
        type: "json_schema",
        name: schema.name,
        schema: schema.schema,
        strict: schema.strict ?? true,
      },
    };
  }

  if (responseFormat?.type === "json_object") {
    return { format: { type: "json_object" } };
  }

  return undefined;
}

function resolveOpenAIModel(model?: string): string {
  return model?.startsWith("gpt-") || model?.startsWith("o")
    ? model
    : ENV.openaiModel;
}

export async function callOpenAI(params: InvokeParams): Promise<string> {
  const apiKey = ENV.openaiApiKey;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const systemInstructions = params.messages
    .filter(m => m.role === "system")
    .map(m =>
      typeof m.content === "string" ? m.content : JSON.stringify(m.content)
    )
    .join("\n\n");

  const input: OpenAIInputMessage[] = params.messages
    .filter(m => m.role !== "system")
    .map(m => ({
      role: openAIRole(m.role),
      content: toOpenAIContent(m.content),
    }));

  const tokenLimit = params.maxTokens ?? params.max_tokens ?? 32768;
  const openAIModel = resolveOpenAIModel(params.model);
  const body: Record<string, unknown> = {
    model: openAIModel,
    input,
    instructions: systemInstructions || undefined,
    max_output_tokens: tokenLimit,
    // Property evidence can contain addresses, photos, and tax data. Do not
    // store OpenAI response state unless a caller explicitly adds state later.
    store: false,
  };

  const textFormat = textFormatFor(params);
  if (textFormat) body.text = textFormat;

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `OpenAI API error: ${res.status} ${res.statusText} – ${errorText}`
    );
  }

  const data = await res.json();
  return extractOpenAIText(data);
}

function flattenForReview(messages: Message[]): string {
  return messages
    .map(message => {
      const text = toOpenAIContent(message.content)
        .map(part =>
          part.type === "input_text" ? part.text : `[Image: ${part.image_url}]`
        )
        .join("\n");
      return `${message.role.toUpperCase()}: ${text}`;
    })
    .join("\n\n");
}

function hasImageContent(messages: Message[]): boolean {
  return messages.some(message => {
    const content = message.content;
    const parts = Array.isArray(content) ? content : [content];
    return parts.some(
      part =>
        typeof part === "object" && part !== null && part.type === "image_url"
    );
  });
}

function wantsJson(params: InvokeParams): boolean {
  const responseFormat = params.responseFormat ?? params.response_format;
  return (
    Boolean(params.outputSchema ?? params.output_schema) ||
    responseFormat?.type === "json_schema" ||
    responseFormat?.type === "json_object"
  );
}

export async function callDuo(
  params: InvokeParams
): Promise<{ text: string; model: string; provider: LLMProvider }> {
  const requestedProvider = params.provider ?? defaultLLMProvider();

  if (
    requestedProvider === "openai" ||
    (!isAnthropicAvailable() && isOpenAIAvailable())
  ) {
    const text = await callOpenAI(params);
    return {
      text,
      model: resolveOpenAIModel(params.model),
      provider: "openai",
    };
  }

  if (hasImageContent(params.messages) && isOpenAIAvailable()) {
    const text = await callOpenAI({ ...params, provider: "openai" });
    return {
      text,
      model: resolveOpenAIModel(params.model),
      provider: "openai",
    };
  }

  const flatMessages: LLMMessage[] = params.messages.map((m: Message) => ({
    role: (m.role === "system" || m.role === "user" || m.role === "assistant"
      ? m.role
      : "user") as "system" | "user" | "assistant",
    content: flattenForReview([m]).replace(/^\w+: /, ""),
  }));

  if (requestedProvider === "anthropic" || !isOpenAIAvailable()) {
    const text = await callAnthropic(
      flatMessages,
      params.model,
      params.maxTokens ?? params.max_tokens
    );
    return {
      text,
      model: params.model ?? "claude-sonnet-4-20250514",
      provider: "anthropic",
    };
  }

  const anthropicModel = params.model ?? "claude-sonnet-4-20250514";
  const claudeDraft = await callAnthropic(
    flatMessages,
    params.model,
    params.maxTokens ?? params.max_tokens
  );
  const jsonInstruction = wantsJson(params)
    ? "Return ONLY the final valid JSON. Do not include markdown fences, commentary, or prose outside JSON."
    : "Return only the final answer for the user. Do not mention the review process.";

  try {
    const final = await callOpenAI({
      ...params,
      provider: "openai",
      model: ENV.openaiModel,
      messages: [
        {
          role: "system",
          content:
            "You are the OpenAI half of AppraiseAI's dual-model appraisal team. " +
            "Claude has produced the first draft. Your job is to be the user's rigorous advocate: " +
            "check the draft against the evidence, remove overclaims, strengthen assessor-facing reasoning, " +
            "preserve UPL/USPAP guardrails, and produce the best final response. " +
            jsonInstruction,
        },
        {
          role: "user",
          content:
            `Original request and evidence:\n${flattenForReview(params.messages)}\n\n` +
            `Claude draft:\n${claudeDraft}\n\n` +
            "Finalize the response now.",
        },
      ],
    });

    if (!final.trim()) {
      return {
        text: claudeDraft,
        model: anthropicModel,
        provider: "anthropic",
      };
    }

    if (wantsJson(params)) {
      const finalJson = extractValidJsonPayload(final);
      if (finalJson) {
        return {
          text: finalJson,
          model: `${anthropicModel}+${ENV.openaiModel}`,
          provider: "duo",
        };
      }

      return {
        text: extractValidJsonPayload(claudeDraft) ?? claudeDraft,
        model: anthropicModel,
        provider: "anthropic",
      };
    }

    return {
      text: final,
      model: `${anthropicModel}+${ENV.openaiModel}`,
      provider: "duo",
    };
  } catch {
    return {
      text: claudeDraft,
      model: anthropicModel,
      provider: "anthropic",
    };
  }
}
