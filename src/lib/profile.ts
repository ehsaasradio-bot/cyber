/** The stack profile a visitor builds in My Weather, stored in localStorage.
 * Shared so /my and /cyberthreatintel read the exact same shape. */

export interface Profile {
  vendors: string[];
  sector: string | null;
  watch: string[];
}

export const PROFILE_STORAGE_KEY = "cw-profile";

export function loadProfile(): Profile {
  const empty: Profile = { vendors: [], sector: null, watch: [] };
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    // Spread over defaults so profiles saved before a field existed still load.
    if (raw) return { ...empty, ...(JSON.parse(raw) as Partial<Profile>) };
  } catch {
    /* fresh profile */
  }
  return empty;
}
