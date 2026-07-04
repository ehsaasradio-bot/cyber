"use client";

export default function Sparkline({
  values,
  color = "#22d3ee",
  width = 96,
  height = 24,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (values.length === 0) {
    return (
      <span
        className="inline-flex items-center justify-center font-mono text-[8px] uppercase tracking-widest text-slate-600"
        style={{ width, height }}
      >
        no data
      </span>
    );
  }

  const pad = 3; // room for the end dot + glow
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1; // flat series → no NaN, line sits at bottom
  const n = values.length;

  const x = (i: number) => (n === 1 ? width / 2 : pad + (i / (n - 1)) * (width - 2 * pad));
  const y = (v: number) => pad + (1 - (v - min) / span) * (height - 2 * pad);

  const pts = values.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(" ");
  const lastX = x(n - 1);
  const lastY = y(values[n - 1]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0 overflow-visible"
      aria-hidden
    >
      {n > 1 && (
        <polyline
          points={pts}
          fill="none"
          stroke={color}
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.9}
        />
      )}
      <circle
        cx={lastX}
        cy={lastY}
        r={2}
        fill={color}
        style={{ filter: `drop-shadow(0 0 3px color-mix(in srgb, ${color} 80%, transparent))` }}
      />
    </svg>
  );
}
