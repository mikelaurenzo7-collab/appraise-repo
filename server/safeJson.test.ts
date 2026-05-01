import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { safeJsonParse } from "./_core/safeJson";

// Locks in the contract: safeJsonParse NEVER throws and always returns
// the typed fallback when the input is unparseable. Critical because
// we use it to guard report generation and dashboard loads from corrupt
// DB rows — a regression here would re-introduce the 500-on-bad-row
// failure mode it was added to fix.

describe("safeJsonParse", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress the helper's warn-log noise during the negative tests.
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe("valid inputs", () => {
    it("parses an array", () => {
      expect(safeJsonParse<number[]>("[1,2,3]", [])).toEqual([1, 2, 3]);
    });

    it("parses an object", () => {
      expect(safeJsonParse<{ x: number }>('{"x":1}', { x: 0 })).toEqual({ x: 1 });
    });

    it("parses a string literal", () => {
      expect(safeJsonParse<string>('"hello"', "fallback")).toBe("hello");
    });

    it("parses a number literal", () => {
      expect(safeJsonParse<number>("42", 0)).toBe(42);
    });

    it("parses null literal", () => {
      // The literal string "null" parses to JS null; that's intentional.
      expect(safeJsonParse<unknown>("null", "fallback")).toBeNull();
    });

    it("parses an empty array literal", () => {
      expect(safeJsonParse<unknown[]>("[]", [{ marker: 1 }])).toEqual([]);
    });
  });

  describe("falsy inputs return fallback without warning", () => {
    it("null", () => {
      expect(safeJsonParse<number[]>(null, [])).toEqual([]);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("undefined", () => {
      expect(safeJsonParse<number[]>(undefined, [])).toEqual([]);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("empty string", () => {
      expect(safeJsonParse<number[]>("", [])).toEqual([]);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe("malformed inputs return fallback + log a warning", () => {
    it("unbalanced brace", () => {
      expect(safeJsonParse<unknown[]>("[1,2,", [])).toEqual([]);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it("trailing comma", () => {
      expect(safeJsonParse<unknown>('{"x":1,}', { x: 0 })).toEqual({ x: 0 });
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it("garbage", () => {
      expect(safeJsonParse<string[]>("not json at all", [])).toEqual([]);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it("scope tag is included in the warning meta", () => {
      safeJsonParse<unknown>("{bad}", null, "test.scope");
      // The structured logger emits one JSON line via console.warn
      const callArg = warnSpy.mock.calls[0]?.[0];
      expect(typeof callArg).toBe("string");
      expect(callArg as string).toContain("test.scope");
    });
  });

  describe("non-string inputs return fallback (defensive)", () => {
    it("number", () => {
      // @ts-expect-error — runtime type mismatch is exactly what we're guarding
      expect(safeJsonParse<number[]>(42, [])).toEqual([]);
    });

    it("object", () => {
      // @ts-expect-error — runtime type mismatch
      expect(safeJsonParse<unknown>({ already: "parsed" }, null)).toBeNull();
    });
  });

  describe("never throws — invariant guard", () => {
    it("returns fallback even when JSON.parse would throw on cyclic input", () => {
      // No way to construct cyclic JSON as a string, but verify the typeof
      // guard catches every non-string before reaching JSON.parse.
      const fallback = { marker: true };
      const inputs: unknown[] = [Symbol("x"), () => 1, BigInt(123), new Date(), [] as unknown];
      for (const v of inputs) {
        // @ts-expect-error — these are intentionally bad inputs
        expect(() => safeJsonParse(v, fallback)).not.toThrow();
      }
    });
  });
});
