import { describe, it, expect } from "vitest";
import { inferBriefAudience } from "./services/analysisJob";

describe("inferBriefAudience", () => {
  it("respects an explicit preference when valid", () => {
    expect(inferBriefAudience("assessor", null)).toBe("assessor");
    expect(inferBriefAudience("board", "poa")).toBe("board");
    expect(inferBriefAudience("attorney", undefined)).toBe("attorney");
    expect(inferBriefAudience("owner", "pro-se")).toBe("owner");
  });

  it("falls through unrecognized preferences to filing-method inference", () => {
    expect(inferBriefAudience("nonsense", "poa")).toBe("assessor");
    expect(inferBriefAudience("", "pro-se")).toBe("assessor");
  });

  it("infers 'assessor' for any active filing method when no preference is set", () => {
    expect(inferBriefAudience(null, "poa")).toBe("assessor");
    expect(inferBriefAudience(null, "pro-se")).toBe("assessor");
    expect(inferBriefAudience(null, "automated_standard")).toBe("assessor");
    expect(inferBriefAudience(null, "automated_express")).toBe("assessor");
  });

  it("defaults to 'board' when neither preference nor filing method is set", () => {
    expect(inferBriefAudience(null, null)).toBe("board");
    expect(inferBriefAudience(undefined, undefined)).toBe("board");
    expect(inferBriefAudience(null, "none")).toBe("board");
  });
});
