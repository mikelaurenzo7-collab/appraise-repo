/**
 * Property Data Aggregator
 * ────────────────────────────────────────────────────────────────────────────
 * Each API is PRIMARY for its domain — not a fallback:
 *
 *   RentCast  → Tax assessments, property characteristics, AVM, sale history
 *   Realie   → Parcel boundaries, zoning, GIS-measured lot size, parcel number ($50/mo)
 *   Redfin   → Recent comparable sold properties with photos, DOM, price data
 *   ATTOM    → (Future) Foreclosure, climate risk, crime, school data
 *
 * Lightbox has been fully removed (persistent 401/500 errors, key deleted).
 * ATTOM gracefully skips when key is absent — ready for re-activation.
 * ────────────────────────────────────────────────────────────────────────────
 */

import axios from "axios";
import { getCachedApiResponse, setCachedApiResponse } from "../db";

export interface PropertyData {
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  assessedValue?: number;
  marketValue?: number;
  squareFeet?: number;
  lotSize?: number;
  yearBuilt?: number;
  bedrooms?: number;
  bathrooms?: number;
  county?: string;
  parcelNumber?: string;
  zoning?: string;
  lastSalePrice?: number;
  lastSaleDate?: string;
  propertyTax?: number;
  comparableSales?: ComparableSale[];
  rentalComps?: RentalComp[];
  /** Redfin region ID for the city — cached for subsequent queries */
  redfinRegionId?: string;
  source: string;
}

export interface ComparableSale {
  address: string;
  salePrice: number;
  saleDate: string;
  squareFeet: number;
  bedrooms?: number;
  bathrooms?: number;
  yearBuilt?: number;
  lotSize?: number;
  daysOnMarket?: number;
  latitude?: number;
  longitude?: number;
  photoUrl?: string;
  similarity: number;
  source: "mls" | "rentcast" | "attom" | "redfin";
}

export interface RentalComp {
  address: string;
  monthlyRent: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  source: "rentcast";
}

// ─── CACHE HELPERS ──────────────────────────────────────────────────────────

function makeCacheKey(source: string, address: string, city: string, state: string) {
  return `${source}:${address.toLowerCase().replace(/\s+/g, "_")}:${city.toLowerCase()}:${state.toLowerCase()}`;
}

async function withCache<T>(
  source: string,
  address: string,
  city: string,
  state: string,
  fetcher: () => Promise<T>,
  ttlSeconds = 86400
): Promise<T> {
  const key = makeCacheKey(source, address, city, state);
  const cached = await getCachedApiResponse(key);
  if (cached) {
    console.log(`[Cache] HIT for ${source} — ${address}`);
    return cached as T;
  }
  const data = await fetcher();
  await setCachedApiResponse(key, source, data, ttlSeconds);
  return data;
}

// ─── RENTCAST ───────────────────────────────────────────────────────────────
// PRIMARY for: Tax assessments, property characteristics, AVM, sale history
// Returns an ARRAY of properties. We take the first match.

