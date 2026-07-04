import { desc, eq, and, sql } from "drizzle-orm";
import { db } from "../db";
import { cves, ingestionRuns, threatEvents, type NewCve, type NewThreatEvent } from "../db/schema";
import type { Cursor, FeedSource, RunSummary } from "./types";

const CHUNK = 500;

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function lastSuccessfulCursor(source: string): Promise<Cursor | null> {
  const [row] = await db
    .select({ cursor: ingestionRuns.cursor })
    .from(ingestionRuns)
    .where(and(eq(ingestionRuns.source, source), eq(ingestionRuns.status, "success")))
    .orderBy(desc(ingestionRuns.id))
    .limit(1);
  return (row?.cursor as Cursor) ?? null;
}

async function upsertCves(
  rows: NewCve[],
  updateColumns: (keyof NewCve)[],
  descriptionAsFallback: boolean,
): Promise<number> {
  let count = 0;
  for (const chunk of chunks(rows, CHUNK)) {
    const set: Record<string, unknown> = {};
    for (const col of updateColumns) {
      set[col] = sql.raw(`excluded.${cves[col].name}`);
    }
    if (descriptionAsFallback) {
      set.description = sql`coalesce(${cves.description}, excluded.description)`;
    }
    const res = await db
      .insert(cves)
      .values(chunk)
      .onConflictDoUpdate({ target: cves.cveId, set })
      .returning({ id: cves.cveId });
    count += res.length;
  }
  return count;
}

async function insertEvents(rows: NewThreatEvent[]): Promise<number> {
  let inserted = 0;
  for (const chunk of chunks(rows, CHUNK)) {
    const res = await db
      .insert(threatEvents)
      .values(chunk)
      .onConflictDoNothing({ target: threatEvents.dedupKey })
      .returning({ id: threatEvents.id });
    inserted += res.length;
  }
  return inserted;
}

/** Run one source end-to-end with run tracking. Never throws — errors land in ingestion_runs + summary. */
export async function runSource(source: FeedSource): Promise<RunSummary> {
  const started = Date.now();
  const [run] = await db
    .insert(ingestionRuns)
    .values({ source: source.name, status: "running" })
    .returning({ id: ingestionRuns.id });

  try {
    const cursor = await lastSuccessfulCursor(source.name);
    const result = await source.run(cursor);

    let upserted = 0;
    if (result.cves?.length) {
      upserted += await upsertCves(
        result.cves,
        result.cveUpdateColumns ?? [],
        result.cveDescriptionAsFallback ?? false,
      );
    }
    if (result.events?.length) {
      upserted += await insertEvents(result.events);
    }

    await db
      .update(ingestionRuns)
      .set({
        status: "success",
        finishedAt: new Date(),
        itemsFetched: result.itemsFetched,
        itemsUpserted: upserted,
        cursor: result.nextCursor ?? cursor ?? null,
      })
      .where(eq(ingestionRuns.id, run.id));

    return {
      source: source.name,
      status: "success",
      itemsFetched: result.itemsFetched,
      itemsUpserted: upserted,
      durationMs: Date.now() - started,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(ingestionRuns)
      .set({ status: "error", finishedAt: new Date(), error: message })
      .where(eq(ingestionRuns.id, run.id));
    return {
      source: source.name,
      status: "error",
      itemsFetched: 0,
      itemsUpserted: 0,
      durationMs: Date.now() - started,
      error: message,
    };
  }
}
