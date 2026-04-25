/**
 * County-specific filing endpoints
 * Handles form generation, county lookup, and filing management
 */
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { lookupCountyInfo } from "../services/serperSearch";
import { z } from "zod";
import { generateCountyForm, generateFilingChecklist } from "../services/formGenerator";
import {
  getCountyById,
  listCountiesByState,
  createFilingTier,
  getCountyEligibility,
  addWaitlistEntry,
  persistActivityLog,
  getDistinctStates,
} from "../db";

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
   * List all states that have seeded counties (dynamic from DB)
   */
  getHighImpactStates: publicProcedure.query(async () => {
    const STATE_NAMES: Record<string, string> = {
      AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
      CO: "Colorado", CT: "Connecticut", DC: "District of Columbia", DE: "Delaware",
      FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
      IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
      ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
      MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
      NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
      NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
      PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
      TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
      WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
    };
    const states = await getDistinctStates();
    return states.map(s => ({
      code: s.code,
      name: STATE_NAMES[s.code] || s.code,
      countyCount: s.count,
    }));
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

  /**
   * Eligibility check — is this county currently serviceable via our
   * Playwright automation? Used by the client before showing the POA
   * filing CTA or the fallback "guided pro se by mail" flow.
   */
  getEligibility: publicProcedure
    .input(z.object({ countyId: z.number() }))
    .query(async ({ input }) => {
      return getCountyEligibility(input.countyId);
    }),

  /**
   * Dynamically look up county deadline and filing info via Serper + LLM.
   * Used when a county is not seeded in the database — gives nationwide coverage.
   */
  lookupDynamic: publicProcedure
    .input(
      z.object({
        countyName: z.string().min(1).max(120),
        state: z.string().length(2),
      })
    )
    .query(async ({ input }) => {
      const info = await lookupCountyInfo(input.countyName, input.state);
      return info;
    }),

  /**
   * Join the waitlist for an unsupported county. Capture happens in the
   * AppealFilingWorkflow ineligibility branch, or from a landing-page
   * form if the user types in a ZIP we don't serve.
   */
  joinWaitlist: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        state: z.string().length(2).optional(),
        countyName: z.string().max(120).optional(),
        submissionId: z.number().optional(),
        notes: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const entry = await addWaitlistEntry({
        email: input.email,
        state: input.state,
        countyName: input.countyName,
        submissionId: input.submissionId,
        notes: input.notes,
      });
      if (!entry) {
        throw new Error("Could not record waitlist entry");
      }
      await persistActivityLog({
        submissionId: input.submissionId,
        type: "waitlist_joined",
        actor: "user",
        description: `Waitlist signup: ${input.email} for ${input.countyName ?? "unknown county"}${
          input.state ? `, ${input.state}` : ""
        }`,
        metadata: JSON.stringify({
          state: input.state,
          county: input.countyName,
        }),
        status: "success",
      });
      return { success: true, id: entry.id };
    }),
});
