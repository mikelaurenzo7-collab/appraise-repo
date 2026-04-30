/**
 * Comprehensive validation utilities for property appraisal data
 * 
 * This module provides validation functions for all user inputs, property data,
 * and business logic constraints to ensure data quality and prevent errors.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";

// ─── ADDRESS VALIDATION ────────────────────────────────────────────────────

/**
 * Validate a US street address format
 */
export function validateAddress(address: string): { isValid: boolean; error?: string } {
  if (!address || address.trim().length === 0) {
    return { isValid: false, error: "Address cannot be empty" };
  }

  if (address.trim().length < 10) {
    return { isValid: false, error: "Address is too short - please provide a complete street address" };
  }

  if (address.trim().length > 500) {
    return { isValid: false, error: "Address is too long - maximum 500 characters" };
  }

  // Check for minimum components (number, street name, city, state, zip)
  const hasNumber = /\d+/.test(address);
  const hasLetters = /[a-zA-Z]{3,}/.test(address);
  
  if (!hasNumber || !hasLetters) {
    return { isValid: false, error: "Address must include a street number and street name" };
  }

  // Check for suspicious patterns (SQL injection, XSS attempts)
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /\b(select|union|insert|update|delete|drop)\b.*\b(from|table|database)\b/i,
    /['";].*(-{2}|\/\*)/,  // SQL comment patterns
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(address)) {
      return { isValid: false, error: "Address contains invalid characters" };
    }
  }

  return { isValid: true };
}

/**
 * Validate US state code (2-letter abbreviation)
 */
export function validateStateCode(state: string): { isValid: boolean; error?: string } {
  const validStates = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
  ];

  const stateUpper = state?.toUpperCase().trim();

  if (!stateUpper || stateUpper.length !== 2) {
    return { isValid: false, error: "State code must be exactly 2 letters" };
  }

  if (!validStates.includes(stateUpper)) {
    return { isValid: false, error: `Invalid state code: ${stateUpper}` };
  }

  return { isValid: true };
}

/**
 * Validate US ZIP code (5 digits or 5+4 format)
 */
export function validateZipCode(zip: string): { isValid: boolean; error?: string } {
  if (!zip || zip.trim().length === 0) {
    return { isValid: false, error: "ZIP code is required" };
  }

  const cleanZip = zip.trim();

  // Allow 5-digit or 9-digit (with hyphen) formats
  const zipPattern = /^\d{5}(-\d{4})?$/;

  if (!zipPattern.test(cleanZip)) {
    return { isValid: false, error: "ZIP code must be 5 digits (e.g., 12345) or 9 digits (e.g., 12345-6789)" };
  }

  return { isValid: true };
}

// ─── PROPERTY VALUE VALIDATION ─────────────────────────────────────────────

/**
 * Validate property assessment value
 */
export function validateAssessedValue(value: number): { isValid: boolean; error?: string } {
  if (typeof value !== "number" || isNaN(value)) {
    return { isValid: false, error: "Assessed value must be a valid number" };
  }

  if (value < 1000) {
    return { isValid: false, error: "Assessed value must be at least $1,000" };
  }

  if (value > 1000000000) {
    return { isValid: false, error: "Assessed value cannot exceed $1 billion" };
  }

  if (!Number.isInteger(value)) {
    return { isValid: false, error: "Assessed value must be a whole dollar amount" };
  }

  return { isValid: true };
}

/**
 * Validate market value estimate
 */
export function validateMarketValue(marketValue: number, assessedValue?: number): { isValid: boolean; error?: string } {
  const assessedCheck = validateAssessedValue(marketValue);
  if (!assessedCheck.isValid) {
    return { isValid: false, error: assessedCheck.error?.replace("Assessed", "Market") };
  }

  // If both values provided, ensure they're reasonably related
  if (assessedValue && marketValue && assessedValue > 0) {
    const ratio = marketValue / assessedValue;
    // Ratio should be between 0.1 and 5 (5x difference either way)
    if (ratio < 0.1 || ratio > 5.0) {
      return {
        isValid: false,
        error: "Market value and assessed value appear inconsistent - please verify both values are correct",
      };
    }
  }

  return { isValid: true };
}

// ─── PROPERTY CHARACTERISTICS VALIDATION ───────────────────────────────────

/**
 * Validate square footage
 */
export function validateSquareFeet(sqft: number): { isValid: boolean; error?: string } {
  if (typeof sqft !== "number" || isNaN(sqft)) {
    return { isValid: false, error: "Square footage must be a valid number" };
  }

  if (sqft < 100) {
    return { isValid: false, error: "Square footage must be at least 100 square feet" };
  }

  if (sqft > 1000000) {
    return { isValid: false, error: "Square footage cannot exceed 1,000,000 square feet" };
  }

  if (!Number.isInteger(sqft)) {
    return { isValid: false, error: "Square footage must be a whole number" };
  }

  return { isValid: true };
}

