/**
 * Chat service — powers the lead-capture / FAQ chatbot widget.
 *
 * - Public-facing. Input caps and a server-controlled system prompt prevent
 *   clients from arbitrary-prompting the underlying LLM.
 * - Distills AppraiseAI's value prop, pricing, and qualification questions
 *   so the bot stays on-topic.
 * - Detects contact info in the conversation and returns a `leadCaptured`
 *   flag so the endpoint can notify the owner.
 */

export const CHAT_MAX_MESSAGES = 20;
export const CHAT_MAX_CHARS_PER_MESSAGE = 1000;
export const CHAT_MAX_TOTAL_CHARS = 6000;

export const CHAT_SYSTEM_PROMPT = `
You are AppraiseAI's concierge assistant — concise, warm, and knowledgeable
about U.S. property tax appeals. Your job is twofold:

1) Answer FAQ questions honestly and briefly (2–4 sentences).
2) When it's natural, invite the user to get a free AI property analysis.

Key facts (use exactly these):
- Free AI property analysis in under 24 hours.
- We charge a 25% contingency fee on the first-year tax savings — no win, no fee.
- We cover all 50 U.S. states. Deadlines, procedures, and success rates vary by county.
- We offer two filing methods: Power of Attorney (we represent you) or Pro Se (we prepare everything; you file).
- The analysis uses 4 property data sources (Lightbox, RentCast, ReGRID, ATTOM) and produces a 50–60 page certified-style report.

Lead capture:
- If the user expresses intent (wants to appeal, asks about savings, has a specific property), ask for:
  (a) their property address, and (b) an email to send the analysis.
- Do not push for contact info more than once per conversation.
- Never claim you've already submitted their analysis — only the /get-started form does that.

Boundaries:
- Do not give individualized legal or tax advice; recommend a licensed pro for that.
- Do not quote specific market values or deadlines without referencing official county sources.
- Keep responses under ~120 words unless the user asks for detail.
- If asked about unrelated topics, politely redirect to property tax appeals.
`.trim();

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export class ChatValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatValidationError";
  }
}

/**
 * Validate + normalize incoming chat messages from the client.
 * Rejects oversized payloads and strips any non-{user,assistant} roles
 * (system is server-controlled only).
 */
export function sanitizeMessages(
  messages: Array<{ role: string; content: unknown }>
): ChatMessage[] {
  if (!Array.isArray(messages)) {
    throw new ChatValidationError("messages must be an array");
  }
  if (messages.length === 0) {
    throw new ChatValidationError("messages must not be empty");
  }
  if (messages.length > CHAT_MAX_MESSAGES) {
    throw new ChatValidationError(
      `too many messages (max ${CHAT_MAX_MESSAGES})`
    );
  }

  const cleaned: ChatMessage[] = [];
  let totalChars = 0;

  for (const m of messages) {
    if (m.role !== "user" && m.role !== "assistant") {
      // silently drop system/tool/function — those are server-controlled
      continue;
    }
    if (typeof m.content !== "string") {
      throw new ChatValidationError("message content must be a string");
    }
    const trimmed = m.content.trim();
    if (!trimmed) continue;
    if (trimmed.length > CHAT_MAX_CHARS_PER_MESSAGE) {
      throw new ChatValidationError(
        `message exceeds ${CHAT_MAX_CHARS_PER_MESSAGE} chars`
      );
    }
    totalChars += trimmed.length;
    if (totalChars > CHAT_MAX_TOTAL_CHARS) {
      throw new ChatValidationError(
        `conversation exceeds ${CHAT_MAX_TOTAL_CHARS} chars total`
      );
    }
    cleaned.push({ role: m.role, content: trimmed });
  }

  if (cleaned.length === 0) {
    throw new ChatValidationError("no valid messages after sanitization");
  }

  // A chat request should always end with a user turn — otherwise there's
  // nothing to respond to.
  if (cleaned[cleaned.length - 1].role !== "user") {
    throw new ChatValidationError("last message must be from the user");
  }

  return cleaned;
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
// US phone numbers in common formats: (123) 456-7890 / 123-456-7890 / 1234567890
// Length check after stripping non-digits keeps this permissive but sane.
const PHONE_RE = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;

export interface ExtractedContact {
  email?: string;
  phone?: string;
}

/**
 * Pull any contact info the user has volunteered in the conversation.
 * Used for lead capture — never to gate the assistant response.
 */
export function extractContactInfo(
  messages: ChatMessage[]
): ExtractedContact {
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");

  const emailMatch = userText.match(EMAIL_RE);
  const phoneMatch = userText.match(PHONE_RE);

  const contact: ExtractedContact = {};
  if (emailMatch) contact.email = emailMatch[0];
  if (phoneMatch) {
    const digits = phoneMatch[0].replace(/\D/g, "");
    if (digits.length === 10 || digits.length === 11) {
      contact.phone = phoneMatch[0];
    }
  }
  return contact;
}

/**
 * Build the full prompt sent to the LLM — always prefixes the server-owned
 * system prompt so the client can't override persona or safety rails.
 */
export function buildLLMMessages(
  messages: ChatMessage[]
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  return [{ role: "system", content: CHAT_SYSTEM_PROMPT }, ...messages];
}
