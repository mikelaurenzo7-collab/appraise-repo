/**
 * County-specific filing endpoints
 * Handles form generation, county lookup, and filing management
 */

import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { generateCountyForm, generateFilingChecklist } from "../services/formGenerator";
import { getCountyById, listCountiesByState, createFilingTier } from "../db";

export const countiesRouter = router({
  /**
   * Get county by ID
   */
  getCounty: publicProcedure
    .input(z.object({ countyId: z.number() }))
    .query(async ({ input }) => {
      const county = await getCountyById(input.countyId);
      if (!county) throw new Error("County not found");
      return county;
    }),

  /**
   * List counties by state
   */
  listCountiesByState: publicProcedure
    .input(z.object({ state: z.string().length(2) }))
    .query(async ({ input }) => {
      const counties = await listCountiesByState(input.state);
      return counties;
    }),

  /**
   * Generate county-specific form
   */
  generateForm: publicProcedure
    .input(
      z.object({
        countyId: z.number(),
        tier: z.enum(["poa", "pro-se"]),
      })
    )
    .query(async ({ input }) => {
      const form = await generateCountyForm(input.countyId, input.tier);
      if (!form) throw new Error("Failed to generate form");
      return form;
    }),

  /**
   * Get filing checklist
   */
  getFilingChecklist: publicProcedure
    .input(
      z.object({
        countyId: z.number(),
        tier: z.enum(["poa", "pro-se"]),
      })
    )
    .query(async ({ input }) => {
      const county = await getCountyById(input.countyId);
      if (!county) throw new Error("County not found");
      return generateFilingChecklist(county, input.tier);
    }),

  /**
   * List all high-impact states
   */
  getHighImpactStates: publicProcedure.query(() => {
    return [
      { code: "TX", name: "Texas", taxRate: 2.4 },
      { code: "IL", name: "Illinois", taxRate: 2.2 },
      { code: "NJ", name: "New Jersey", taxRate: 2.1 },
      { code: "CT", name: "Connecticut", taxRate: 2.0 },
      { code: "WI", name: "Wisconsin", taxRate: 1.8 },
      { code: "OH", name: "Ohio", taxRate: 1.5 },
      { code: "PA", name: "Pennsylvania", taxRate: 1.5 },
      { code: "CA", name: "California", taxRate: 0.8 },
      { code: "NY", name: "New York", taxRate: 1.8 },
      { code: "FL", name: "Florida", taxRate: 0.8 },
    ];
  }),

  /**
   * Search counties by name
   */
  searchCounties: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      // This would query the database with LIKE
      // For now, returning mock data
      return [];
    }),
});