/**
 * Validate bedrooms
 */
export function validateBedrooms(bedrooms: number): { isValid: boolean; error?: string } {
  if (typeof bedrooms !== "number" || isNaN(bedrooms)) {
    return { isValid: false, error: "Bedrooms must be a valid number" };
  }

  if (!Number.isInteger(bedrooms)) {
    return { isValid: false, error: "Bedrooms must be a whole number" };
  }

  if (bedrooms < 0) {
    return { isValid: false, error: "Bedrooms cannot be negative" };
  }

  if (bedrooms > 50) {
    return { isValid: false, error: "Bedrooms cannot exceed 50 (if you have a very large property, please contact support)" };
  }

  return { isValid: true };
}

/**
 * Validate bathrooms
 */
export function validateBathrooms(bathrooms: number): { isValid: boolean; error?: string } {
  if (typeof bathrooms !== "number" || isNaN(bathrooms)) {
    return { isValid: false, error: "Bathrooms must be a valid number" };
  }

  if (bathrooms < 0) {
    return { isValid: false, error: "Bathrooms cannot be negative" };
  }

  if (bathrooms > 50) {
    return { isValid: false, error: "Bathrooms cannot exceed 50 (if you have a very large property, please contact support)" };
  }

  // Allow half baths (0.5 increments)
  const multiplied = Math.round(bathrooms * 2);
  if (multiplied !== bathrooms * 2) {
    return { isValid: false, error: "Bathrooms must be whole numbers or half increments (e.g., 2.5)" };
  }

  return { isValid: true };
}

/**
 * Validate lot size in acres
 */
export function validateLotSize(acres: number): { isValid: boolean; error?: string } {
  if (typeof acres !== "number" || isNaN(acres)) {
    return { isValid: false, error: "Lot size must be a valid number" };
  }

  if (acres < 0.001) {
    return { isValid: false, error: "Lot size must be at least 0.001 acres (43.5 square feet)" };
  }

  if (acres > 100000) {
    return { isValid: false, error: "Lot size cannot exceed 100,000 acres (if you have a very large parcel, please contact support)" };
  }

  return { isValid: true };
}

/**
 * Validate year built
 */
export function validateYearBuilt(year: number): { isValid: boolean; error?: string } {
  if (typeof year !== "number" || isNaN(year)) {
    return { isValid: false, error: "Year built must be a valid number" };
  }

  if (!Number.isInteger(year)) {
    return { isValid: false, error: "Year built must be a whole number" };
  }

  const currentYear = new Date().getFullYear();

  if (year < 1600) {
    return { isValid: false, error: "Year built cannot be before 1600" };
  }

  if (year > currentYear + 5) {
    return { isValid: false, error: `Year built cannot be more than 5 years in the future (current year: ${currentYear})` };
  }

  return { isValid: true };
}

// ─── EMAIL VALIDATION ──────────────────────────────────────────────────────

/**
 * Validate email address format
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: "Email address is required" };
  }

  const cleanEmail = email.trim().toLowerCase();

  if (cleanEmail.length > 254) {
    return { isValid: false, error: "Email address is too long (maximum 254 characters)" };
  }

  // RFC 5322 compliant email regex (simplified)
  const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailPattern.test(cleanEmail)) {
    return { isValid: false, error: "Email address format is invalid" };
  }

  // Check for common disposable email domains (optional - can expand this list)
  const disposableDomains = ["tempmail.com", "10minutemail.com", "guerrillamail.com"];
  const domain = cleanEmail.split("@")[1];
  if (disposableDomains.includes(domain)) {
    return { isValid: false, error: "Please use a permanent email address (disposable email addresses are not allowed)" };
  }

  return { isValid: true };
}

// ─── PHONE NUMBER VALIDATION ───────────────────────────────────────────────

/**
 * Validate US phone number
 */
export function validatePhoneNumber(phone: string): { isValid: boolean; error?: string } {
  if (!phone || phone.trim().length === 0) {
    return { isValid: false, error: "Phone number is required" };
  }

  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, "");

  // US phone numbers should be 10 or 11 digits (with or without country code)
  if (digitsOnly.length < 10) {
    return { isValid: false, error: "Phone number must have at least 10 digits" };
  }

  if (digitsOnly.length > 11) {
    return { isValid: false, error: "Phone number has too many digits (maximum 11 with country code)" };
  }

  // If 11 digits, first digit should be 1 (US country code)
  if (digitsOnly.length === 11 && digitsOnly[0] !== "1") {
    return { isValid: false, error: "11-digit phone numbers must start with country code 1" };
  }

  // Check for obviously invalid patterns (all same digit, sequential digits)
  if (/^(\d)\1{9,}$/.test(digitsOnly)) {
    return { isValid: false, error: "Phone number appears to be invalid (all digits are the same)" };
  }

  return { isValid: true };
}

