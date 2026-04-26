export type ManusAuthState = {
  redirectUri: string;
  returnTo: string | null;
};

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return globalThis.btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }

  const binary = globalThis.atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function encodeBase64Utf8(value: string): string {
  return bytesToBase64(new TextEncoder().encode(value));
}

function decodeBase64Utf8(value: string): string {
  return new TextDecoder().decode(base64ToBytes(value));
}

export function sanitizeReturnTo(returnTo: unknown): string | null {
  if (typeof returnTo !== "string") return null;
  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) return null;
  if (returnTo.startsWith("/api/oauth/callback")) return null;
  return returnTo;
}

export function encodeManusAuthState(input: {
  redirectUri: string;
  returnTo?: string | null;
}): string {
  return encodeBase64Utf8(
    JSON.stringify({
      redirectUri: input.redirectUri,
      returnTo: sanitizeReturnTo(input.returnTo),
    })
  );
}

export function decodeManusAuthState(encodedState: string): ManusAuthState {
  const decoded = decodeBase64Utf8(encodedState);

  try {
    const parsed = JSON.parse(decoded) as Partial<ManusAuthState>;

    if (
      typeof parsed.redirectUri === "string" &&
      parsed.redirectUri.length > 0
    ) {
      return {
        redirectUri: parsed.redirectUri,
        returnTo: sanitizeReturnTo(parsed.returnTo),
      };
    }
  } catch {
    // Support legacy states that only encoded the redirect URI string.
  }

  if (decoded.length === 0) {
    throw new Error("Invalid Manus auth state");
  }

  return {
    redirectUri: decoded,
    returnTo: null,
  };
}