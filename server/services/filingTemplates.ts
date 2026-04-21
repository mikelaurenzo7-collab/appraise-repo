/**
 * State-Specific Filing Templates Service
 * Generates jurisdiction-specific appeal documents with auto-filled user data
 */

export interface FilingTemplate {
  state: string;
  county: string;
  formName: string;
  formNumber: string;
  deadline: string;
  filingMethod: 'online' | 'mail' | 'in-person' | 'mixed';
  fee: number;
  url: string;
  instructions: string;
}

export interface FilledTemplate {
  state: string;
  county: string;
  formName: string;
  content: string;
  fileName: string;
  mimeType: string;
}

/**
 * Get filing template for state/county
 */
export async function getFilingTemplate(state: string, county: string): Promise<FilingTemplate | null> {
  const templates: Record<string, Record<string, FilingTemplate>> = {
    TX: {
      'Travis': {
        state: 'TX',
        county: 'Travis',
        formName: 'Notice of Protest',
        formNumber: 'ARB-1',
        deadline: '30 days from notice',
        filingMethod: 'online',
        fee: 50,
        url: 'https://traviscountytax.org/protest',
        instructions: 'File online via Travis County Appraisal District portal',
      },
      'Dallas': {
        state: 'TX',
        county: 'Dallas',
        formName: 'Notice of Protest',
        formNumber: 'ARB-1',
        deadline: '30 days from notice',
        filingMethod: 'mail',
        fee: 0,
        url: 'https://www.dallasappraisal.org',
        instructions: 'Mail to Dallas Appraisal District, 2900 N. Stemmons, Dallas, TX 75247',
      },
    },
    IL: {
      'Cook': {
        state: 'IL',
        county: 'Cook',
        formName: 'Complaint to Board of Review',
        formNumber: 'BOR-1',
        deadline: '30 days from notice',
        filingMethod: 'online',
        fee: 0,
        url: 'https://www.cookcountybor.org',
        instructions: 'E-file through Cook County Board of Review portal',
      },
    },
    CA: {
      'Los Angeles': {
        state: 'CA',
        county: 'Los Angeles',
        formName: 'Assessment Appeal Form',
        formNumber: 'AAF-1',
        deadline: '60 days from notice',
        filingMethod: 'mixed',
        fee: 0,
        url: 'https://assessor.lacounty.gov/appeals',
        instructions: 'File online or mail to LA County Assessor',
      },
      'San Francisco': {
        state: 'CA',
        county: 'San Francisco',
        formName: 'Proposition 8 Application',
        formNumber: 'PROP8-1',
        deadline: '30 days from notice',
        filingMethod: 'online',
        fee: 0,
        url: 'https://sfassessor.org/appeals',
        instructions: 'File online via SF Assessor portal',
      },
    },
    NY: {
      'New York': {
        state: 'NY',
        county: 'New York',
        formName: 'Complaint Form',
        formNumber: 'COMPLAINT-1',
        deadline: '30 days from notice',
        filingMethod: 'in-person',
        fee: 0,
        url: 'https://www.nyc.gov/site/finance/property-tax/tax-assessment-appeals.page',
        instructions: 'File in person at NYC Department of Finance office',
      },
    },
    FL: {
      'Miami-Dade': {
        state: 'FL',
        county: 'Miami-Dade',
        formName: 'Petition for Adjustment',
        formNumber: 'PFA-1',
        deadline: '25 days from notice',
        filingMethod: 'mail',
        fee: 0,
        url: 'https://www.miamidade.gov/propertytax',
        instructions: 'Mail to Miami-Dade Property Appraiser',
      },
    },
  };

  return templates[state]?.[county] || null;
}

/**
 * Generate filled template with user data
 */
export async function generateFilledTemplate(
  state: string,
  county: string,
  userData: {
    name: string;
    email: string;
    phone: string;
    propertyAddress: string;
    assessedValue: number;
    marketValue: number;
    reason: string;
  }
): Promise<FilledTemplate | null> {
  const template = await getFilingTemplate(state, county);
  if (!template) return null;

  // Generate content based on template
  const content = generateTemplateContent(template, userData);

  return {
    state,
    county,
    formName: template.formName,
    content,
    fileName: `${state}_${county}_${template.formNumber}_${userData.name.replace(/\s+/g, '_')}.pdf`,
    mimeType: 'application/pdf',
  };
}

