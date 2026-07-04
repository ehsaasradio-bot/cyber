const STYLES: Record<string, string> = {
  critical: "text-sev-critical border-sev-critical/40 bg-sev-critical/10",
  high: "text-sev-high border-sev-high/40 bg-sev-high/10",
  medium: "text-sev-medium border-sev-medium/40 bg-sev-medium/10",
  low: "text-sev-low border-sev-low/40 bg-sev-low/10",
};

export default function SeverityBadge({ severity }: { severity: string }) {
  const style = STYLES[severity] ?? STYLES.low;
  return (
    <span
      className={`inline-block rounded border px-1.5 py-px font-mono text-[10px] uppercase tracking-wider ${style}`}
    >
      {severity}
    </span>
  );
}
