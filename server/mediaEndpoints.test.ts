import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mockTranscribeAudio = vi.fn();
const mockGenerateImage = vi.fn();

vi.mock("./_core/voiceTranscription", () => ({
  transcribeAudio: (input: unknown) => mockTranscribeAudio(input),
}));

vi.mock("./_core/imageGeneration", () => ({
  generateImage: (input: unknown) => mockGenerateImage(input),
}));

import { appRouter } from "./routers";

function makeCtx(user: TrpcContext["user"]): TrpcContext {
  return {
    user,
    req: {
      headers: {},
      socket: { remoteAddress: "127.0.0.1" },
    } as TrpcContext["req"],
    res: {
      clearCookie: () => undefined,
    } as TrpcContext["res"],
  };
}

const user = {
  id: 1,
  openId: "user-1",
  name: "Test User",
  email: "user@example.com",
  loginMethod: "google" as const,
  role: "user" as const,
  stripeCustomerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

describe("media endpoints", () => {
  it("requires auth for voice.transcribe", async () => {
    const caller = appRouter.createCaller(makeCtx(null));

    await expect(
      caller.voice.transcribe({
        audioUrl: "https://example.com/audio.mp3",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("calls transcribeAudio and returns its response", async () => {
    mockTranscribeAudio.mockResolvedValueOnce({
      task: "transcribe",
      language: "en",
      duration: 1.25,
      text: "hello world",
      segments: [],
    });

    const caller = appRouter.createCaller(makeCtx(user));
    const result = await caller.voice.transcribe({
      audioUrl: "https://example.com/audio.mp3",
      language: "en",
      prompt: "Transcribe this clip",
    });

    expect(mockTranscribeAudio).toHaveBeenCalledWith({
      audioUrl: "https://example.com/audio.mp3",
      language: "en",
      prompt: "Transcribe this clip",
    });
    expect(result.text).toBe("hello world");
  });

  it("maps service validation errors to BAD_REQUEST for voice.transcribe", async () => {
    mockTranscribeAudio.mockResolvedValueOnce({
      error: "Audio file exceeds maximum size limit",
      code: "FILE_TOO_LARGE",
      details: "File size is 18.00MB, maximum allowed is 16MB",
    });

    const caller = appRouter.createCaller(makeCtx(user));

    await expect(
      caller.voice.transcribe({
        audioUrl: "https://example.com/audio.mp3",
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Audio file exceeds maximum size limit: File size is 18.00MB, maximum allowed is 16MB",
    });
  });

  it("calls generateImage and returns the generated asset url", async () => {
    mockGenerateImage.mockResolvedValueOnce({
      url: "https://cdn.example.com/generated.png",
    });

    const caller = appRouter.createCaller(makeCtx(user));
    const result = await caller.images.generate({
      prompt: "Create a property exterior rendering",
      originalImages: [{ url: "https://example.com/original.png", mimeType: "image/png" }],
    });

    expect(mockGenerateImage).toHaveBeenCalledWith({
      prompt: "Create a property exterior rendering",
      originalImages: [{ url: "https://example.com/original.png", mimeType: "image/png" }],
    });
    expect(result.url).toBe("https://cdn.example.com/generated.png");
  });

  it("maps missing image service configuration to PRECONDITION_FAILED", async () => {
    mockGenerateImage.mockRejectedValueOnce(new Error("BUILT_IN_FORGE_API_KEY is not configured"));

    const caller = appRouter.createCaller(makeCtx(user));

    await expect(
      caller.images.generate({
        prompt: "Create a property exterior rendering",
      })
    ).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: "BUILT_IN_FORGE_API_KEY is not configured",
    });
  });
});
