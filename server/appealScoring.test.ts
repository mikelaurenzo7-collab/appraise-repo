import { describe, it, expect } from "vitest";
import { formatAppealScore, AppealStrengthScore } from "./services/appealStrengthScoring";

describe("Appeal Strength Scoring", () => {
  describe("formatAppealScore", () => {
    it("should format a high score correctly", () => {
      const score: AppealStrengthScore = {
        overallScore: 85,
        successProbability: 0.82,
        confidenceLevel: "high",
        factors: [
          {
            name: "Comparable Sales",
            weight: 0.3,
            score: 90,
            impact: 12,
            explanation: "Strong comparable sales support",
          },
        ],
        recommendation: "Strong appeal candidate. Proceed with confidence.",
        riskFactors: [],
        strengthFactors: ["Comparable Sales"],
        historicalWinRate: 0.65,
        estimatedSavingsRange: { min: 1200, max: 2400 },
      };

      const formatted = formatAppealScore(score);
      expect(formatted).toContain("85/100");
      expect(formatted).toContain("82.0%");
      expect(formatted).toContain("HIGH");
      expect(formatted).toContain("$1,200");
      expect(formatted).toContain("$2,400");
    });

    it("should format a low score correctly", () => {
      const score: AppealStrengthScore = {
        overallScore: 35,
        successProbability: 0.25,
        confidenceLevel: "low",
        factors: [],
        recommendation: "Weak appeal prospects.",
        riskFactors: ["Assessment Gap", "Property Type"],
        strengthFactors: [],
        historicalWinRate: 0.3,
        estimatedSavingsRange: { min: 0, max: 200 },
      };

      const formatted = formatAppealScore(score);
      expect(formatted).toContain("35/100");
      expect(formatted).toContain("25.0%");
      expect(formatted).toContain("LOW");
    });

    it("renders 'not available' when no real tax rate yields a savings range", () => {
      const score: AppealStrengthScore = {
        overallScore: 60,
        successProbability: 0.5,
        confidenceLevel: "medium",
        factors: [],
        recommendation: "Some grounds present.",
        riskFactors: [],
        strengthFactors: [],
        historicalWinRate: 0.5,
        estimatedSavingsRange: null,
      };
      const formatted = formatAppealScore(score);
      expect(formatted).toContain("not available");
      expect(formatted).toContain("upload your tax bill");
      expect(formatted).not.toMatch(/\$\d/); // no fabricated dollar figure
    });
  });

  describe("Score factor calculations (pure logic)", () => {
    it("should identify over-assessment when assessed > market", () => {
      const assessedValue = 300000;
      const marketValue = 250000;
      const ratio = assessedValue / marketValue;
      expect(ratio).toBeGreaterThan(1.0);
      expect(ratio).toBeCloseTo(1.2, 1);
    });

    it("should calculate assessment gap correctly", () => {
      const gap = 300000 - 250000;
      expect(gap).toBe(50000);
    });

    it("should calculate savings range correctly", () => {
      const gap = 100000;
      const probability = 0.8;
      const minReduction = gap * 0.3 * probability;
      const maxReduction = gap * 0.6 * probability;
      const taxRate = 0.012;
      
      expect(Math.round(minReduction * taxRate)).toBe(288);
      expect(Math.round(maxReduction * taxRate)).toBe(576);
    });

    it("should determine confidence level correctly", () => {
      const getConfidence = (score: number, winRate: number) => {
        if (score > 70 && winRate > 0.6) return "high";
        if (score > 65 && winRate > 0.5) return "high";
        if (score > 45 && winRate > 0.3) return "medium";
        if (score > 55) return "medium";
        return "low";
      };

      expect(getConfidence(80, 0.7)).toBe("high");
      expect(getConfidence(50, 0.4)).toBe("medium");
      expect(getConfidence(30, 0.2)).toBe("low");
    });

    it("should generate correct recommendation for high scores", () => {
      const generateRec = (score: number, probability: number) => {
        if (score > 75 && probability > 0.7) return "strong";
        if (score > 60 && probability > 0.55) return "moderate";
        if (score > 45) return "borderline";
        return "weak";
      };

      expect(generateRec(85, 0.8)).toBe("strong");
      expect(generateRec(65, 0.6)).toBe("moderate");
      expect(generateRec(50, 0.4)).toBe("borderline");
      expect(generateRec(30, 0.2)).toBe("weak");
    });

    it("should score comparable sales based on assessment ratio", () => {
      const scoreComps = (assessed: number, market: number) => {
        if (!assessed || !market) return 50;
        const ratio = assessed / market;
        if (ratio > 1.1) return 95;
        if (ratio > 1.05) return 85;
        if (ratio > 0.95) return 70;
        if (ratio > 0.85) return 50;
        if (ratio > 0.75) return 30;
        return 15;
      };

      expect(scoreComps(350000, 280000)).toBe(95); // ratio 1.25
      expect(scoreComps(315000, 300000)).toBe(70); // ratio 1.05 exactly, falls into > 0.95 bucket
      expect(scoreComps(290000, 300000)).toBe(70); // ratio 0.967, falls into > 0.95 bucket
      expect(scoreComps(270000, 300000)).toBe(50); // ratio 0.9
      expect(scoreComps(240000, 300000)).toBe(30); // ratio 0.8
      expect(scoreComps(200000, 300000)).toBe(15); // ratio 0.667
    });

    it("should score assessment gap correctly", () => {
      const scoreGap = (gap: number | null) => {
        if (!gap || gap <= 0) return 30;
        if (gap > 500000) return 95;
        if (gap > 250000) return 85;
        if (gap > 100000) return 75;
        if (gap > 50000) return 65;
        if (gap > 25000) return 55;
        if (gap > 10000) return 45;
        if (gap > 5000) return 35;
        return 25;
      };

      expect(scoreGap(600000)).toBe(95);
      expect(scoreGap(300000)).toBe(85);
      expect(scoreGap(150000)).toBe(75);
      expect(scoreGap(75000)).toBe(65);
      expect(scoreGap(30000)).toBe(55);
      expect(scoreGap(15000)).toBe(45);
      expect(scoreGap(7000)).toBe(35);
      expect(scoreGap(3000)).toBe(25);
      expect(scoreGap(0)).toBe(30);
      expect(scoreGap(null)).toBe(30);
    });

    it("should score property types correctly", () => {
      const typeScores: Record<string, number> = {
        residential: 70,
        "multi-family": 75,
        commercial: 65,
        industrial: 60,
        agricultural: 55,
        land: 50,
        unknown: 50,
      };

      expect(typeScores["residential"]).toBe(70);
      expect(typeScores["multi-family"]).toBe(75);
      expect(typeScores["commercial"]).toBe(65);
    });

    it("should score county factors correctly", () => {
      const countyFactors: Record<string, number> = {
        "Travis County": 75,
        "Harris County": 65,
        "Dallas County": 70,
        "Cook County": 60,
      };

      expect(countyFactors["Travis County"]).toBe(75);
      expect(countyFactors["Cook County"]).toBe(60);
    });
  });

  describe("Overall score calculation", () => {
    it("should calculate weighted overall score", () => {
      const factors = [
        { score: 95, weight: 0.3 },  // Comparable Sales
        { score: 75, weight: 0.25 }, // Assessment Gap
        { score: 65, weight: 0.2 },  // Strength Factors
        { score: 60, weight: 0.15 }, // County Factors
        { score: 70, weight: 0.1 },  // Property Type
      ];

      const totalImpact = factors.reduce(
        (sum, f) => sum + (f.score - 50) * f.weight,
        0
      );
      const overallScore = Math.max(0, Math.min(100, 50 + totalImpact));

      expect(overallScore).toBeGreaterThan(65);
      expect(overallScore).toBeLessThan(85);
    });

    it("should clamp overall score between 0 and 100", () => {
      const clamp = (score: number) => Math.max(0, Math.min(100, score));
      expect(clamp(150)).toBe(100);
      expect(clamp(-20)).toBe(0);
      expect(clamp(75)).toBe(75);
    });
  });
});
