/** Decision-translation engine: turns a CVE's raw signals (CVSS / EPSS / KEV /
 * ransomware) into one plain-language business action with an urgency and SLA.
 * "CVE-2026-x has CVSS 9.8" → "Patch VMware ESXi within 24h — actively exploited." */

export interface DecisionInput {
  cveId: string;
  vendor: string;
  product: string | null;
  cvss: number | null;
  epss: number | null;
  isKev: boolean;
  ransomware: boolean;
  score: number;
}

export type Urgency = "Immediate" | "Urgent" | "This week" | "Planned" | "Monitor";

export interface Decision extends DecisionInput {
  urgency: Urgency;
  window: string; // human SLA, e.g. "within 24h"
  verb: string; // Patch | Remediate | Monitor
  rationale: string; // plain-language "why it matters"
}

const pct = (v: number | null) => (v == null ? null : Math.round(v * 100));

export function decide(c: DecisionInput): Decision {
  const e = c.epss ?? 0;
  let urgency: Urgency;
  let window: string;
  let rationale: string;

  if (c.isKev && c.ransomware) {
    urgency = "Immediate";
    window = "within 24h";
    rationale = `Actively exploited in ransomware campaigns and on the CISA KEV catalog${
      c.epss != null ? ` · ${pct(c.epss)}% exploit probability` : ""
    }.`;
  } else if (c.isKev && e >= 0.3) {
    urgency = "Immediate";
    window = "within 24h";
    rationale = `On the CISA Known Exploited Vulnerabilities catalog with high exploit probability (EPSS ${pct(c.epss)}%).`;
  } else if (c.isKev) {
    urgency = "Urgent";
    window = "within 48h";
    rationale = "Confirmed exploited in the wild (CISA KEV).";
  } else if (e >= 0.5) {
    urgency = "Urgent";
    window = "within 72h";
    rationale = `High probability of exploitation (EPSS ${pct(c.epss)}%) — treat as imminent.`;
  } else if ((c.cvss ?? 0) >= 9) {
    urgency = "This week";
    window = "this week";
    rationale = `Critical severity (CVSS ${c.cvss}); no confirmed exploitation yet.`;
  } else if (e >= 0.1) {
    urgency = "Planned";
    window = "this sprint";
    rationale = `Elevated exploit probability (EPSS ${pct(c.epss)}%) — schedule remediation.`;
  } else {
    urgency = "Monitor";
    window = "track";
    rationale = "Low current risk — monitor for exploit development.";
  }

  const verb = urgency === "Monitor" ? "Monitor" : urgency === "Planned" ? "Remediate" : "Patch";
  return { ...c, urgency, window, verb, rationale };
}

export const URGENCY_ORDER: Urgency[] = ["Immediate", "Urgent", "This week", "Planned", "Monitor"];

export const URGENCY_STYLE: Record<Urgency, { text: string; border: string; bg: string }> = {
  Immediate: { text: "text-sev-critical", border: "border-sev-critical/40", bg: "bg-sev-critical/[0.08]" },
  Urgent: { text: "text-sev-high", border: "border-sev-high/40", bg: "bg-sev-high/[0.08]" },
  "This week": { text: "text-sev-medium", border: "border-sev-medium/40", bg: "bg-sev-medium/[0.08]" },
  Planned: { text: "text-sev-low", border: "border-sev-low/40", bg: "bg-sev-low/[0.08]" },
  Monitor: { text: "text-slate-400", border: "border-white/15", bg: "bg-white/[0.03]" },
};
