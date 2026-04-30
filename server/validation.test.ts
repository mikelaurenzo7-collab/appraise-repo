import { describe, it, expect } from "vitest";
import {
  validateAddress,
  validateStateCode,
  validateZipCode,
  validateAssessedValue,
  validateMarketValue,
  validateSquareFeet,
  validateBedrooms,
  validateBathrooms,
  validateLotSize,
  validateYearBuilt,
  validateEmail,
  validatePhoneNumber,
  validateAppealViability,
  validateRequiredFields,
  validatePropertySubmission,
} from "./_core/validation";

describe("Address Validation", () => {
  it("accepts valid addresses", () => {
    expect(validateAddress("123 Main St, Austin, TX 78701").isValid).toBe(true);
    expect(validateAddress("456 Oak Avenue, Unit 2B, New York, NY 10001").isValid).toBe(true);
  });

  it("rejects empty addresses", () => {
    expect(validateAddress("").isValid).toBe(false);
    expect(validateAddress("   ").isValid).toBe(false);
  });

  it("rejects too-short addresses", () => {
    expect(validateAddress("123 Main").isValid).toBe(false);
  });

  it("rejects addresses without numbers", () => {
    expect(validateAddress("Main Street, Austin").isValid).toBe(false);
  });

  it("rejects addresses with suspicious patterns", () => {
    expect(validateAddress("123 Main <script>alert('xss')</script>").isValid).toBe(false);
    expect(validateAddress("123 Main' OR 1=1 --").isValid).toBe(false);
  });
});

describe("State Code Validation", () => {
  it("accepts all valid US state codes", () => {
    const validStates = ["TX", "CA", "NY", "FL", "DC"];
    validStates.forEach((state) => {
      expect(validateStateCode(state).isValid).toBe(true);
    });
  });

  it("accepts lowercase state codes", () => {
    expect(validateStateCode("tx").isValid).toBe(true);
    expect(validateStateCode("ca").isValid).toBe(true);
  });

  it("rejects invalid state codes", () => {
    expect(validateStateCode("XX").isValid).toBe(false);
    expect(validateStateCode("ABC").isValid).toBe(false);
    expect(validateStateCode("T").isValid).toBe(false);
  });
});

describe("ZIP Code Validation", () => {
  it("accepts 5-digit ZIP codes", () => {
    expect(validateZipCode("78701").isValid).toBe(true);
    expect(validateZipCode("10001").isValid).toBe(true);
  });

  it("accepts 9-digit ZIP codes with hyphen", () => {
    expect(validateZipCode("78701-1234").isValid).toBe(true);
  });

  it("rejects invalid ZIP formats", () => {
    expect(validateZipCode("1234").isValid).toBe(false);
    expect(validateZipCode("ABCDE").isValid).toBe(false);
    expect(validateZipCode("12345-ABC").isValid).toBe(false);
  });
});

describe("Assessed Value Validation", () => {
  it("accepts valid property values", () => {
    expect(validateAssessedValue(100000).isValid).toBe(true);
    expect(validateAssessedValue(500000).isValid).toBe(true);
    expect(validateAssessedValue(1000000).isValid).toBe(true);
  });

  it("rejects values below minimum", () => {
    expect(validateAssessedValue(500).isValid).toBe(false);
  });

  it("rejects values above maximum", () => {
    expect(validateAssessedValue(2000000000).isValid).toBe(false);
  });

  it("rejects non-integer values", () => {
    expect(validateAssessedValue(100000.50).isValid).toBe(false);
  });

  it("rejects non-numeric values", () => {
    expect(validateAssessedValue(NaN).isValid).toBe(false);
  });
});

describe("Market Value Validation", () => {
  it("accepts valid market values", () => {
    expect(validateMarketValue(450000, 500000).isValid).toBe(true);
  });

  it("warns when market/assessed ratio is suspicious", () => {
    expect(validateMarketValue(10000, 500000).isValid).toBe(false);
    expect(validateMarketValue(5000000, 500000).isValid).toBe(false);
  });
});

describe("Square Footage Validation", () => {
  it("accepts reasonable square footage", () => {
    expect(validateSquareFeet(1500).isValid).toBe(true);
    expect(validateSquareFeet(3000).isValid).toBe(true);
  });

  it("rejects too-small values", () => {
    expect(validateSquareFeet(50).isValid).toBe(false);
  });

  it("rejects too-large values", () => {
    expect(validateSquareFeet(2000000).isValid).toBe(false);
  });

  it("rejects non-integer values", () => {
    expect(validateSquareFeet(1500.5).isValid).toBe(false);
  });
});

describe("Bedrooms Validation", () => {
  it("accepts valid bedroom counts", () => {
    expect(validateBedrooms(3).isValid).toBe(true);
    expect(validateBedrooms(0).isValid).toBe(true);
  });

  it("rejects negative values", () => {
    expect(validateBedrooms(-1).isValid).toBe(false);
  });

  it("rejects unreasonably large values", () => {
    expect(validateBedrooms(100).isValid).toBe(false);
  });
});

describe("Bathrooms Validation", () => {
  it("accepts whole numbers", () => {
    expect(validateBathrooms(2).isValid).toBe(true);
  });

  it("accepts half-bath increments", () => {
    expect(validateBathrooms(2.5).isValid).toBe(true);
    expect(validateBathrooms(3.5).isValid).toBe(true);
  });

  it("rejects non-half increments", () => {
    expect(validateBathrooms(2.25).isValid).toBe(false);
    expect(validateBathrooms(2.75).isValid).toBe(false);
  });
});

