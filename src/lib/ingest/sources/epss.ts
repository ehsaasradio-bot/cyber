import { db } from "../../db";
import { cves, type NewCve } from "../../db/schema";
import { fetchWithTimeout, sleep, type FeedSource } from "../types";

const EPSS_URL = "https://api.first.org/data/v1/epss";
const BATCH = 100;

interface EpssRow {
  cve: string;
  epss: string;
  percentile: string;
}

export const epssSource: FeedSource = {
  name: "epss",
  async run() {
    const held = await db.select({ cveId: cves.cveId }).from(cves);
    const ids = held.map((r) => r.cveId);

    const rows: NewCve[] = [];
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      const res = await fetchWithTimeout(
        `${EPSS_URL}?cve=${batch.join(",")}&limit=${BATCH}`,
      );
      const body = (await res.json()) as { data: EpssRow[] };
      for (const d of body.data ?? []) {
        rows.push({
          cveId: d.cve,
          epssScore: d.epss,
          epssPercentile: d.percentile,
        });
      }
      if (i + BATCH < ids.length) await sleep(1_000);
    }

    return {
      itemsFetched: rows.length,
      cves: rows,
      cveUpdateColumns: ["epssScore", "epssPercentile"],
    };
  },
};
