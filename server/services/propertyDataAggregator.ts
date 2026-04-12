import axios from "axios";

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
  similarity: number; // 0-100
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

/**
 * Query Lightbox API for property records and assessments
 */
async function queryLightbox(address: string, city: string, state: string): Promise<Partial<PropertyData>> {
  try {
    if (!process.env.LIGHTBOX_API_KEY) {
      console.warn("[Lightbox] API key not configured");
      return {};
    }

    // Lightbox API endpoint for property search
    const response = await axios.get("https://api.lightboxre.com/v1/properties/search", {
      params: {
        address,
        city,
        state,
      },
      headers: {
        Authorization: `Bearer ${process.env.LIGHTBOX_API_KEY}`,
      },
      timeout: 5000,
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
    console.error("[Lightbox] Error querying property data:", error);
    return {};
  }
}

/**
 * Query RentCast API for rental comps and market data
 */
async function queryRentCast(address: string, city: string, state: string): Promise<Partial<PropertyData>> {
  try {
    if (!process.env.RENTCAST_API_KEY) {
      console.warn("[RentCast] API key not configured");
      return {};
    }

    const response = await axios.get("https://api.rentcast.io/v1/properties/search", {
      params: {
        address,
        city,
        state,
      },
      headers: {
        "X-API-Key": process.env.RENTCAST_API_KEY,
      },
      timeout: 5000,
    });

    const property = response.data?.data?.[0];
    if (!property) return {};

    // Extract rental comps
    const rentalComps: RentalComp[] = property.comparable_rentals?.map((comp: any) => ({
      address: comp.address,
      monthlyRent: comp.monthly_rent,
      bedrooms: comp.bedrooms,
      bathrooms: comp.bathrooms,
      squareFeet: comp.sqft,
      source: "rentcast" as const,
    })) || [];

    return {
      marketValue: property.estimated_value,
      rentalComps,
      source: "rentcast",
    };
  } catch (error) {
    console.error("[RentCast] Error querying rental data:", error);
    return {};
  }
}

/**
 * Query ReGRID API for parcel and tax data
 */
async function queryReGRID(address: string, city: string, state: string): Promise<Partial<PropertyData>> {
  try {
    if (!process.env.REGRID_API_KEY) {
      console.warn("[ReGRID] API key not configured");
      return {};
    }

    const response = await axios.get("https://api.regrid.com/api/v2/parcels", {
      params: {
        address,
        city,
        state,
        token: process.env.REGRID_API_KEY,
      },
      timeout: 5000,
    });

    const parcel = response.data?.features?.[0]?.properties;
    if (!parcel) return {};

    return {
      parcelNumber: parcel.parcel_number,
      county: parcel.county_name,
      zoning: parcel.zoning,
      lotSize: parcel.lot_area,
      source: "regrid",
    };
  } catch (error) {
    console.error("[ReGRID] Error querying parcel data:", error);
    return {};
  }
}

/**
 * Query AttomData API for comprehensive property and real estate data
 */
async function queryAttomData(address: string, city: string, state: string): Promise<Partial<PropertyData>> {
  try {
    const attomKey = process.env.ATTOM_API_KEY || process.env.ATTTOM_API_KEY;
    if (!attomKey) {
      console.warn("[AttomData] API key not configured");
      return {};
    }

    // Attom API uses address2 = "city, state" format and apikey in header
    const address2 = [city, state].filter(Boolean).join(", ");
    const response = await axios.get("https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/detail", {
      params: {
        address1: address,
        address2,
      },
      headers: {
        accept: "application/json",
        apikey: attomKey,
      },
      timeout: 8000,
    });

    const property = response.data?.property?.[0];
    if (!property) {
      console.warn("[AttomData] No property found for address");
      return {};
    }

    // Map Attom API response fields (v1.0.0 structure)
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
    console.error("[AttomData] Error querying property data:", error);
    return {};
  }
}

/**
 * Aggregate data from all property APIs
 * Queries in parallel and merges results intelligently
 */
export async function aggregatePropertyData(address: string, city: string, state: string): Promise<PropertyData> {
  try {
    // Query all APIs in parallel
    const [lightboxData, rentcastData, regrindData, attomData] = await Promise.all([
      queryLightbox(address, city, state),
      queryRentCast(address, city, state),
      queryReGRID(address, city, state),
      queryAttomData(address, city, state),
    ]);

    // Merge results with priority: Lightbox > RentCast > ReGRID > AttomData
    const merged: PropertyData = {
      address,
      city,
      state,
      source: "aggregated",

      // Use first available value (priority order)
      assessedValue: lightboxData.assessedValue || attomData.assessedValue,
      marketValue: rentcastData.marketValue || lightboxData.lastSalePrice,
      squareFeet: lightboxData.squareFeet || attomData.squareFeet,
      lotSize: lightboxData.lotSize || regrindData.lotSize,
      yearBuilt: lightboxData.yearBuilt || attomData.yearBuilt,
      bedrooms: lightboxData.bedrooms || attomData.bedrooms,
      bathrooms: lightboxData.bathrooms || attomData.bathrooms,
      county: lightboxData.county || regrindData.county || attomData.county,
      parcelNumber: lightboxData.parcelNumber || regrindData.parcelNumber,
      zoning: lightboxData.zoning || regrindData.zoning,
      lastSalePrice: lightboxData.lastSalePrice,
      lastSaleDate: lightboxData.lastSaleDate,

      // Combine arrays
      comparableSales: lightboxData.comparableSales || [],
      rentalComps: rentcastData.rentalComps || [],
    };

    return merged;
  } catch (error) {
    console.error("[PropertyDataAggregator] Error aggregating data:", error);
    return {
      address,
      city,
      state,
      source: "error",
    };
  }
}
