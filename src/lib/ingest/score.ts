import { sql } from "drizzle-orm";
import { db } from "../db";

/** Priority score weights: tune here, nowhere else. */
const W_CVSS = 0.4;
const W_EPSS = 0.4;
const W_KEV = 0.2;

export async function recomputePriorityScores(): Promise<number> {
  const res = await db.execute(
    sql.raw(`
    UPDATE cves SET priority_score = round(
      100 * (
        ${W_CVSS} * coalesce(cvss_score, 0) / 10.0 +
        ${W_EPSS} * coalesce(epss_score, 0) +
        ${W_KEV} * is_kev::int
      ), 2)
  `),
  );
  return res.count ?? 0;
}
