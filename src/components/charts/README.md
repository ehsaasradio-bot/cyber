# Chart primitives

Pure presentational, `"use client"`, hand-rolled SVG. No data fetching, no chart libraries. All guard empty/all-zero input with a "NO DATA" caption. Designed for the dark glass panels (mono type, thin strokes, subtle glows).

## Usage

```tsx
import AreaTrend from "@/components/charts/AreaTrend";
<AreaTrend data={[{ label: "Jun 01", value: 12, value2: 4 }, ...]} color="#22d3ee" color2="#f43f5e" height={180} />
// smooth gradient area (value) + optional second line (value2); hover crosshair + tooltip

import HBars from "@/components/charts/HBars";
<HBars data={[{ label: "microsoft", value: 240, accent: 31 }, ...]} color="#22d3ee" formatValue={(v) => v.toLocaleString()} />
// horizontal bars, width animates on mount; accent = rose overlay segment from 0..accent (e.g. ransomware share)

import ScatterQuad from "@/components/charts/ScatterQuad";
<ScatterQuad points={[{ x: 0.87, y: 9.8, id: "CVE-2026-1234", highlight: true }, ...]} xLabel="EPSS" yLabel="CVSS" onPointClick={(id) => open(id)} />
// x domain [0,1], y domain [0,10]; quadrant lines at x=0.5 / y=7 with PATCH NOW / WATCH / PLAN / MONITOR captions; renders at most 400 points (highlights kept first)

import Histogram from "@/components/charts/Histogram";
<Histogram buckets={[{ label: "0-1", count: 320 }, ...]} color="#e879f9" />
// vertical bars, linear scale, tooltip on hover, x label under every other bar

import Donut from "@/components/charts/Donut";
<Donut slices={[{ label: "kev_added", value: 120 }, { label: "c2_server", value: 80, color: "#f43f5e" }, ...]} />
// donut + center total + right legend; palette cycles cyan/magenta/rose/orange/yellow/sky/violet/emerald when color omitted

import Sparkline from "@/components/charts/Sparkline";
<Sparkline values={[3, 5, 2, 8, 8, 13]} color="#22d3ee" width={96} height={24} />
// minimal polyline + last-point dot; flat/all-zero series renders a flat bottom line (no NaN)
```

Notes for assemblers:

- `AreaTrend` fills its own width; `height` is the total pixel height including the x-label row.
- `HBars` / `Histogram` / `Donut` / `ScatterQuad` are width-responsive (`w-100%`), height follows content or aspect ratio — wrap in a padded div inside `GlassPanel`.
- Tooltips are absolutely positioned inside the component's own `relative` wrapper; give parents `overflow-visible` headroom or padding so they aren't clipped.
