const TRPC_INTERNAL_ERROR_CODE = -32603;

type FetchLike = typeof fetch;

function getResponseHeader(headers: Headers, name: string): string {
  return headers.get(name) ?? "";
}

function looksJson(contentType: string): boolean {
  return /(^|[;+\s])application\/json($|[;+\s])|\+json($|[;+\s])/i.test(
    contentType
  );
}

function textPreview(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 240);
}

function fallbackMessage(status: number, body: string): string {
  const preview = textPreview(body);
  if (preview && !/^\s*</.test(preview)) return preview;

  if (status === 401) return "Please sign in and try again.";
  if (status === 403)
    return "You do not have permission to perform this action.";
  if (status === 404) return "The requested API endpoint was not found.";
  if (status === 429)
    return "Too many requests. Please wait a moment and try again.";
  if (status >= 500) return "A server error occurred. Please try again.";
  return "The server returned an unreadable response. Please try again.";
}

function trpcErrorResponse(original: Response, bodyText: string): Response {
  const message = fallbackMessage(original.status, bodyText);
  const payload = [
    {
      error: {
        message,
        code: TRPC_INTERNAL_ERROR_CODE,
        data: {
          code:
            original.status === 401 ? "UNAUTHORIZED" : "INTERNAL_SERVER_ERROR",
          httpStatus: original.status || 500,
          path: "unknown",
        },
      },
    },
  ];

  const headers = new Headers(original.headers);
  headers.set("content-type", "application/json");

  return new Response(JSON.stringify(payload), {
    status: original.status || 500,
    statusText: original.statusText,
    headers,
  });
}

/**
 * tRPC expects every `/api/trpc` response to be JSON. Serverless platforms can
 * still return plain text when a function crashes before Express/tRPC handles
 * the request (for example: `A server error occurred`). Normalize those cases
 * into a valid tRPC error envelope so users see the actual auth/server message
 * instead of a browser JSON parser exception like `Unexpected token 'A'`.
 */
export function createSafeTrpcFetch(
  fetchImpl: FetchLike = globalThis.fetch
): FetchLike {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await fetchImpl(input, {
      ...(init ?? {}),
      credentials: "include",
    });

    const contentType = getResponseHeader(response.headers, "content-type");
    if (looksJson(contentType)) return response;

    const bodyText = await response
      .clone()
      .text()
      .catch(() => "");
    return trpcErrorResponse(response, bodyText);
  }) as FetchLike;
}