describe("Lot Size Validation", () => {
  it("accepts valid lot sizes", () => {
    expect(validateLotSize(0.25).isValid).toBe(true);
    expect(validateLotSize(1.5).isValid).toBe(true);
    expect(validateLotSize(100).isValid).toBe(true);
  });

  it("rejects too-small values", () => {
    expect(validateLotSize(0.0001).isValid).toBe(false);
  });

  it("rejects unreasonably large values", () => {
    expect(validateLotSize(200000).isValid).toBe(false);
  });
});

describe("Year Built Validation", () => {
  const currentYear = new Date().getFullYear();

  it("accepts valid years", () => {
    expect(validateYearBuilt(1950).isValid).toBe(true);
    expect(validateYearBuilt(2000).isValid).toBe(true);
    expect(validateYearBuilt(currentYear).isValid).toBe(true);
  });

  it("rejects years too far in the past", () => {
    expect(validateYearBuilt(1500).isValid).toBe(false);
  });

  it("rejects years too far in the future", () => {
    expect(validateYearBuilt(currentYear + 10).isValid).toBe(false);
  });

  it("rejects non-integer years", () => {
    expect(validateYearBuilt(2020.5).isValid).toBe(false);
  });
});

describe("Email Validation", () => {
  it("accepts valid email addresses", () => {
    expect(validateEmail("user@example.com").isValid).toBe(true);
    expect(validateEmail("john.doe+tag@example.co.uk").isValid).toBe(true);
  });

  it("rejects invalid email formats", () => {
    expect(validateEmail("notanemail").isValid).toBe(false);
    expect(validateEmail("@example.com").isValid).toBe(false);
    expect(validateEmail("user@").isValid).toBe(false);
  });

  it("rejects disposable email domains", () => {
    expect(validateEmail("user@tempmail.com").isValid).toBe(false);
  });

  it("rejects empty emails", () => {
    expect(validateEmail("").isValid).toBe(false);
  });
});

describe("Phone Number Validation", () => {
  it("accepts 10-digit US phone numbers", () => {
    expect(validatePhoneNumber("5125551234").isValid).toBe(true);
    expect(validatePhoneNumber("(512) 555-1234").isValid).toBe(true);
    expect(validatePhoneNumber("512-555-1234").isValid).toBe(true);
  });

  it("accepts 11-digit with country code", () => {
    expect(validatePhoneNumber("15125551234").isValid).toBe(true);
    expect(validatePhoneNumber("+1 512-555-1234").isValid).toBe(true);
  });

  it("rejects too-short numbers", () => {
    expect(validatePhoneNumber("123456").isValid).toBe(false);
  });

  it("rejects too-long numbers", () => {
    expect(validatePhoneNumber("123456789012").isValid).toBe(false);
  });

  it("rejects invalid patterns", () => {
    expect(validatePhoneNumber("1111111111").isValid).toBe(false);
  });
});

describe("Appeal Viability Validation", () => {
  it("determines appeal is viable with sufficient gap", () => {
    const result = validateAppealViability(500000, 450000, 3000, 2);
    expect(result.isViable).toBe(true);
    expect(result.dollarGap).toBe(50000);
    expect(result.percentGap).toBeCloseTo(10, 0);
  });

  it("determines appeal is not viable with insufficient gap", () => {
    const result = validateAppealViability(500000, 498000, 3000, 2);
    expect(result.isViable).toBe(false);
  });

  it("determines appeal is not viable when market exceeds assessed", () => {
    const result = validateAppealViability(450000, 500000, 3000, 2);
    expect(result.isViable).toBe(false);
    expect(result.reason).toContain("Market value exceeds");
  });
});

describe("Required Fields Validation", () => {
  it("validates all required fields are present", () => {
    const data = { name: "John", email: "john@example.com", phone: "5125551234" };
    const result = validateRequiredFields(data, ["name", "email", "phone"]);
    expect(result.isValid).toBe(true);
    expect(result.missingFields).toHaveLength(0);
  });

  it("identifies missing fields", () => {
    const data = { name: "John", email: "" };
    const result = validateRequiredFields(data, ["name", "email", "phone"]);
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain("email");
    expect(result.missingFields).toContain("phone");
  });
});

describe("Property Submission Validation", () => {
  it("validates complete valid submission", () => {
    const data = {
      address: "123 Main Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
      assessedValue: 500000,
      estimatedMarketValue: 450000,
      squareFeet: 2000,
      bedrooms: 3,
      bathrooms: 2.5,
      yearBuilt: 2000,
      lotSize: 0.25,
      ownerEmail: "owner@example.com",
      ownerPhone: "5125551234",
    };

    const result = validatePropertySubmission(data);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("collects all validation errors", () => {
    const data = {
      address: "123",
      city: "",
      state: "XX",
      zip: "123",
      assessedValue: 500,
      estimatedMarketValue: 5000000000,
      squareFeet: 50,
      bedrooms: -1,
      bathrooms: 2.25,
      yearBuilt: 1500,
      lotSize: 0.0001,
      ownerEmail: "notanemail",
      ownerPhone: "123",
    };

    const result = validatePropertySubmission(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(5);
  });
});
