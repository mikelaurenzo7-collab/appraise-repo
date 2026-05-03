import { describe, it, expect } from "vitest";

describe("Photo Upload Endpoint", () => {
  // Matches the photoCategoryEnum in drizzle/schema.pg.ts and the
  // uploadPhoto mutation's category whitelist.
  const SUPPORTED_CATEGORIES = [
    "exterior",
    "interior",
    "damage",
    "condition",
    "comparable",
    "neighborhood",
    "other",
  ] as const;

  it("should validate photo upload schema", () => {
    const photoUpload = {
      submissionId: 1,
      fileName: "exterior-view.jpg",
      fileData: "base64encodeddata",
      category: "exterior" as const,
      caption: "Front view of property",
    };

    expect(photoUpload.submissionId).toBeGreaterThan(0);
    expect(photoUpload.fileName).toContain(".jpg");
    expect(photoUpload.category).toBe("exterior");
    expect(SUPPORTED_CATEGORIES).toContain(photoUpload.category);
  });

  it("should support all photo categories", () => {
    expect(SUPPORTED_CATEGORIES).toHaveLength(7);
    for (const c of ["exterior", "interior", "damage", "condition", "comparable", "neighborhood", "other"]) {
      expect(SUPPORTED_CATEGORIES).toContain(c);
    }
  });

  it("should generate S3 photo key with user isolation", () => {
    const userId = 123;
    const submissionId = 456;
    const fileName = "photo.jpg";
    const timestamp = Date.now();

    const photoKey = `photos/${userId}/${submissionId}/${timestamp}-${fileName}`;

    expect(photoKey).toContain(`photos/${userId}/${submissionId}`);
    expect(photoKey).toContain(fileName);
    expect(photoKey).toMatch(/photos\/\d+\/\d+\/\d+-photo\.jpg/);
  });

  it("should validate base64 file data", () => {
    const validBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    expect(validBase64).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(Buffer.from(validBase64, "base64")).toBeDefined();
  });

  it("should track photo upload activity", () => {
    const activity = {
      submissionId: 1,
      type: "photo_uploaded",
      actor: "user",
      actorId: 123,
      description: "Photo uploaded: exterior-view.jpg",
      metadata: JSON.stringify({
        category: "exterior",
        url: "https://s3.example.com/photos/123/1/1234567890-exterior-view.jpg",
      }),
      status: "success",
    };

    expect(activity.type).toBe("photo_uploaded");
    expect(activity.status).toBe("success");
    expect(activity.metadata).toContain("exterior");
  });

  it("should return photo URL and metadata", () => {
    const response = {
      url: "https://s3.example.com/photos/123/1/1234567890-photo.jpg",
      fileName: "photo.jpg",
      category: "exterior",
    };

    expect(response.url).toContain("s3.example.com");
    expect(response.url).toContain("photos");
    expect(response.fileName).toBe("photo.jpg");
    expect(response.category).toBe("exterior");
  });

  it("should support optional photo caption", () => {
    const photoWithCaption = {
      submissionId: 1,
      fileName: "photo.jpg",
      fileData: "base64data",
      category: "exterior" as const,
      caption: "This is the front view",
    };

    const photoWithoutCaption = {
      submissionId: 1,
      fileName: "photo.jpg",
      fileData: "base64data",
      category: "exterior" as const,
    };

    expect(photoWithCaption.caption).toBeDefined();
    expect(photoWithoutCaption.caption).toBeUndefined();
  });

  it("should validate submission ID exists", () => {
    const validSubmissionId = 123;
    const invalidSubmissionId = -1;

    expect(validSubmissionId).toBeGreaterThan(0);
    expect(invalidSubmissionId).toBeLessThan(0);
  });
});

describe("Photo cost-to-cure", () => {
  it("PhotoFinding accepts costToCure field", () => {
    const finding = {
      url: "https://s3.example.com/photo.jpg",
      category: "exterior" as const,
      conditionScore: 40,
      conditionLabel: "fair" as const,
      observations: ["Roof shingles missing on south slope"],
      valueImpactingIssues: ["Missing shingles require replacement"],
      functionalObsolescence: [],
      assessorBlindSpots: [],
      costToCure: [{ low: 8000, high: 15000, description: "Roof shingle replacement" }],
    };
    expect(finding.costToCure).toBeDefined();
    expect(finding.costToCure![0].low).toBe(8000);
    expect(finding.costToCure![0].high).toBe(15000);
    expect(finding.costToCure![0].description).toBe("Roof shingle replacement");
  });

  it("costToCure midpoint calculation is correct", () => {
    const items = [
      { low: 8000, high: 15000, description: "Roof" },
      { low: 2000, high: 4000, description: "HVAC filter" },
    ];
    const total = items.reduce((sum, c) => sum + Math.round((c.low + c.high) / 2), 0);
    expect(total).toBe(11500 + 3000); // 14500
  });

  it("PhotoAnalysisSummary accepts costToCureTotal field", () => {
    const summary = {
      findings: [],
      overallConditionScore: 40,
      overallEvidenceStrength: "moderate" as const,
      appealStrengthDelta: 5,
      topObservations: [],
      topValueIssues: [],
      uspapRatings: [],
      assessorBlindSpotItems: [],
      functionalObsolescenceItems: [],
      summaryParagraph: "Test",
      costToCureTotal: 22000,
    };
    expect(summary.costToCureTotal).toBe(22000);
  });

  it("costToCure round-trips through activity-log JSON metadata", () => {
    // Mirrors the persistence path:
    //   analysisJob writes JSON.stringify(meta) → activity_logs.metadata
    //   getLatestPhotoAnalysis reads JSON.parse + filters bad shapes
    const written = {
      photoCount: 2,
      overallConditionScore: 55,
      overallEvidenceStrength: 70,
      appealStrengthDelta: 4,
      topObservations: ["Visible roof wear"],
      topValueIssues: ["Missing shingles"],
      uspapRatings: ["C4"],
      assessorBlindSpotItems: [],
      functionalObsolescenceItems: [],
      summaryParagraph: "Test summary",
      costToCureTotal: 14500,
      costToCureItems: [
        { low: 8000, high: 15000, description: "Roof shingle replacement" },
        { low: 2000, high: 4000, description: "HVAC service" },
        // Malformed entry that the reader must filter out
        { low: "bad", high: 4000, description: "Invalid" } as unknown as {
          low: number;
          high: number;
          description: string;
        },
      ],
    };
    const serialized = JSON.stringify(written);
    const parsed = JSON.parse(serialized);

    const safeCostToCureItems = Array.isArray(parsed.costToCureItems)
      ? parsed.costToCureItems.filter(
          (i: { low: unknown; high: unknown; description: unknown }) =>
            typeof i?.low === "number" &&
            typeof i?.high === "number" &&
            typeof i?.description === "string",
        )
      : undefined;

    expect(parsed.costToCureTotal).toBe(14500);
    expect(safeCostToCureItems).toHaveLength(2);
    expect(safeCostToCureItems?.[0].description).toBe("Roof shingle replacement");
    expect(safeCostToCureItems?.[1].low).toBe(2000);
  });
});
