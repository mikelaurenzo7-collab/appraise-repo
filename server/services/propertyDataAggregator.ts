/**
 * Property Data Aggregator
 * Queries all 4 property data APIs in parallel, merges results intelligently,
 * and uses DB-backed caching to reduce redundant API calls.
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
  comparableSales?: ComparableSale[];
  rentalComps?: RentalComp[];
  source: string;
}

export interface ComparableSale {
  address: string;
  salePrice: number;
  saleDate: string;
  squareFeet: number;
  similarity: number;
  source: "mls" | "lightbox" | "rentcast" | "attom";
}

export interface RentalComp {
  address: string;
  monthlyRent: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  source: "rentcast";
}

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

// ─── LIGHTBOX ────────────────────────────────────────────────────────────────

async function queryLightbox(address: string, city: string, state: string): Promise<Partial<PropertyData>> {
  return withCache("lightbox", address, city, state, async () => {
    try {
      if (!process.env.LIGHTBOX_API_KEY) { console.warn("[Lightbox] API key not configured"); return {}; }
      const response = await axios.get("https://api.lightboxre.com/v1/properties/search", {
        params: { address, city, state },
        headers: { Authorization: `Bearer ${process.env.LIGHTBOX_API_KEY}` },
        timeout: 8000,
      });
      const property = response.data?.data?.[0];
      if (!property) return {};
      return {
        assessedValue: property.assessed_value,
        squareFeet: property.building_sqft,
        lotSize: property.lot_sqft,
        yearBuilt: property.year_built,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        county: property.county_name,
        parcelNumber: property.parcel_number,
        zoning: property.zoning,
        lastSalePrice: property.last_sale_price,
        lastSaleDate: property.last_sale_date,
        source: "lightbox",
      };
    } catch (error) {
      console.error("[Lightbox] Error:", (error as any)?.response?.status ?? error);
      return {};
    }
  });
}

// ─── RENTCAST ────────────────────────────────────────────────────────────────

async function queryRentCast(address: string, city: string, state: string): Promise<Partial<PropertyData>> {
  return withCache("rentcast", address, city, state, async () => {
    try {
      if (!process.env.RENTCAST_API_KEY) { console.warn("[RentCast] API key not configured"); return {}; }
      const response = await axios.get("https://api.rentcast.io/v1/properties", {
        params: { address: `${address}, ${city}, ${state}` },
        headers: { "X-Api-Key": process.env.RENTCAST_API_KEY },
        timeout: 8000,
      });
      const data = response.data;
      if (!data) return {};
      const comps: ComparableSale[] = (data.comparables || []).slice(0, 5).map((c: any) => ({
        address: c.address,
        salePrice: c.price || c.lastSalePrice,
        saleDate: c.lastSaleDate,
        squareFeet: c.squareFootage,
        similarity: c.correlation ? Math.round(c.correlation * 100) : 75,
        source: "rentcast" as const,
      }));
      return {
        marketValue: data.price || data.priceRangeLow,
        squareFeet: data.squareFootage,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        yearBuilt: data.yearBuilt,
        comparableSales: comps,
        source: "rentcast",
      };
    } catch (error) {
      console.error("[RentCast] Error:", (error as any)?.response?.status ?? error);
      return {};
    }
  });
}

// ─── REGRID ──────────────────────────────────────────────────────────────────

async function queryReGRID(address: string, city: string, state: string): Promise<Partial<PropertyData>> {
  return withCache("regrid", address, city, state, async () => {
    try {
      if (!process.env.REGRID_API_KEY) { console.warn("[ReGRID] API key not configured"); return {}; }
      const response = await axios.get("https://app.regrid.com/api/v1/search.json", {
        params: { query: `${address}, ${city}, ${state}`, limit: 1 },
        headers: { token: process.env.REGRID_API_KEY },
        timeout: 8000,
      });
      const parcel = response.data?.results?.[0]?.properties?.fields;
      if (!parcel) return {};
      return {
        assessedValue: parcel.taxtotal ? Math.round(parcel.taxtotal / 0.012) : undefined,
        squareFeet: parcel.sqft,
        lotSize: parcel.ll_gisacre ? Math.round(parcel.ll_gisacre * 43560) : undefined,
        yearBuilt: parcel.yearbuilt,
        county: parcel.county,
        parcelNumber: parcel.parcelnumb,
        zoning: parcel.zoning,
        source: "regrid",
      };
    } catch (error) {
      console.error("[ReGRID] Error:", (error as any)?.response?.status ?? error);
      return {};
    }
  });
}

// ─── ATTOM ───────────────────────────────────────────────────────────────────

async function queryAttomData(address: string, city: string, state: string): Promise<Partial<PropertyData>> {
  return withCache("attom", address, city, state, async () => {
    try {
      if (!process.env.ATTOM_API_KEY) { console.warn("[AttomData] API key not configured"); return {}; }
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

// ─── AGGREGATOR ──────────────────────────────────────────────────────────────

export async function aggregatePropertyData(address: string, city: string, state: string): Promise<PropertyData> {
  try {
    const [lightboxData, rentcastData, regridData, attomData] = await Promise.all([
      queryLightbox(address, city, state),
      queryRentCast(address, city, state),
      queryReGRID(address, city, state),
      queryAttomData(address, city, state),
    ]);

    const merged: PropertyData = {
      address,
      city,
      state,
      source: "aggregated",
      assessedValue: lightboxData.assessedValue || attomData.assessedValue || regridData.assessedValue,
      marketValue: rentcastData.marketValue || lightboxData.lastSalePrice,
      squareFeet: lightboxData.squareFeet || attomData.squareFeet || rentcastData.squareFeet || regridData.squareFeet,
      lotSize: lightboxData.lotSize || regridData.lotSize,
      yearBuilt: lightboxData.yearBuilt || attomData.yearBuilt || rentcastData.yearBuilt || regridData.yearBuilt,
      bedrooms: lightboxData.bedrooms || attomData.bedrooms || rentcastData.bedrooms,
      bathrooms: lightboxData.bathrooms || attomData.bathrooms || rentcastData.bathrooms,
      county: lightboxData.county || attomData.county || regridData.county,
      parcelNumber: lightboxData.parcelNumber || attomData.parcelNumber || regridData.parcelNumber,
      zoning: lightboxData.zoning || regridData.zoning,
      lastSalePrice: lightboxData.lastSalePrice || attomData.lastSalePrice,
      lastSaleDate: lightboxData.lastSaleDate || attomData.lastSaleDate,
      comparableSales: rentcastData.comparableSales || lightboxData.comparableSales || [],
      rentalComps: rentcastData.rentalComps || [],
    };

    return merged;
  } catch (error) {
    console.error("[Aggregator] Error:", error);
    return { address, city, state, source: "error" };
  }
}
