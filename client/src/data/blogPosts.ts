export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: "state-guide" | "strategy" | "case-study" | "tips";
  author: string;
  date: string;
  readTime: number;
  tags: string[];
  featured?: boolean;
}

export const blogPosts: BlogPost[] = [
  {
    id: "california-appeal-guide",
    title: "Complete Guide to California Property Tax Appeals",
    excerpt: "Learn the Proposition 13 system and how to challenge your assessment in California.",
    content:
      "California's Proposition 13 system limits property tax increases to 2% annually unless the property changes ownership. When a property is reassessed at sale — or when the assessor applies an upward adjustment for new construction or other triggering events — homeowners can file an Assessment Appeal Application (Form BOE-305-AH) with their County Assessment Appeals Board. The filing window is typically July 2 through September 15 or November 30, depending on the county. Evidence should focus on comparable sales within 90 days of the lien date (January 1) and any defects in the property that affect market value.",
    category: "state-guide",
    author: "AppraiseAI Team",
    date: "2026-04-15",
    readTime: 8,
    tags: ["California", "Prop 13", "Appeals"],
    featured: true,
  },
  {
    id: "texas-appeal-strategy",
    title: "Texas Property Tax Appeals: County-by-County Strategies",
    excerpt: "Navigate Texas's unique appraisal system and maximize your appeal success rate.",
    content:
      "Texas allows homeowners to challenge assessments through the Appraisal Review Board (ARB). Filing deadlines are typically May 15 or 30 days after the notice of appraised value, whichever is later. Harris, Travis, Dallas, and Bexar counties accept online submissions through HCAD / TCAD / DCAD / BCAD portals. Strong cases combine recent comparable sales (within 6 months, same school district), cost-approach adjustments for property defects, and equity-of-assessment arguments that compare your assessed-to-market-value ratio against similar properties.",
    category: "state-guide",
    author: "AppraiseAI Team",
    date: "2026-04-14",
    readTime: 10,
    tags: ["Texas", "ARB", "Appeals"],
    featured: true,
  },
  {
    id: "comparable-sales-strategy",
    title: "Winning Strategy: Using Comparable Sales to Challenge Your Assessment",
    excerpt: "Master the sales comparison approach to build an unbeatable appeal case.",
    content:
      "Comparable sales analysis is the most powerful tool for property tax appeals. Select 3–5 comps sold within 6 months of the lien date, within a half-mile radius, and with matching bedroom/bathroom counts and square footage within 20%. Adjust each comp for material differences — pool, garage, lot size, condition — and compute the median adjusted price per square foot. If the resulting value is meaningfully below the assessor's opinion of value, you have a quantitative basis for appeal.",
    category: "strategy",
    author: "AppraiseAI Team",
    date: "2026-04-13",
    readTime: 7,
    tags: ["Comparable Sales", "Valuation", "Evidence"],
  },
  {
    id: "photo-evidence-guide",
    title: "How to Photograph Your Property for Maximum Appeal Impact",
    excerpt: "Professional photography techniques that strengthen your tax appeal case.",
    content:
      "Photos are critical evidence in property tax appeals. Shoot in natural light, include a ruler or tape measure in close-ups of defects, and timestamp each image. Document roof damage, foundation cracks, outdated kitchens and bathrooms, deferred maintenance, and any functional obsolescence (tandem bedrooms, undersized lots, proximity to nuisances). Submit no more than 12 photos — more is noise. The goal is to let the reviewer see what the drive-by assessor couldn't.",
    category: "tips",
    author: "AppraiseAI Team",
    date: "2026-04-12",
    readTime: 5,
    tags: ["Photography", "Evidence", "Appeal Tips"],
  },
  {
    id: "ny-assessment-challenge",
    title: "New York Property Tax Assessment Challenges: A Complete Roadmap",
    excerpt: "Navigate New York's complex assessment and STAR exemption systems.",
    content:
      "New York's assessment system is unique with STAR exemptions and grievance procedures. Most municipalities hold Grievance Day on the fourth Tuesday of May; New York City's filing deadline is March 15 for Class 1 and March 1 for Class 2/3/4. File Form RP-524 (outside NYC) or Form TC108/TC109 (NYC) with comparable sales, income data for rental properties, and any relevant STAR or SCHE exemptions. If denied, a Small Claims Assessment Review (SCAR) petition can be filed for one-to-three-unit residential properties — a low-cost path that doesn't require an attorney.",
    category: "state-guide",
    author: "AppraiseAI Team",
    date: "2026-04-11",
    readTime: 9,
    tags: ["New York", "STAR", "Grievance"],
  },
  {
    id: "cost-approach-valuation",
    title: "Cost Approach Valuation: When and How to Use It",
    excerpt: "Understand the cost approach method and when it strengthens your appeal.",
    content:
      "The cost approach calculates value by adding land value to replacement cost, then subtracting depreciation. It's most useful for unique, new, or special-use properties where comparable sales are scarce — and for showing physical/functional/economic obsolescence on older homes. Use published cost manuals (Marshall &amp; Swift) for replacement cost, and document effective age vs. chronological age to justify depreciation above the assessor's schedule.",
    category: "strategy",
    author: "AppraiseAI Team",
    date: "2026-04-10",
    readTime: 6,
    tags: ["Cost Approach", "Valuation", "Strategy"],
  },
  {
    id: "case-study-savings",
    title: "Case Study: How We Saved $8,400/Year for an Austin Homeowner",
    excerpt: "Real example of a successful appeal using comparable sales analysis.",
    content:
      "This case study shows how AppraiseAI identified a $140,000 overassessment in Austin, TX. The Travis County appraisal increased from $520K to $665K year-over-year despite no improvements and a softening local market. Our analysis pulled 5 comparable sales within 0.4 miles at a median $441/sqft vs. the assessor's implied $528/sqft. The ARB accepted the revised opinion of value at $525K, reducing the tax bill by approximately $8,400 annually.",
    category: "case-study",
    author: "AppraiseAI Team",
    date: "2026-04-09",
    readTime: 4,
    tags: ["Austin", "Case Study", "Success"],
  },
  {
    id: "appeal-deadline-calendar",
    title: "2026 Property Tax Appeal Deadlines by State",
    excerpt: "Never miss a deadline: Complete calendar of appeal filing deadlines nationwide.",
    content:
      "Appeal deadlines vary by state and county. Texas: May 15 (or 30 days after notice). California: September 15 or November 30 (county-dependent). New York: March 1/15 (NYC) or fourth Tuesday of May (upstate). Florida: 25 days after the TRIM notice. Illinois (Cook): 30 days after the board opens. See the Deadlines page on AppraiseAI for a live, searchable calendar across all 50 states with portal/mail/email channel indicators.",
    category: "tips",
    author: "AppraiseAI Team",
    date: "2026-04-08",
    readTime: 3,
    tags: ["Deadlines", "Calendar", "Important Dates"],
  },
];

export function getBlogPost(id: string): BlogPost | undefined {
  return blogPosts.find((p) => p.id === id);
}
