/**
 * Optional in-process ingestion scheduling for `next start`.
 * Off by default — enable with ENABLE_CRON=1. The documented alternative is
 * OS cron calling `npm run ingest -- --source=...` (see README).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.ENABLE_CRON !== "1") return;

  const { ingest, FAST_SOURCES, SLOW_SOURCES } = await import("./lib/ingest");

  const run = async (names: string[]) => {
    try {
      const summaries = await ingest(names);
      for (const s of summaries) {
        console.log(
          `[cron] ${s.source}: ${s.status} fetched=${s.itemsFetched} upserted=${s.itemsUpserted}`,
        );
      }
    } catch (err) {
      console.error("[cron] ingest failed:", err);
    }
  };

  setInterval(() => run(FAST_SOURCES), 15 * 60 * 1000);
  setInterval(() => run(SLOW_SOURCES), 60 * 60 * 1000);
  console.log("[cron] in-process ingestion scheduling enabled (fast: 15m, slow: 60m)");
}