async function queryRentCast(address: string, city: string, state: string): Promise<Partial<PropertyData>> {
  return withCache("rentcast", address, city, state, async () => {
    try {
      if (!process.env.RENTCAST_API_KEY) { console.warn("[RentCast] API key not configured"); return {}; }
      const response = await axios.get("https://api.rentcast.io/v1/properties", {
        params: { address: `${address}, ${city}, ${state}` },
        headers: { "X-Api-Key": process.env.RENTCAST_API_KEY },
        timeout: 8000,
      });

      // RentCast returns an array — take the first match
      const raw = response.data;
      const data = Array.isArray(raw) ? raw[0] : raw;
      if (!data) return {};

      console.log(`[RentCast] Got data for ${data.formattedAddress || address}`);

      // Extract the latest tax assessment (highest year)
      let assessedValue: number | undefined;
      let propertyTax: number | undefined;
      if (data.taxAssessments && typeof data.taxAssessments === "object") {
        const years = Object.keys(data.taxAssessments).sort().reverse();
        if (years.length > 0) {
          const latest = data.taxAssessments[years[0]];
          assessedValue = latest?.value;
        }
      }
      if (data.propertyTaxes && typeof data.propertyTaxes === "object") {
        const years = Object.keys(data.propertyTaxes).sort().reverse();
        if (years.length > 0) {
          propertyTax = data.propertyTaxes[years[0]]?.total;
        }
      }

      // Extract comparable sales from history if available
      const comps: ComparableSale[] = (data.comparables || []).slice(0, 5).map((c: any) => ({
        address: c.formattedAddress || c.address,
        salePrice: c.price || c.lastSalePrice,
        saleDate: c.lastSaleDate,
        squareFeet: c.squareFootage,
        bedrooms: c.bedrooms,
        bathrooms: c.bathrooms,
        yearBuilt: c.yearBuilt,
        similarity: c.correlation ? Math.round(c.correlation * 100) : 75,
        source: "rentcast" as const,
      }));

      return {
        assessedValue,
        propertyTax,
        marketValue: data.price || data.priceRangeLow,
        squareFeet: data.squareFootage,
        lotSize: data.lotSize,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        yearBuilt: data.yearBuilt,
        county: data.county,
        parcelNumber: data.assessorID,
        zipCode: data.zipCode,
        lastSalePrice: data.lastSalePrice,
        lastSaleDate: data.lastSaleDate,
        comparableSales: comps,
        source: "rentcast",
      };
    } catch (error) {
      console.error("[RentCast] Error:", (error as any)?.response?.status ?? error);
      return {};
    }
  });
}

// ─── REALIE ─────────────────────────────────────────────────────────────────
// PRIMARY for: Parcel boundaries, zoning, GIS-measured lot size, parcel number
// Replaces ReGRID ($375/mo) at $50/mo with equivalent parcel/GIS data
async function queryRealie(address: string, city: string, state: string): Promise<Partial<PropertyData>> {
  return withCache("realie", address, city, state, async () => {
    try {
      const apiKey = process.env.REALIE_API_KEY;
      if (!apiKey) { console.warn("[Realie] API key not configured"); return {}; }
      // Strip directional prefixes and suffixes for better matching
      // Realie works best with just the street number and name
      const streetOnly = address.replace(/^(\d+\s+)(N|S|E|W|NE|NW|SE|SW)\s+/i, '$1').trim();
      const response = await axios.get("https://app.realie.ai/api/public/property/search/", {
        params: {
          address: streetOnly,
          city,
          state,
          limit: 3,
          residential: true,
        },
        headers: { Authorization: apiKey },
        timeout: 10000,
      });
      const properties = response.data?.properties;
      if (!properties || properties.length === 0) {
        // Fallback: try without city filter (broader search)
        const fallback = await axios.get("https://app.realie.ai/api/public/property/search/", {
          params: { address: streetOnly, state, limit: 3 },
          headers: { Authorization: apiKey },
          timeout: 10000,
        });
        const fbProps = fallback.data?.properties;
        if (!fbProps || fbProps.length === 0) {
          console.warn(`[Realie] No parcel data found for ${address}, ${city}, ${state}`);
          return {};
        }
        const p = fbProps[0];
        return mapRealieProperty(p, address);
      }
      const p = properties[0];
      return mapRealieProperty(p, address);
    } catch (error) {
      console.error("[Realie] Error:", (error as any)?.response?.status ?? error);
      return {};
    }
  });
}
function mapRealieProperty(p: any, address: string): Partial<PropertyData> {
  console.log(`[Realie] Got parcel data for ${address} — parcel: ${p.parcelId}, county: ${p.county}`);
  // Convert acres to sqft for lot size (1 acre = 43,560 sqft)
  const lotSize = p.acres ? Math.round(p.acres * 43560) : (p.landArea || undefined);
  // Realie provides assessed value directly
  const assessedValue = p.totalAssessedValue || undefined;
  // Realie provides AVM (model value)
  const marketValue = p.modelValue || p.totalMarketValue || undefined;
  return {
    assessedValue,
    marketValue,
    squareFeet: p.buildingArea || undefined,
    lotSize,
    yearBuilt: p.yearBuilt || undefined,
    bedrooms: p.totalBedrooms || undefined,
    bathrooms: p.totalBathrooms || undefined,
    county: p.county || p.countyUSPS || undefined,
    parcelNumber: p.parcelId || undefined,
    zoning: p.zoningCode || undefined,
    lastSalePrice: p.transferPrice || undefined,
    lastSaleDate: p.transferDate ? String(p.transferDate) : undefined,
    propertyTax: p.taxValue || undefined,
    source: "realie",
  };
}

