import { describe, it, expect } from "vitest";
import { parsePhotosFromLogs } from "./db";

function log(
  overrides: Partial<{ type: string; metadata: string | null; createdAt: Date }>
) {
  return {
    type: "photo_uploaded",
    metadata: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("parsePhotosFromLogs", () => {
  it("extracts photos from photo_uploaded activity logs", () => {
    const photos = parsePhotosFromLogs([
      log({
        createdAt: new Date("2024-06-01T10:00:00Z"),
        metadata: JSON.stringify({
          url: "https://cdn.example/front.jpg",
          category: "exterior",
          caption: "Front of house",
          fileName: "front.jpg",
        }),
      }),
      log({
        createdAt: new Date("2024-06-01T09:00:00Z"),
        metadata: JSON.stringify({
          url: "https://cdn.example/roof.jpg",
          category: "roof",
        }),
      }),
    ]);

    expect(photos).toHaveLength(2);
    // Input is newest-first (mirrors activity log ordering); output is reversed
    // so the PDF renders in upload order.
    expect(photos[0].url).toBe("https://cdn.example/roof.jpg");
    expect(photos[0].category).toBe("roof");
    expect(photos[1].url).toBe("https://cdn.example/front.jpg");
    expect(photos[1].caption).toBe("Front of house");
    expect(photos[1].fileName).toBe("front.jpg");
  });

  it("ignores non-photo_uploaded rows", () => {
    const photos = parsePhotosFromLogs([
      log({
        type: "report_generated",
        metadata: JSON.stringify({ url: "https://cdn.example/report.pdf" }),
      }),
      log({
        metadata: JSON.stringify({ url: "https://cdn.example/photo.jpg", category: "interior" }),
      }),
    ]);

    expect(photos).toHaveLength(1);
    expect(photos[0].category).toBe("interior");
  });

  it("skips malformed metadata without throwing", () => {
    const photos = parsePhotosFromLogs([
      log({ metadata: "not-json" }),
      log({ metadata: JSON.stringify({ caption: "no url field" }) }),
      log({ metadata: JSON.stringify({ url: "https://cdn.example/ok.jpg" }) }),
    ]);

    expect(photos).toHaveLength(1);
    expect(photos[0].url).toBe("https://cdn.example/ok.jpg");
    expect(photos[0].category).toBe("other");
  });

  it("returns empty array when no logs are provided", () => {
    expect(parsePhotosFromLogs([])).toEqual([]);
  });

  it("skips entries with null metadata", () => {
    const photos = parsePhotosFromLogs([log({ metadata: null })]);
    expect(photos).toEqual([]);
  });
});
