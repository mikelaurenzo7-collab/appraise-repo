import { describe, expect, it } from "vitest";
import {
  parseRecipe,
  planRecipe,
  resolveFrom,
  hashRecipe,
  hashAuthorizationText,
  RecipeInputError,
  RecipeValidationError,
  type Recipe,
} from "./services/filingRecipeEngine";

const validRecipe: Recipe = {
  countyId: 1,
  version: 1,
  portalUrl: "https://portal.example.com/",
  steps: [
    { action: "goto", url: "https://portal.example.com/login" },
    { action: "fill", selector: "#account", from: "user.accountNumber" },
    { action: "fill", selector: "#pin", from: "user.taxpayerPin" },
    { action: "click", selector: "button[type=submit]" },
  ],
};

describe("recipe parsing", () => {
  it("accepts a well-formed recipe", () => {
    expect(() => parseRecipe(validRecipe)).not.toThrow();
  });

  it("accepts JSON string input", () => {
    expect(() => parseRecipe(JSON.stringify(validRecipe))).not.toThrow();
  });

  it("rejects non-https portalUrl", () => {
    expect(() =>
      parseRecipe({ ...validRecipe, portalUrl: "http://insecure.example" })
    ).toThrow(RecipeValidationError);
  });

  it("rejects empty step list", () => {
    expect(() => parseRecipe({ ...validRecipe, steps: [] })).toThrow(RecipeValidationError);
  });

  it("rejects unknown action", () => {
    expect(() =>
      parseRecipe({
        ...validRecipe,
        steps: [{ action: "tap", selector: "#x" } as any],
      })
    ).toThrow(RecipeValidationError);
  });
});

describe("recipe planning", () => {
  it("resolves `from` references", () => {
    const plan = planRecipe(validRecipe, {
      user: { accountNumber: "A-123", taxpayerPin: "PIN-9" },
      analysis: {},
      submission: {},
      report: {},
    });
    expect(plan.steps[1].resolvedValue).toBe("A-123");
    expect(plan.steps[2].resolvedValue).toBe("PIN-9");
    expect(plan.requiredInputs).toContain("user.accountNumber");
    expect(plan.requiredInputs).toContain("user.taxpayerPin");
  });

  it("throws RecipeInputError when required field missing", () => {
    expect(() =>
      planRecipe(validRecipe, {
        user: { accountNumber: "A-123" }, // missing taxpayerPin
        analysis: {},
        submission: {},
        report: {},
      })
    ).toThrow(RecipeInputError);
  });

  it("skips optional steps when field missing", () => {
    const recipe: Recipe = {
      ...validRecipe,
      steps: [
        { action: "fill", selector: "#x", from: "user.optionalField", optional: true },
      ],
    };
    const plan = planRecipe(recipe, { user: {}, analysis: {}, submission: {}, report: {} });
    expect(plan.steps[0].resolvedValue).toBeUndefined();
  });
});

describe("resolveFrom", () => {
  it("coerces numbers to strings", () => {
    expect(
      resolveFrom("analysis.value", {
        user: {},
        analysis: { value: 42 },
        submission: {},
        report: {},
      })
    ).toBe("42");
  });

  it("throws on missing path", () => {
    expect(() =>
      resolveFrom("user.missing", {
        user: {},
        analysis: {},
        submission: {},
        report: {},
      })
    ).toThrow(RecipeInputError);
  });
});

describe("hashing", () => {
  it("produces a stable recipe hash", () => {
    const a = hashRecipe(validRecipe);
    const b = hashRecipe({ ...validRecipe });
    expect(a).toEqual(b);
    expect(a).toHaveLength(64);
  });

  it("changes hash when steps change", () => {
    const a = hashRecipe(validRecipe);
    const b = hashRecipe({
      ...validRecipe,
      steps: [...validRecipe.steps, { action: "wait", ms: 100 }],
    });
    expect(a).not.toEqual(b);
  });

  it("hashes authorization text deterministically and whitespace-insensitively", () => {
    const a = hashAuthorizationText("I authorize the software to submit.");
    const b = hashAuthorizationText("I  authorize  the\n software  to  submit. ");
    expect(a).toEqual(b);
  });
});