// ─── REDFIN ─────────────────────────────────────────────────────────────────
// PRIMARY for: Recent comparable sold properties with photos, DOM, price data
// Two-step flow: (1) auto-complete to get regionId, (2) search-sold with regionId

const REDFIN_RAPIDAPI_HOST = "redfin-com-data.p.rapidapi.com";

async function getRedfinRegionId(city: string, state: string): Promise<string | null> {
  const cacheKey = `redfin_region:${city.toLowerCase()}:${state.toLowerCase()}`;
  try {
    const cached = await getCachedApiResponse(cacheKey);
    if (cached && typeof cached === "string") return cached;
  } catch { /* proceed without cache */ }

  try {
    const apiKey = process.env.REDFIN_RAPIDAPI_KEY;
    if (!apiKey) { console.warn("[Redfin] API key not configured"); return null; }

    const response = await axios.get(`https://${REDFIN_RAPIDAPI_HOST}/properties/auto-complete`, {
      params: { query: `${city} ${state}` },
      headers: {
        "x-rapidapi-host": REDFIN_RAPIDAPI_HOST,
        "x-rapidapi-key": apiKey,
        "Content-Type": "application/json",
      },
      timeout: 8000,
    });

     const rawData = response.data?.data;
    if (!rawData) return null;
    // API returns either:
    //   (a) flat array of result objects (old format)
    //   (b) array of category groups, each with a `rows` array (new format)
    // Flatten both formats into a single list of result items
    let items: any[] = [];
    if (Array.isArray(rawData)) {
      for (const entry of rawData) {
        if (Array.isArray(entry?.rows)) {
          items.push(...entry.rows); // new grouped format
        } else if (entry?.id !== undefined) {
          items.push(entry); // old flat format
        }
      }
    }
    if (items.length === 0) return null;
    // Find the city-level result (type "2" = city in Redfin's taxonomy)
    // The id format is like "6_29501" — we need this exact format
    const cityResult = items.find((r: any) =>
      r.type === "2" || r.type === 2 || r.subType === "city" ||
      (r.name && r.name.toLowerCase() === city.toLowerCase())
    );
    if (cityResult?.id) {
      const regionId = String(cityResult.id);
      console.log(`[Redfin] Region ID for ${city}, ${state}: ${regionId}`);
      // Cache the region ID for 30 days
      try { await setCachedApiResponse(cacheKey, "redfin", regionId, 2592000); } catch { /* non-critical */ }
      return regionId;
    }
    // Fallback: take the first result that has an id with the 6_ prefix (city IDs)
    const fallback = items.find((r: any) => String(r.id || "").startsWith("6_"));
    if (fallback?.id) {
      const regionId = String(fallback.id);
      console.log(`[Redfin] Region ID (fallback) for ${city}, ${state}: ${regionId}`);
      try { await setCachedApiResponse(cacheKey, "redfin", regionId, 2592000); } catch { /* non-critical */ }
      return regionId;
    }
    console.warn(`[Redfin] No region ID found for ${city}, ${state}. Items found: ${items.map((r: any) => `${r.name}(${r.id})`).join(', ')}`);
    return null;
  } catch (error) {
    console.error("[Redfin] Auto-complete error:", (error as any)?.response?.status ?? error);
    return null;
  }
}

