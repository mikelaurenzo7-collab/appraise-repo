/**
 * Document Generator Service
 * 
 * Generates legal documents for property tax appeals:
 * - Power of Attorney (POA) forms
 * - Pro Se filing packets
 * - Cover letters
 * - Appraisal reports
 */

export interface DocumentGeneratorInput {
  propertyAddress: string;
  propertyOwnerName: string;
  propertyOwnerEmail: string;
  propertyOwnerPhone: string;
  state: string;
  county: string;
  assessedValue: number;
  marketValue: number;
  overassessmentAmount: number;
  appraisalReport: string;
  filingMethod: "poa" | "pro_se";
}

/**
 * Generate Power of Attorney form
 */
export function generatePOAForm(input: DocumentGeneratorInput): string {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
POWER OF ATTORNEY FOR PROPERTY TAX APPEAL

STATE OF ${input.state.toUpperCase()}
COUNTY OF ${input.county.toUpperCase()}

KNOW ALL MEN AND WOMEN BY THESE PRESENTS:

That I, ${input.propertyOwnerName}, a resident of ${input.propertyAddress}, 
${input.county} County, ${input.state}, hereby make, constitute, and appoint 
AppraiseAI, Inc., a corporation authorized to practice as a property tax appeal 
specialist, as my true and lawful attorney-in-fact to:

1. REPRESENT ME in all matters relating to the property tax assessment of the 
   property located at ${input.propertyAddress}, known as Parcel ID [INSERT PARCEL ID].

2. FILE an appeal of the current property tax assessment with the appropriate 
   county assessor's office and/or tax appeal board.

3. PREPARE all necessary documents, including but not limited to:
   - Appraisal reports
   - Comparable sales analysis
   - Assessment challenge documents
   - Hearing briefs and memoranda

4. APPEAR ON MY BEHALF at any and all hearings, conferences, or proceedings 
   before the county assessor, tax appeal board, or other taxing authorities.

5. NEGOTIATE and settle the appeal on terms deemed reasonable by my attorney-in-fact.

6. SIGN all documents necessary to effectuate the above powers.

CURRENT ASSESSMENT: $${input.assessedValue.toLocaleString()}
APPRAISED MARKET VALUE: $${input.marketValue.toLocaleString()}
OVERASSESSMENT: $${input.overassessmentAmount.toLocaleString()}

CONTINGENCY FEE AGREEMENT:
I understand that AppraiseAI's compensation shall be 25% of the first year's 
tax savings achieved through this appeal. If no reduction is achieved, no fee 
is owed.

ACKNOWLEDGMENT:
I hereby acknowledge that I have read this Power of Attorney, understand its 
contents, and authorize AppraiseAI to act on my behalf in all matters related 
to the property tax appeal.

IN WITNESS WHEREOF, I have hereunto set my hand this ${date}.

_________________________________
${input.propertyOwnerName}
Signature

_________________________________
Print Name

_________________________________
Date

NOTARIZATION REQUIRED:
This document should be notarized before submission to the county assessor.
A notary public will verify your identity and witness your signature.

CONTACT INFORMATION:
Property Owner Email: ${input.propertyOwnerEmail}
Property Owner Phone: ${input.propertyOwnerPhone}
`;
}

/**
 * Generate Pro Se filing packet
 */
export function generateProSePacket(input: DocumentGeneratorInput): string {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
PROPERTY TAX APPEAL - PRO SE FILING PACKET
Prepared by AppraiseAI, Inc.

PROPERTY INFORMATION:
Address: ${input.propertyAddress}
County: ${input.county}, ${input.state}
Current Assessment: $${input.assessedValue.toLocaleString()}
Appraised Market Value: $${input.marketValue.toLocaleString()}
Overassessment: $${input.overassessmentAmount.toLocaleString()}

FILING DATE: ${date}

═══════════════════════════════════════════════════════════════════════════════

PART 1: APPEAL LETTER

${input.county} County Assessor's Office
[INSERT ADDRESS]

RE: PROPERTY TAX APPEAL - ${input.propertyAddress}

Dear Assessor:

I am writing to formally appeal the property tax assessment for my residence 
located at ${input.propertyAddress}, ${input.county} County, ${input.state}.

GROUNDS FOR APPEAL:
The current assessed value of $${input.assessedValue.toLocaleString()} 
significantly exceeds the fair market value of $${input.marketValue.toLocaleString()}, 
representing an overassessment of $${input.overassessmentAmount.toLocaleString()} 
(${((input.overassessmentAmount / input.assessedValue) * 100).toFixed(1)}%).

SUPPORTING EVIDENCE:
Attached is a comprehensive appraisal report prepared by AppraiseAI, including:
- Comparable sales analysis
- Market data analysis
- Property condition assessment
- Valuation methodology

I respectfully request that the assessment be reduced to reflect the true 
market value of the property.

Respectfully submitted,

_________________________________
${input.propertyOwnerName}
Date: ${date}

═══════════════════════════════════════════════════════════════════════════════

PART 2: REQUIRED DOCUMENTS CHECKLIST

Please include the following documents with your appeal:

☐ Original or certified copy of this appeal letter
☐ Appraisal report (attached)
☐ Comparable sales analysis (attached)
☐ Property photos (interior and exterior)
☐ Copy of property deed or title document
☐ Copy of most recent property tax bill
☐ Copy of assessment notice

═══════════════════════════════════════════════════════════════════════════════

PART 3: FILING INSTRUCTIONS

1. MAKE COPIES: Create 2 additional copies of all documents

2. ORGANIZE: Arrange documents in the following order:
   a) Appeal letter (original + 2 copies)
   b) Appraisal report (original + 2 copies)
   c) Supporting documents (2 sets of copies)

3. SUBMIT: Send to:
   ${input.county} County Assessor's Office
   [INSERT FULL ADDRESS]
   
   OR file in person at the assessor's office

4. KEEP RECORDS: Retain one complete set for your records

5. FOLLOW UP: Contact the assessor's office within 2 weeks to confirm receipt

═══════════════════════════════════════════════════════════════════════════════

PART 4: HEARING PREPARATION TIPS

If your appeal proceeds to a hearing:

✓ Bring all original documents and photos
✓ Dress professionally
✓ Arrive 15 minutes early
✓ Bring copies for the board members
✓ Present evidence calmly and factually
✓ Focus on comparable sales data
✓ Avoid emotional arguments
✓ Be prepared to answer questions about your property

═══════════════════════════════════════════════════════════════════════════════

PART 5: IMPORTANT DEADLINES

Appeal Deadline: [INSERT DEADLINE DATE]
Hearing Date: [TO BE SCHEDULED BY ASSESSOR]
Decision Date: [TYPICALLY 30-60 DAYS AFTER HEARING]

═══════════════════════════════════════════════════════════════════════════════

For questions or assistance, contact AppraiseAI:
Email: support@appraise-ai.com
Phone: [INSERT PHONE]
`;
}

