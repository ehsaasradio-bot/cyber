import { ingest, availableSources } from "../src/lib/ingest";

async function main() {
  const arg = process.argv
    .slice(2)
    .find((a) => a.startsWith("--source="))
    ?.split("=")[1];
  const names = (arg ?? "all").split(",").map((s) => s.trim());

  console.log(`Ingesting: ${names.join(", ")} (available: all, ${availableSources().join(", ")})`);
  const summaries = await ingest(names);

  for (const s of summaries) {
    const line = `${s.status === "success" ? "✓" : "✗"} ${s.source.padEnd(10)} fetched=${s.itemsFetched} upserted=${s.itemsUpserted} ${(s.durationMs / 1000).toFixed(1)}s`;
    console.log(s.error ? `${line} error=${s.error}` : line);
  }

  const failed = summaries.some((s) => s.status === "error");
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
