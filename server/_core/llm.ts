/**
 * LLM Bridge — delegates to Anthropic Claude.
 *
 * Kept as a thin shim so existing callers (routers.ts, services/*.ts)
 * don't need to change their import paths. The actual API call is made
 * by callAnthropic from "./llmProviders".
 *
 * The InvokeResult shape mirrors the legacy Manus Forge response so any
 * code destructuring `.choices[0].message.content` keeps working.
 *
 * Gemini support has been removed; the `provider` field on InvokeParams
 * is retained for type compatibility but is ignored.
 */
import { callAnthropic } from "./llmProviders";
import type {
  LLMMessage,
  Message,
  MessageContent,
  TextContent,
  ImageContent,
  FileContent,
  Role,
  Tool,
  ToolChoice,
  ToolCall,
  JsonSchema,
  OutputSchema,
  ResponseFormat,
  InvokeParams,
  InvokeResult,
} from "./llmProviders";

export type {
  LLMMessage,
  Message,
  MessageContent,
  TextContent,
  ImageContent,
  FileContent,
  Role,
  Tool,
  ToolChoice,
  ToolCall,
  JsonSchema,
  OutputSchema,
  ResponseFormat,
  InvokeParams,
  InvokeResult,
};

function flattenContent(content: MessageContent | MessageContent[]): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((p) => (typeof p === "string" ? p : p.type === "text" ? p.text : ""))
      .join("");
  }
  if (typeof content === "object" && content && (content as TextContent).type === "text") {
    return (content as TextContent).text;
  }
  return "";
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const { messages, maxTokens, max_tokens, model } = params;
  const tokenLimit = maxTokens ?? max_tokens ?? 32768;

  const flatMessages: LLMMessage[] = messages.map((m: Message) => ({
    role: (m.role === "system" || m.role === "user" || m.role === "assistant"
      ? m.role
      : "user") as "system" | "user" | "assistant",
    content: flattenContent(m.content),
  }));

  const text = await callAnthropic(flatMessages, model, tokenLimit);

  return {
    id: `bridge-${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    model: model ?? "claude-sonnet-4-20250514",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: text },
        finish_reason: "stop",
      },
    ],
  };
}
