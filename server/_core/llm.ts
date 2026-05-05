/**
 * LLM Bridge — delegates to the dual Anthropic + OpenAI appraisal pipeline.
 *
 * Existing callers keep using invokeLLM while the provider layer chooses the
 * best available route: Claude + OpenAI reviewer when both keys are present,
 * or the configured single provider when only one key exists.
 *
 * The InvokeResult shape mirrors the legacy Manus Forge response so any code
 * destructuring `.choices[0].message.content` keeps working.
 */
import { callDuo } from "./llmProviders";
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
  LLMProvider,
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
  LLMProvider,
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const result = await callDuo(params);

  return {
    id: `${result.provider}-${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    model: result.model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: result.text },
        finish_reason: "stop",
      },
    ],
  };
}