/**
 * Generate template content with user data
 */
function generateTemplateContent(template: FilingTemplate, userData: any): string {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
${template.formName} - ${template.state} ${template.county} County

FORM NUMBER: ${template.formNumber}
FILING METHOD: ${template.filingMethod.toUpperCase()}
FILING FEE: $${template.fee}
DEADLINE: ${template.deadline}

---

APPELLANT INFORMATION:
Name: ${userData.name}
Email: ${userData.email}
Phone: ${userData.phone}

PROPERTY INFORMATION:
Address: ${userData.propertyAddress}
County: ${template.county}, ${template.state}

ASSESSMENT INFORMATION:
Current Assessed Value: $${userData.assessedValue.toLocaleString()}
Estimated Market Value: $${userData.marketValue.toLocaleString()}
Difference: $${(userData.assessedValue - userData.marketValue).toLocaleString()}

REASON FOR APPEAL:
${userData.reason}

SUPPORTING DOCUMENTS:
- AI-Generated Appraisal Report
- Comparable Sales Analysis
- Property Photos
- Market Analysis

FILING INSTRUCTIONS:
${template.instructions}

DEADLINE: ${template.deadline}

This document was generated on ${today} by AppraiseAI.
For assistance, contact support@appraiseai.com

---

FILING CHECKLIST:
☐ Complete all required fields
☐ Attach supporting documents
☐ Include filing fee (if applicable)
☐ Keep copy for your records
☐ File by deadline: ${template.deadline}
`;
}

/**
 * Get all available templates for a state
 */
export async function getStateTemplates(state: string): Promise<FilingTemplate[]> {
  const templates: Record<string, Record<string, FilingTemplate>> = {
    TX: {
      'Travis': {
        state: 'TX',
        county: 'Travis',
        formName: 'Notice of Protest',
        formNumber: 'ARB-1',
        deadline: '30 days from notice',
        filingMethod: 'online',
        fee: 50,
        url: 'https://traviscountytax.org/protest',
        instructions: 'File online via Travis County Appraisal District portal',
      },
      'Dallas': {
        state: 'TX',
        county: 'Dallas',
        formName: 'Notice of Protest',
        formNumber: 'ARB-1',
        deadline: '30 days from notice',
        filingMethod: 'mail',
        fee: 0,
        url: 'https://www.dallasappraisal.org',
        instructions: 'Mail to Dallas Appraisal District',
      },
    },
    IL: {
      'Cook': {
        state: 'IL',
        county: 'Cook',
        formName: 'Complaint to Board of Review',
        formNumber: 'BOR-1',
        deadline: '30 days from notice',
        filingMethod: 'online',
        fee: 0,
        url: 'https://www.cookcountybor.org',
        instructions: 'E-file through Cook County Board of Review portal',
      },
    },
    CA: {
      'Los Angeles': {
        state: 'CA',
        county: 'Los Angeles',
        formName: 'Assessment Appeal Form',
        formNumber: 'AAF-1',
        deadline: '60 days from notice',
        filingMethod: 'mixed',
        fee: 0,
        url: 'https://assessor.lacounty.gov/appeals',
        instructions: 'File online or mail to LA County Assessor',
      },
      'San Francisco': {
        state: 'CA',
        county: 'San Francisco',
        formName: 'Proposition 8 Application',
        formNumber: 'PROP8-1',
        deadline: '30 days from notice',
        filingMethod: 'online',
        fee: 0,
        url: 'https://sfassessor.org/appeals',
        instructions: 'File online via SF Assessor portal',
      },
    },
  };

  return Object.values(templates[state] || {});
}

/**
 * Validate filing deadline
 */
export function isWithinDeadline(noticeDate: Date, template: FilingTemplate): boolean {
  const deadline = new Date(noticeDate);
  
  // Parse deadline string (e.g., "30 days from notice")
  const daysMatch = template.deadline.match(/(\d+)\s+days/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    deadline.setDate(deadline.getDate() + days);
  }

  return new Date() <= deadline;
}

/**
 * Get days remaining until deadline
 */
export function getDaysUntilDeadline(noticeDate: Date, template: FilingTemplate): number {
  const deadline = new Date(noticeDate);
  
  const daysMatch = template.deadline.match(/(\d+)\s+days/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    deadline.setDate(deadline.getDate() + days);
  }

  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
