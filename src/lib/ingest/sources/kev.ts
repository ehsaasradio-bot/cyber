import { subDays } from "date-fns";
import type { NewCve, NewThreatEvent } from "../../db/schema";
import { fetchWithTimeout, type FeedSource } from "../types";

const KEV_URL =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

/** Only KEV entries added within this window become feed events (dedup makes replays free). */
const EVENT_WINDOW_DAYS = 30;

interface KevEntry {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  knownRansomwareCampaignUse: string;
}

export const kevSource: FeedSource = {
  name: "cisa_kev",
  async run() {
    const res = await fetchWithTimeout(KEV_URL);
    const catalog = (await res.json()) as { vulnerabilities: KevEntry[] };
    const entries = catalog.vulnerabilities ?? [];

    const cveRows: NewCve[] = entries.map((e) => ({
      cveId: e.cveID,
      description: e.shortDescription || e.vulnerabilityName,
      isKev: true,
      kevDateAdded: e.dateAdded,
      kevRansomware: e.knownRansomwareCampaignUse === "Known",
      vendor: e.vendorProject,
      product: e.product,
    }));

    const eventCutoff = subDays(new Date(), EVENT_WINDOW_DAYS);
    const events: NewThreatEvent[] = entries
      .filter((e) => new Date(e.dateAdded) >= eventCutoff)
      .map((e) => ({
        dedupKey: `kev:${e.cveID}`,
        type: "kev_added",
        source: "cisa_kev",
        title: `${e.cveID} added to CISA KEV — ${e.vendorProject} ${e.product}`,
        description: e.shortDescription,
        severity: e.knownRansomwareCampaignUse === "Known" ? "critical" : "high",
        occurredAt: new Date(e.dateAdded),
        metadata: { cveId: e.cveID, ransomware: e.knownRansomwareCampaignUse === "Known" },
      }));

    return {
      itemsFetched: entries.length,
      cves: cveRows,
      cveUpdateColumns: ["isKev", "kevDateAdded", "kevRansomware", "vendor", "product"],
      cveDescriptionAsFallback: true,
      events,
    };
  },
};
