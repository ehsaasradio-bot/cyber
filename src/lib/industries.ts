/** Canonical industry buckets, derived from observed ransomware.live sector strings. */

export interface Industry {
  slug: string;
  label: string;
  sectors: string[];
  keywords: RegExp; // for classifying free-text (breaking news headlines)
}

export const INDUSTRIES: Industry[] = [
  {
    slug: "financial-services",
    label: "Banking & Fintech",
    sectors: ["Financial Services"],
    keywords: /\b(bank|fintech|payment|credit union|financial services|insurer|insurance)\b/i,
  },
  {
    slug: "healthcare",
    label: "Healthcare",
    sectors: ["Healthcare"],
    keywords: /\b(hospital|healthcare|health system|clinic|patient data|hipaa)\b/i,
  },
  {
    slug: "manufacturing",
    label: "Manufacturing",
    sectors: ["Manufacturing"],
    keywords: /\b(manufactur|factory|industrial control|ics\b|scada|assembly plant)\b/i,
  },
  {
    slug: "technology-ai",
    label: "Technology & AI",
    sectors: ["Technology", "Telecommunication"],
    keywords: /\b(software|saas|cloud provider|ai model|artificial intelligence|\bllm\b|chatbot|tech company|telecom)\b/i,
  },
  {
    slug: "public-sector",
    label: "Government & Public Sector",
    sectors: ["Public Sector"],
    keywords: /\b(government|municipal|federal agency|city of|county|public sector|state agency)\b/i,
  },
  {
    slug: "energy-utilities",
    label: "Energy & Utilities",
    sectors: ["Energy"],
    keywords: /\b(energy grid|power plant|utility|pipeline|oil and gas|electric utility)\b/i,
  },
  {
    slug: "transportation-logistics",
    label: "Transportation & Logistics",
    sectors: ["Transportation/Logistics"],
    keywords: /\b(airline|shipping|logistics|freight|railway|port authority)\b/i,
  },
  {
    slug: "retail-consumer",
    label: "Retail & Consumer",
    sectors: ["Consumer Services", "Hospitality and Tourism"],
    keywords: /\b(retailer|e-commerce|hotel chain|airline booking|consumer app)\b/i,
  },
  {
    slug: "other-services",
    label: "Business & Professional Services",
    sectors: [
      "Business Services",
      "Construction",
      "Education",
      "Agriculture and Food Production",
    ],
    keywords: /\b(law firm|university|school district|construction firm|professional services)\b/i,
  },
];

const BY_SECTOR = new Map<string, string>();
for (const ind of INDUSTRIES) {
  for (const s of ind.sectors) BY_SECTOR.set(s, ind.slug);
}
const BY_SLUG = new Map(INDUSTRIES.map((i) => [i.slug, i]));

export function industryForSector(sector: string | null | undefined): string | null {
  if (!sector) return null;
  return BY_SECTOR.get(sector) ?? null;
}

export function industryForText(text: string): string | null {
  for (const ind of INDUSTRIES) {
    if (ind.keywords.test(text)) return ind.slug;
  }
  return null;
}

export function industryLabel(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return BY_SLUG.get(slug)?.label ?? null;
}

export function industryBySlug(slug: string): Industry | null {
  return BY_SLUG.get(slug) ?? null;
}