async function queryRedfin(
  address: string,
  city: string,
  state: string,
  subjectData?: { bedrooms?: number; bathrooms?: number; squareFeet?: number; yearBuilt?: number }
): Promise<{ comparableSales: ComparableSale[]; redfinRegionId?: string }> {
  return withCache("redfin", address, city, state, async () => {
    try {
      const apiKey = process.env.REDFIN_RAPIDAPI_KEY;
      if (!apiKey) { console.warn("[Redfin] API key not configured"); return { comparableSales: [] }; }

      // Step 1: Get the region ID for this city
      const regionId = await getRedfinRegionId(city, state);
      if (!regionId) return { comparableSales: [] };

      // Step 2: Search for recently sold properties in this region
      const response = await axios.get(`https://${REDFIN_RAPIDAPI_HOST}/properties/search-sold`, {
        params: {
          regionId,
          soldWithin: 90, // Last 90 days for broader comp pool
        },
        headers: {
          "x-rapidapi-host": REDFIN_RAPIDAPI_HOST,
          "x-rapidapi-key": apiKey,
          "Content-Type": "application/json",
        },
        timeout: 15000, // Larger response, give more time
      });

      const homes = response.data?.data;
      if (!homes || !Array.isArray(homes)) {
        console.warn("[Redfin] No sold properties returned");
        return { comparableSales: [], redfinRegionId: regionId };
      }

      console.log(`[Redfin] Got ${homes.length} recently sold properties in ${city}, ${state}`);

      // Parse each sold property into our ComparableSale format
      const allComps: ComparableSale[] = homes
        .map((item: any) => {
          const hd = item?.homeData;
          if (!hd) return null;

          const price = Number(hd.priceInfo?.amount);
          const sqft = Number(hd.sqftInfo?.amount);
          const beds = hd.beds;
          const baths = hd.baths;
          const yb = hd.yearBuilt?.yearBuilt;
          const lot = hd.lotSize?.amount ? Number(hd.lotSize.amount) : undefined;
          const addr = hd.addressInfo;
          const sashes = hd.sashes || [];
          const lastSold = hd.lastSaleData?.lastSoldDate;

          // Extract sale date from sashes or lastSaleData
          let saleDate = "";
          const soldSash = sashes.find((s: any) => s.sashTypeName === "Sold");
          if (soldSash?.lastSaleDate) {
            saleDate = soldSash.lastSaleDate;
          } else if (lastSold) {
            saleDate = new Date(lastSold).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          }

          // Calculate days on market
          let dom: number | undefined;
          if (hd.daysOnMarket?.listingAddedDate && lastSold) {
            const listed = new Date(hd.daysOnMarket.listingAddedDate).getTime();
            const sold = new Date(lastSold).getTime();
            dom = Math.max(0, Math.round((sold - listed) / 86400000));
          }

          // Build full address
          const fullAddress = addr
            ? `${addr.formattedStreetLine || ""}, ${addr.city || ""}, ${addr.state || ""} ${addr.zip || ""}`.trim()
            : hd.url?.replace(/^\/[A-Z]{2}\//, "").replace(/\//g, " ").replace(/home\/\d+$/, "").trim() || "Unknown";

          // Get first photo
          const photoUrl = hd.photos?.[0] || hd.bigPhotos?.[0] || undefined;

          if (!price || price <= 0) return null;

          return {
            address: fullAddress,
            salePrice: price,
            saleDate,
            squareFeet: sqft || 0,
            bedrooms: beds,
            bathrooms: baths,
            yearBuilt: yb,
            lotSize: lot,
            daysOnMarket: dom,
            latitude: addr?.centroid?.centroid?.latitude,
            longitude: addr?.centroid?.centroid?.longitude,
            photoUrl,
            similarity: 0, // Will be calculated below
            source: "redfin" as const,
          } as ComparableSale;
        })
        .filter((c: ComparableSale | null): c is ComparableSale => c !== null);

      // Calculate similarity scores based on subject property characteristics
      const scoredComps = allComps.map((comp) => {
        let score = 50; // Base score

        if (subjectData?.bedrooms && comp.bedrooms) {
          const bedDiff = Math.abs(subjectData.bedrooms - comp.bedrooms);
          score += bedDiff === 0 ? 15 : bedDiff === 1 ? 8 : 0;
        }
        if (subjectData?.bathrooms && comp.bathrooms) {
          const bathDiff = Math.abs(subjectData.bathrooms - comp.bathrooms);
          score += bathDiff === 0 ? 10 : bathDiff <= 1 ? 5 : 0;
        }
        if (subjectData?.squareFeet && comp.squareFeet) {
          const sqftRatio = comp.squareFeet / subjectData.squareFeet;
          if (sqftRatio >= 0.85 && sqftRatio <= 1.15) score += 15;
          else if (sqftRatio >= 0.7 && sqftRatio <= 1.3) score += 8;
        }
        if (subjectData?.yearBuilt && comp.yearBuilt) {
          const ageDiff = Math.abs(subjectData.yearBuilt - comp.yearBuilt);
          score += ageDiff <= 5 ? 10 : ageDiff <= 15 ? 5 : 0;
        }

        return { ...comp, similarity: Math.min(100, score) };
      });

      // Sort by similarity (highest first), then take top 20 for analysis
      scoredComps.sort((a, b) => b.similarity - a.similarity);
      const topComps = scoredComps.slice(0, 20);

      console.log(`[Redfin] Scored ${allComps.length} comps, top 20 selected (best similarity: ${topComps[0]?.similarity || 0})`);

      return { comparableSales: topComps, redfinRegionId: regionId };
    } catch (error) {
      console.error("[Redfin] Error:", (error as any)?.response?.status ?? error);
      return { comparableSales: [] };
    }
  });
}

// ─── ATTOM (FUTURE) ─────────────────────────────────────────────────────────
// Will provide: Foreclosure data, climate risk, crime stats, school data
// Currently gracefully skips when key is absent — ready for re-activation

async function queryAttomData(address: string, city: string, state: string): Promise<Partial<PropertyData>> {
  return withCache("attom", address, city, state, async () => {
    try {
      if (!process.env.ATTOM_API_KEY) {
        // Graceful skip — ATTOM key not yet configured
        return {};
      }
      const response = await axios.get("https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/detail", {
        params: { address1: address, address2: `${city}, ${state}` },
        headers: { apikey: process.env.ATTOM_API_KEY, Accept: "application/json" },
        timeout: 8000,
      });
      const property = response.data?.property?.[0];
      if (!property) return {};
      const assessment = property.assessment;
      const building = property.building?.size;
      const rooms = property.building?.rooms;
      const addr = property.address;
      console.log(`[AttomData] Got data for ${address}`);
      return {
        assessedValue: assessment?.assessed?.assdttlvalue || assessment?.market?.mktttlvalue,
        yearBuilt: property.summary?.yearbuilt,
        squareFeet: building?.universalsize || building?.livingsize,
        bedrooms: rooms?.beds,
        bathrooms: rooms?.bathsfull,
        county: addr?.county,
        parcelNumber: property.identifier?.apn,
        lastSalePrice: property.sale?.amount?.saleamt,
        lastSaleDate: property.sale?.amount?.saledisclosuretype,
        source: "attom",
      };
    } catch (error) {
      console.error("[AttomData] Error:", (error as any)?.response?.status ?? error);
      return {};
    }
  });
}

// ─── AGGREGATOR ─────────────────────────────────────────────────────────────

export async function aggregatePropertyData(address: string, city: string, state: string): Promise<PropertyData> {
  try {
    // Add 45-second timeout to prevent hanging (Redfin can be slow with large responses)
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("API aggregation timeout after 45s")), 45000)
    );

    // Phase 1: Get core property data from RentCast + Realie + ATTOM in parallel
    const [rentcastData, realieData, attomData] = await Promise.race([
      Promise.all([
        queryRentCast(address, city, state),
        queryRealie(address, city, state),
        queryAttomData(address, city, state),
      ]),
      timeoutPromise,
    ]);
    // Phase 2: Get Redfin comps using subject property characteristics for similarity scoring
    const subjectData = {
      bedrooms: rentcastData.bedrooms || attomData.bedrooms || realieData.bedrooms,
      bathrooms: rentcastData.bathrooms || attomData.bathrooms || realieData.bathrooms,
      squareFeet: rentcastData.squareFeet || attomData.squareFeet || realieData.squareFeet,
      yearBuilt: rentcastData.yearBuilt || attomData.yearBuilt || realieData.yearBuilt,
    };

    let redfinResult: { comparableSales: ComparableSale[]; redfinRegionId?: string } = { comparableSales: [] };
    try {
      redfinResult = await Promise.race([
        queryRedfin(address, city, state, subjectData),
        new Promise<{ comparableSales: ComparableSale[] }>((_, reject) =>
          setTimeout(() => reject(new Error("Redfin timeout")), 20000)
        ),
      ]);
    } catch (err) {
      console.warn("[Aggregator] Redfin query failed or timed out, continuing without Redfin comps:", (err as Error).message);
    }

    // ── Merge comparable sales from all sources ──────────────────────────────
    // Redfin comps are the most detailed (photos, DOM, coordinates)
    // RentCast comps supplement with correlation-based similarity
    // Deduplicate by address similarity
    const redfinComps = redfinResult.comparableSales || [];
    const rentcastComps = rentcastData.comparableSales || [];

    const mergedComps = [...redfinComps]; // Redfin first (richer data)
    const normalizeAddr = (a: string) => a.toLowerCase().replace(/[^a-z0-9]/g, "");

    for (const rc of rentcastComps) {
      const isDupe = mergedComps.some(
        (existing) => normalizeAddr(existing.address).includes(normalizeAddr(rc.address).slice(0, 20)) ||
          normalizeAddr(rc.address).includes(normalizeAddr(existing.address).slice(0, 20))
      );
      if (!isDupe) mergedComps.push(rc);
    }

    // Sort merged comps: highest similarity first
    mergedComps.sort((a, b) => b.similarity - a.similarity);

    // ── Build final merged PropertyData ──────────────────────────────────────
    // Each API is primary for its domain
    const merged: PropertyData = {
      address,
      city,
      state,
      source: "aggregated",

      // Tax assessment: RentCast is primary (real assessor data), ATTOM backup, ReGRID derived
      assessedValue: rentcastData.assessedValue || attomData.assessedValue || realieData.assessedValue,
      propertyTax: rentcastData.propertyTax,

      // Market value: RentCast AVM is primary, then last sale as proxy
      marketValue: rentcastData.marketValue || rentcastData.lastSalePrice || attomData.lastSalePrice,

      // Physical attributes: RentCast primary, ATTOM secondary, Realie for GIS data
      squareFeet: rentcastData.squareFeet || attomData.squareFeet || realieData.squareFeet,
      lotSize: realieData.lotSize || rentcastData.lotSize, // Realie GIS lot size is most accurate
      yearBuilt: rentcastData.yearBuilt || attomData.yearBuilt || realieData.yearBuilt,
      bedrooms: rentcastData.bedrooms || attomData.bedrooms || realieData.bedrooms,
      bathrooms: rentcastData.bathrooms || attomData.bathrooms || realieData.bathrooms,
      // Location & parcel: Realie is primary for parcel/zoning, RentCast for county
      county: rentcastData.county || realieData.county || attomData.county,
      zipCode: rentcastData.zipCode,
      parcelNumber: realieData.parcelNumber || rentcastData.parcelNumber || attomData.parcelNumber,
      zoning: realieData.zoning, // Realie is the authoritative source for zoning

      // Sale history: RentCast primary, ATTOM secondary
      lastSalePrice: rentcastData.lastSalePrice || attomData.lastSalePrice,
      lastSaleDate: rentcastData.lastSaleDate || attomData.lastSaleDate,

      // Comparable sales: merged from Redfin (primary) + RentCast (supplementary)
      comparableSales: mergedComps,
      rentalComps: rentcastData.rentalComps || [],

      // Redfin metadata
      redfinRegionId: redfinResult.redfinRegionId,
    };

    const hasData = merged.assessedValue || merged.marketValue || merged.squareFeet;
    const sources = [
      rentcastData.source ? "RentCast" : null,
      realieData.source ? "Realie" : null,
      redfinComps.length > 0 ? "Redfin" : null,
      attomData.source ? "ATTOM" : null,
    ].filter(Boolean).join(" + ");

    console.log(
      `[Aggregator] Merged data from [${sources}] — assessed: $${merged.assessedValue || "N/A"}, market: $${merged.marketValue || "N/A"}, sqft: ${merged.squareFeet || "N/A"}, tax: $${merged.propertyTax || "N/A"}, lot: ${merged.lotSize || "N/A"}sqft, zoning: ${merged.zoning || "N/A"}, comps: ${merged.comparableSales?.length || 0} (Redfin: ${redfinComps.length}, RentCast: ${rentcastComps.length})${hasData ? "" : " ⚠️ NO DATA FROM ANY API"}`
    );

    return merged;
  } catch (error) {
    console.error("[Aggregator] Error:", error);
    return {
      address,
      city,
      state,
      source: "error",
      assessedValue: undefined,
      marketValue: undefined,
      comparableSales: [],
    };
  }
}
