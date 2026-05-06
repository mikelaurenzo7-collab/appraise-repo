import { TRPCError } from "@trpc/server";

type SupabaseMessageBody = {
  error_description?: unknown;
  msg?: unknown;
  message?: unknown;
  error?: unknown;
};

function cleanPlainTextMessage(text: string): string | null {
  const message = text.replace(/\s+/g, " ").trim();
  if (!message || message.startsWith("<")) return null;
  return message.slice(0, 240);
}

function getMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const record = body as SupabaseMessageBody;
  const message =
    record.error_description ?? record.msg ?? record.message ?? record.error;
  return typeof message === "string" && message.trim() ? message : fallback;
}

async function readText(res: Response): Promise<string> {
  return res.text().catch(() => "");
}

export async function readSupabaseErrorMessage(
  res: Response,
  fallback: string
): Promise<string> {
  const text = await readText(res);
  if (!text.trim()) return fallback;

  try {
    return getMessage(JSON.parse(text), fallback);
  } catch {
    return cleanPlainTextMessage(text) ?? fallback;
  }
}

export async function readSupabaseJson<T>(
  res: Response,
  fallbackMessage: string
): Promise<T> {
  const text = await readText(res);
  if (!text.trim()) {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: fallbackMessage,
    });
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: fallbackMessage,
    });
  }
}
