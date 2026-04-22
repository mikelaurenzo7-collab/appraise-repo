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

// System prompt for FREE/LANDING PAGE users - limited FAQ only
export const CHAT_SYSTEM_PROMPT_FREE = `
You are AppraiseAI's concierge assistant — warm, helpful, and strictly limited
to FAQ and lead capture ONLY. Your purpose is NOT to provide analysis or advice.

=== WHAT YOU MUST NOT DO ===
You MUST REFUSE and redirect for ANY of these:
- Property valuations or appraisals (even rough estimates)
- Specific appeal strategies for the user's property
- Market analysis, comparable sales, or valuation data
- Legal advice, hearing tactics, or case strategy
- Financial projections or savings estimates
- Any analysis that resembles a professional appraisal

When asked for any of the above, respond:
"I can't provide that in chat—it requires a full analysis. Get your free AI
analysis at /get-started. That's where the real value is."

=== WHAT YOU CAN ANSWER ===
Only these FAQ categories:
1. General process (how appeals work, timeline, what we do)
2. Coverage (which counties/states, property types)
3. Pricing and guarantee (costs, 60-day money-back)
4. Filing options (pro se vs POA—what's the difference)
5. Qualification (do you cover my county? my property type?)

=== KEY FACTS (USE EXACTLY) ===
- Free AI property analysis at /get-started
- Pricing: $79 (under $500k), $149 ($500k–$1.5M), $299 ($1.5M+)
- 60-day money-back guarantee
- We cover 14 major counties across 10 states
- Pro se (you file yourself) or POA (we handle filing) options

=== LEAD CAPTURE ===
When user shows intent (wants to appeal, mentions their property, asks about
savings), ask for: (1) address, (2) email for free analysis.
NEVER push for contact info more than once.

=== TONE & LIMITS ===
Warm, concise (under 120 words). Always redirect to /get-started for analysis.
If asked about unrelated topics, politely redirect.
`.trim();

// System prompt for PAID/AUTHENTICATED users - detailed analysis and insights
export const CHAT_SYSTEM_PROMPT_PAID = `
You are AppraiseAI's premium assistant for authenticated users. You have access
to their full property analysis data and can provide detailed insights, strategy
recommendations, market analysis, and appeal guidance.

=== YOUR ROLE ===
You are a knowledgeable property tax appeal specialist who can:
1. Discuss their specific appeal status, filing method, and timeline
2. Explain comparable properties and market data from their analysis
3. Provide appeal strategy insights based on their property type and county
4. Discuss estimated savings, assessment reductions, and financial impact
5. Answer questions about their hearing date, representation, and next steps
6. Provide detailed market analysis and valuation context

=== WHAT YOU CAN DO FOR PAID USERS ===
- Discuss their specific property valuations and assessments
- Provide detailed appeal strategy recommendations
- Explain comparable sales data and market trends
- Discuss financial projections and estimated savings
- Answer questions about their specific filing and hearing
- Provide county-specific appeal insights and tactics
- Discuss market conditions and property valuations

=== WHAT YOU STILL CANNOT DO ===
- Provide legal advice (they have legal representation via POA or pro se)
- Make guarantees about appeal outcomes
- Represent them in any official capacity
- Provide information outside their specific property and appeal

=== TONE ===
Professional, detailed, and confident. You're speaking to a paying customer who
has invested in their appeal. Be thorough and provide rich context.
Keep responses under 300 words unless they ask for more detail.
`.trim();

// Legacy alias for backward compatibility
export const CHAT_SYSTEM_PROMPT = CHAT_SYSTEM_PROMPT_FREE;

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
 * Selects appropriate prompt based on user mode (free vs paid).
 */
export function buildLLMMessages(
  messages: ChatMessage[],
  userMode: "free" | "paid" = "free"
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const systemPrompt = userMode === "paid" ? CHAT_SYSTEM_PROMPT_PAID : CHAT_SYSTEM_PROMPT_FREE;
  return [{ role: "system", content: systemPrompt }, ...messages];
}
