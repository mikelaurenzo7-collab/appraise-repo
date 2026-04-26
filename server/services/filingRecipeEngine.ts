/**
 * Filing recipe engine.
 *
 * A recipe is a versioned JSON plan that describes the steps needed to
 * complete an online tax-appeal filing on a specific county portal. The
 * engine has two halves:
 *
 *   1. A pure validator/planner (this file). It accepts recipes from the
 *      database, validates their shape, resolves template variables from
 *      user-provided inputs and analysis data, and produces an execution
 *      plan. The planner has no runtime dependency on Playwright, which
 *      keeps it testable in a plain Node environment.
 *
 *   2. An executor (see `playwrightExecutor.ts`) that actually drives a
 *      Chromium browser. The executor is lazy-loaded so tests and the
 *      main server do not pay the Playwright import cost until a filing
 *      job actually runs.
 *
 * The recipe DSL intentionally mirrors Playwright's own API, but each
 * step is a declarative JSON object rather than imperative code. This
 * makes it safe to store, diff, and roll back. County portals change
 * selectors frequently; a recipe can be bumped to a new version without
 * a code deploy.
 *
 * Reference values allowed inside `from` / `value` fields:
 *
 *   user.accountNumber          user-provided property account number
 *   user.taxpayerPin            PIN from mailed assessment notice
 *   user.ownerName              from submission or OAuth profile
 *   user.ownerEmail
 *   user.address                submission.address
 *   user.city / .state / .zip
 *   analysis.marketValueEstimate
 *   analysis.assessmentGap
 *   analysis.appealStrengthScore
 *   report.pdfPath              local path to the generated appraisal PDF
 *   report.pdfUrl               S3 URL for the same
 *   submission.assessedValue
 */

import crypto from "crypto";

export type RecipeStep =
  | { action: "goto"; url: string }
  | { action: "waitFor"; selector: string; timeoutMs?: number }
  | { action: "waitForURL"; pattern: string; timeoutMs?: number }
  | { action: "fill"; selector: string; from: string; optional?: boolean }
  | { action: "fillValue"; selector: string; value: string; optional?: boolean }
  | { action: "click"; selector: string; optional?: boolean }
  | { action: "selectOption"; selector: string; value: string; optional?: boolean }
  | { action: "setRadio"; selector: string; value: string; optional?: boolean }
  | { action: "setCheckbox"; selector: string; checked: boolean; optional?: boolean }
  | { action: "uploadFile"; selector: string; from: "report.pdfPath"; optional?: boolean }
  | { action: "captureText"; selector: string; to: string }
  | { action: "screenshot"; to: string; fullPage?: boolean }
  | { action: "assertText"; selector: string; contains: string }
  | { action: "pauseForCaptcha"; selector: string; timeoutMs?: number }
  | { action: "wait"; ms: number };

export type Recipe = {
  countyId: number;
  version: number;
  portalUrl: string;
  steps: RecipeStep[];
};

export type RecipeInputs = {
  user: Partial<Record<string, string | number | undefined | null>>;
  analysis: Partial<Record<string, string | number | undefined | null>>;
  submission: Partial<Record<string, string | number | undefined | null>>;
  report: Partial<Record<string, string | null>>;
};

export type ResolvedStep = RecipeStep & { resolvedValue?: string };

export class RecipeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecipeValidationError";
  }
}

export class RecipeInputError extends Error {
  public readonly missingField: string;
  constructor(field: string) {
    super(`Required recipe input missing: ${field}`);
    this.name = "RecipeInputError";
    this.missingField = field;
  }
}

const VALID_ACTIONS = new Set<string>([
  "goto",
  "waitFor",
  "waitForURL",
  "fill",
  "fillValue",
  "click",
  "selectOption",
  "setRadio",
  "setCheckbox",
  "uploadFile",
  "captureText",
  "screenshot",
  "assertText",
  "pauseForCaptcha",
  "wait",
]);

export function parseRecipe(raw: string | Recipe): Recipe {
  const obj = typeof raw === "string" ? (JSON.parse(raw) as Recipe) : raw;
  if (!obj || typeof obj !== "object") throw new RecipeValidationError("Recipe must be an object");
  if (typeof obj.portalUrl !== "string" || !/^https:\/\//i.test(obj.portalUrl)) {
    throw new RecipeValidationError("portalUrl must be an https URL");
  }
  if (!Array.isArray(obj.steps) || obj.steps.length === 0) {
    throw new RecipeValidationError("steps must be a non-empty array");
  }
  obj.steps.forEach((step, i) => {
    if (!step || typeof step !== "object") {
      throw new RecipeValidationError(`Step ${i} is not an object`);
    }
    if (!VALID_ACTIONS.has((step as RecipeStep).action)) {
      throw new RecipeValidationError(`Step ${i} has invalid action: ${(step as any).action}`);
    }
  });
  return obj;
}

/**
 * Resolve a "from" path (e.g. "user.accountNumber") against the supplied
 * inputs. Returns the string-coerced value or throws if the field is
 * missing and the step is not optional.
 */
export function resolveFrom(path: string, inputs: RecipeInputs): string {
  const [root, key] = path.split(".");
  if (!root || !key) throw new RecipeInputError(path);
  const bucket = (inputs as any)[root];
  const value = bucket?.[key];
  if (value === undefined || value === null || value === "") {
    throw new RecipeInputError(path);
  }
  return String(value);
}

/**
 * Walk the recipe and produce a plan with all `from` references resolved.
 * Also returns a list of field paths the recipe reads, so a UI can prompt
 * the user for any inputs that are not already on the submission.
 */
export function planRecipe(recipe: Recipe, inputs: RecipeInputs): {
  steps: ResolvedStep[];
  requiredInputs: string[];
} {
  const required = new Set<string>();
  const steps: ResolvedStep[] = recipe.steps.map((step) => {
    if ("from" in step && step.from) {
      required.add(step.from);
      try {
        return { ...step, resolvedValue: resolveFrom(step.from, inputs) };
      } catch (err) {
        if (step.optional) return { ...step };
        throw err;
      }
    }
    return { ...step };
  });
  return { steps, requiredInputs: Array.from(required).sort() };
}

/**
 * Hash a recipe so the execution log can prove which recipe version was
 * actually run. Hash is deterministic with respect to step order and
 * values but ignores cosmetic JSON differences.
 */
export function hashRecipe(recipe: Recipe): string {
  const canonical = JSON.stringify({
    portalUrl: recipe.portalUrl,
    version: recipe.version,
    steps: recipe.steps,
  });
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

/**
 * Derive the SHA-256 of a scrivener authorization text so we can link the
 * signed authorization to the exact block of copy presented to the user.
 */
export function hashAuthorizationText(text: string): string {
  return crypto.createHash("sha256").update(text.replace(/\s+/g, " ").trim()).digest("hex");
}
