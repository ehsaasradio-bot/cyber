/** Executive risk translation: turns threat exposure into a defensible dollar
 * figure and compliance posture. The dollar figure is a transparent ALE model
 * (industry breach-cost benchmark × modeled likelihood) — clearly labeled
 * illustrative, never presented as a measured loss. */

/** IBM Cost of a Data Breach 2024 — average total cost by industry (USD millions).
 * Public benchmark, cited on screen; used as the "impact" term of the ALE model. */
const BREACH_COST_USD_M: Record<string, number> = {
  healthcare: 9.77,
  "financial-services": 6.08,
  "technology-ai": 5.45,
  "energy-utilities": 5.29,
  manufacturing: 5.56,
  "public-sector": 2.55,
  "retail-consumer": 3.48,
  "transportation-logistics": 4.1,
  "other-services": 4.88,
};
const DEFAULT_BREACH_COST_USD_M = 4.88; // global cross-industry average
export const BREACH_COST_SOURCE = "IBM Cost of a Data Breach 2024, industry average";

interface Framework {
  name: string;
  focus: string;
}

const FRAMEWORKS: Record<string, Framework[]> = {
  "financial-services": [
    { name: "PCI-DSS 4.0", focus: "Cardholder data · req. 6 patch mgmt" },
    { name: "SOC 2", focus: "Security & availability controls" },
    { name: "DORA", focus: "EU operational resilience" },
    { name: "ISO 27001", focus: "ISMS · A.8 vulnerability mgmt" },
  ],
  healthcare: [
    { name: "HIPAA Security Rule", focus: "ePHI safeguards · §164.308" },
    { name: "HITRUST CSF", focus: "Healthcare control framework" },
    { name: "ISO 27001", focus: "ISMS · A.8 vulnerability mgmt" },
  ],
  "public-sector": [
    { name: "NIST 800-53", focus: "SI-2 flaw remediation" },
    { name: "FedRAMP", focus: "Cloud authorization" },
    { name: "CMMC 2.0", focus: "Defense supply chain" },
  ],
  "technology-ai": [
    { name: "SOC 2", focus: "Trust services criteria" },
    { name: "ISO 27001", focus: "ISMS · A.8 vulnerability mgmt" },
    { name: "GDPR", focus: "Data protection · Art. 32" },
    { name: "EU AI Act", focus: "AI system risk obligations" },
  ],
  "retail-consumer": [
    { name: "PCI-DSS 4.0", focus: "Payment card data" },
    { name: "GDPR", focus: "Data protection · Art. 32" },
    { name: "CCPA", focus: "Consumer privacy" },
  ],
  manufacturing: [
    { name: "IEC 62443", focus: "Industrial control systems" },
    { name: "NIST CSF 2.0", focus: "Protect · patch management" },
    { name: "ISO 27001", focus: "ISMS · A.8 vulnerability mgmt" },
  ],
  "energy-utilities": [
    { name: "NERC CIP", focus: "Bulk electric system security" },
    { name: "IEC 62443", focus: "Industrial control systems" },
    { name: "NIST CSF 2.0", focus: "Protect · patch management" },
  ],
  "transportation-logistics": [
    { name: "TSA Security Directives", focus: "Pipeline / transport cyber" },
    { name: "ISO 27001", focus: "ISMS · A.8 vulnerability mgmt" },
    { name: "NIST CSF 2.0", focus: "Protect · patch management" },
  ],
  "other-services": [
    { name: "NIST CSF 2.0", focus: "Protect · patch management" },
    { name: "ISO 27001", focus: "ISMS · A.8 vulnerability mgmt" },
    { name: "GDPR", focus: "Data protection · Art. 32" },
  ],
};
const DEFAULT_FRAMEWORKS: Framework[] = [
  { name: "NIST CSF 2.0", focus: "Protect · patch management" },
  { name: "ISO 27001", focus: "ISMS · A.8 vulnerability mgmt" },
  { name: "GDPR", focus: "Data protection · Art. 32" },
];

export function frameworksFor(industrySlug: string | null): Framework[] {
  return (industrySlug && FRAMEWORKS[industrySlug]) || DEFAULT_FRAMEWORKS;
}

export type RiskBand = "Low" | "Moderate" | "Elevated" | "High" | "Severe";

export interface FinancialRisk {
  impactUsd: number; // benchmark breach cost (the "if it happens" number)
  likelihoodPct: number; // modeled annual likelihood
  aleUsd: number; // annualized loss expectancy = impact × likelihood
  band: RiskBand;
  benchmarkSource: string;
}

/**
 * Annualized Loss Expectancy (FAIR-lite). Impact = published industry breach
 * benchmark. Likelihood = bounded function of the sector's live threat pressure
 * and the count of unpatched, actively-exploited vulnerabilities in the stack.
 * Deliberately conservative and transparent — an indicator, not an actuarial figure.
 */
export function financialRisk(
  industrySlug: string | null,
  sectorPressure: number | null,
  globalPressure: number,
  kevExposure: number,
): FinancialRisk {
  const costM = (industrySlug && BREACH_COST_USD_M[industrySlug]) || DEFAULT_BREACH_COST_USD_M;
  const impactUsd = Math.round(costM * 1_000_000);
  const pressure = sectorPressure ?? globalPressure * 0.6;
  const likelihoodPct = Math.round(
    Math.max(5, Math.min(65, 8 + pressure * 0.35 + Math.min(kevExposure, 20) * 1.2)),
  );
  const aleUsd = Math.round((impactUsd * likelihoodPct) / 100);
  const band: RiskBand =
    aleUsd >= 3_000_000
      ? "Severe"
      : aleUsd >= 1_500_000
        ? "High"
        : aleUsd >= 700_000
          ? "Elevated"
          : aleUsd >= 250_000
            ? "Moderate"
            : "Low";
  return { impactUsd, likelihoodPct, aleUsd, band, benchmarkSource: BREACH_COST_SOURCE };
}

export const RISK_BAND_TONE: Record<RiskBand, string> = {
  Severe: "text-sev-critical",
  High: "text-sev-critical",
  Elevated: "text-sev-high",
  Moderate: "text-sev-medium",
  Low: "text-sev-low",
};