// ─── BUSINESS LOGIC VALIDATION ─────────────────────────────────────────────

/**
 * Validate appeal viability based on assessment gap
 */
export function validateAppealViability(
  assessedValue: number,
  marketValue: number,
  minDollarGap: number = 3000,
  minPercentGap: number = 2
): { isViable: boolean; reason?: string; dollarGap: number; percentGap: number } {
  const dollarGap = assessedValue - marketValue;
  const percentGap = ((assessedValue - marketValue) / assessedValue) * 100;

  if (dollarGap < 0) {
    return {
      isViable: false,
      reason: "Market value exceeds assessed value - no appeal recommended",
      dollarGap,
      percentGap,
    };
  }

  if (dollarGap < minDollarGap && percentGap < minPercentGap) {
    return {
      isViable: false,
      reason: `Gap is too small for appeal (minimum: $${minDollarGap.toLocaleString()} or ${minPercentGap}%)`,
      dollarGap,
      percentGap,
    };
  }

  return { isViable: true, dollarGap, percentGap };
}

/**
 * Throw a user-friendly TRPCError with proper formatting
 */
export function throwValidationError(message: string, field?: string): never {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: field ? `${field}: ${message}` : message,
  });
}

/**
 * Validate all required fields are present and non-empty
 */
export function validateRequiredFields<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): { isValid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    const value = data[field];
    if (value === undefined || value === null || (typeof value === "string" && value.trim().length === 0)) {
      missingFields.push(String(field));
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

// ─── COMPOSITE VALIDATION ──────────────────────────────────────────────────

/**
 * Validate complete property submission data
 */
export function validatePropertySubmission(data: {
  address: string;
  city: string;
  state: string;
  zip: string;
  assessedValue: number;
  estimatedMarketValue?: number;
  squareFeet?: number;
  bedrooms?: number;
  bathrooms?: number;
  yearBuilt?: number;
  lotSize?: number;
  ownerEmail?: string;
  ownerPhone?: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  const addressCheck = validateAddress(data.address);
  if (!addressCheck.isValid) errors.push(addressCheck.error!);

  if (!data.city || data.city.trim().length === 0) {
    errors.push("City is required");
  }

  const stateCheck = validateStateCode(data.state);
  if (!stateCheck.isValid) errors.push(stateCheck.error!);

  const zipCheck = validateZipCode(data.zip);
  if (!zipCheck.isValid) errors.push(zipCheck.error!);

  const assessedCheck = validateAssessedValue(data.assessedValue);
  if (!assessedCheck.isValid) errors.push(assessedCheck.error!);

  // Optional fields
  if (data.estimatedMarketValue) {
    const marketCheck = validateMarketValue(data.estimatedMarketValue, data.assessedValue);
    if (!marketCheck.isValid) errors.push(marketCheck.error!);
  }

  if (data.squareFeet) {
    const sqftCheck = validateSquareFeet(data.squareFeet);
    if (!sqftCheck.isValid) errors.push(sqftCheck.error!);
  }

  if (data.bedrooms !== undefined) {
    const bedroomsCheck = validateBedrooms(data.bedrooms);
    if (!bedroomsCheck.isValid) errors.push(bedroomsCheck.error!);
  }

  if (data.bathrooms !== undefined) {
    const bathroomsCheck = validateBathrooms(data.bathrooms);
    if (!bathroomsCheck.isValid) errors.push(bathroomsCheck.error!);
  }

  if (data.yearBuilt) {
    const yearCheck = validateYearBuilt(data.yearBuilt);
    if (!yearCheck.isValid) errors.push(yearCheck.error!);
  }

  if (data.lotSize) {
    const lotCheck = validateLotSize(data.lotSize);
    if (!lotCheck.isValid) errors.push(lotCheck.error!);
  }

  if (data.ownerEmail) {
    const emailCheck = validateEmail(data.ownerEmail);
    if (!emailCheck.isValid) errors.push(emailCheck.error!);
  }

  if (data.ownerPhone) {
    const phoneCheck = validatePhoneNumber(data.ownerPhone);
    if (!phoneCheck.isValid) errors.push(phoneCheck.error!);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
