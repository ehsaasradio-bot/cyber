/** Weather-report regions. Countries not listed fall into the nearest bucket via OTHER. */

export const REGION_LABELS: Record<string, string> = {
  NA: "North America",
  LATAM: "Latin America",
  EU: "Europe",
  MEA: "Middle East & Africa",
  APAC: "Asia-Pacific",
};

export const REGION_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  NA: { lat: 43, lng: -100 },
  LATAM: { lat: -12, lng: -60 },
  EU: { lat: 50, lng: 12 },
  MEA: { lat: 18, lng: 30 },
  APAC: { lat: 20, lng: 105 },
};

/** Approximate [minLon, minLat, maxLon, maxLat] bounding boxes — used to zoom the flat map, not for precise clipping. */
export const REGION_BOUNDS: Record<string, [number, number, number, number]> = {
  NA: [-170, 5, -50, 75],
  LATAM: [-100, -58, -30, 33],
  EU: [-25, 34, 60, 72],
  MEA: [-20, -35, 65, 42],
  APAC: [60, -50, 180, 55],
};

const MAP: Record<string, string[]> = {
  NA: ["US", "CA", "MX", "BM", "GL"],
  LATAM: [
    "AR", "BO", "BR", "CL", "CO", "CR", "CU", "DO", "EC", "GT", "HN", "HT",
    "JM", "NI", "PA", "PE", "PR", "PY", "SV", "TT", "UY", "VE", "BS", "BZ", "GY", "SR",
  ],
  EU: [
    "AL", "AT", "BA", "BE", "BG", "BY", "CH", "CY", "CZ", "DE", "DK", "EE",
    "ES", "FI", "FR", "GB", "GR", "HR", "HU", "IE", "IS", "IT", "LT", "LU",
    "LV", "MD", "ME", "MK", "MT", "NL", "NO", "PL", "PT", "RO", "RS", "RU",
    "SE", "SI", "SK", "UA", "XK",
  ],
  MEA: [
    "AE", "AM", "AO", "AZ", "BH", "BW", "CD", "CG", "CI", "CM", "DZ", "EG",
    "ET", "GE", "GH", "IL", "IQ", "IR", "JO", "KE", "KW", "LB", "LY", "MA",
    "MU", "MZ", "NA", "NG", "OM", "QA", "RW", "SA", "SD", "SN", "SO", "SY",
    "TN", "TR", "TZ", "UG", "YE", "ZA", "ZM", "ZW",
  ],
  APAC: [
    "AF", "AU", "BD", "BN", "BT", "CN", "FJ", "HK", "ID", "IN", "JP", "KG",
    "KH", "KP", "KR", "KZ", "LA", "LK", "MM", "MN", "MO", "MV", "MY", "NP",
    "NZ", "PG", "PH", "PK", "SG", "TH", "TJ", "TM", "TW", "UZ", "VN",
  ],
};

const LOOKUP = new Map<string, string>();
for (const [region, codes] of Object.entries(MAP)) {
  for (const cc of codes) LOOKUP.set(cc, region);
}

export function countryRegion(cc: string | null | undefined): string | null {
  if (!cc) return null;
  return LOOKUP.get(cc.toUpperCase()) ?? null;
}