/**
 * Generate appeal cover letter
 */
export function generateCoverLetter(input: DocumentGeneratorInput): string {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
${date}

${input.county} County Assessor's Office
[INSERT ADDRESS]

RE: PROPERTY TAX APPEAL SUBMISSION
Property: ${input.propertyAddress}
Assessed Value: $${input.assessedValue.toLocaleString()}
Appraised Value: $${input.marketValue.toLocaleString()}

Dear Assessor:

Please find enclosed the formal appeal of the property tax assessment for the 
above-referenced property. This appeal is submitted in accordance with 
${input.state} property tax appeal procedures.

APPEAL SUMMARY:
The current assessment of $${input.assessedValue.toLocaleString()} exceeds 
the fair market value of $${input.marketValue.toLocaleString()} by 
$${input.overassessmentAmount.toLocaleString()}.

SUPPORTING DOCUMENTATION:
This submission includes:
1. Formal appeal letter
2. Professional appraisal report
3. Comparable sales analysis
4. Property photographs
5. Supporting evidence

REQUESTED RELIEF:
We respectfully request that the assessment be reduced to $${input.marketValue.toLocaleString()} 
to reflect the true market value of the property.

We are available to discuss this appeal at your earliest convenience and 
welcome the opportunity to present our evidence at a hearing.

Respectfully submitted,

_________________________________
${input.propertyOwnerName}
${input.propertyOwnerEmail}
${input.propertyOwnerPhone}
`;
}

/**
 * Generate JSON document manifest
 */
export function generateDocumentManifest(input: DocumentGeneratorInput): {
  documents: Array<{
    name: string;
    type: string;
    required: boolean;
    content: string;
  }>;
} {
  return {
    documents: [
      {
        name: "Power of Attorney",
        type: "legal",
        required: input.filingMethod === "poa",
        content: generatePOAForm(input),
      },
      {
        name: "Pro Se Filing Packet",
        type: "filing",
        required: input.filingMethod === "pro_se",
        content: generateProSePacket(input),
      },
      {
        name: "Cover Letter",
        type: "correspondence",
        required: true,
        content: generateCoverLetter(input),
      },
    ],
  };
}
