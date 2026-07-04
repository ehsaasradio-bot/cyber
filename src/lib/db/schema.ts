import {
  bigint,
  boolean,
  char,
  date,
  doublePrecision,
  index,
  inet,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const cves = pgTable(
  "cves",
  {
    cveId: text("cve_id").primaryKey(),
    description: text("description"),
    cvssScore: numeric("cvss_score", { precision: 3, scale: 1 }),
    cvssSeverity: text("cvss_severity"),
    epssScore: numeric("epss_score", { precision: 6, scale: 5 }),
    epssPercentile: numeric("epss_percentile", { precision: 6, scale: 5 }),
    isKev: boolean("is_kev").notNull().default(false),
    kevDateAdded: date("kev_date_added"),
    kevRansomware: boolean("kev_ransomware").notNull().default(false),
    vendor: text("vendor"),
    product: text("product"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    lastModified: timestamp("last_modified", { withTimezone: true }),
    priorityScore: numeric("priority_score", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    metadata: jsonb("metadata").notNull().default({}),
  },
  (t) => [
    index("cves_priority_idx").on(t.priorityScore.desc()),
    index("cves_last_modified_idx").on(t.lastModified.desc()),
  ],
);

export const threatEvents = pgTable(
  "threat_events",
  {
    id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    dedupKey: text("dedup_key").notNull(),
    type: text("type").notNull(),
    source: text("source").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    severity: text("severity").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lat: doublePrecision("lat"),
    lon: doublePrecision("lon"),
    country: char("country", { length: 2 }),
    city: text("city"),
    ip: inet("ip"),
    metadata: jsonb("metadata").notNull().default({}),
  },
  (t) => [
    uniqueIndex("threat_events_dedup_idx").on(t.dedupKey),
    index("threat_events_occurred_idx").on(t.occurredAt.desc()),
    index("threat_events_type_occurred_idx").on(t.type, t.occurredAt.desc()),
    index("threat_events_geo_idx")
      .on(t.occurredAt.desc())
      .where(sql`${t.lat} IS NOT NULL`),
  ],
);

export const indexSnapshots = pgTable(
  "index_snapshots",
  {
    id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    snappedAt: date("snapped_at").notNull(),
    scope: text("scope").notNull(), // global | region | sector
    key: text("key").notNull(), // 'global', region code, or sector name
    score: numeric("score", { precision: 5, scale: 2 }).notNull(),
  },
  (t) => [uniqueIndex("index_snapshots_day_idx").on(t.snappedAt, t.scope, t.key)],
);

export const ingestionRuns = pgTable("ingestion_runs", {
  id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  source: text("source").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: text("status").notNull().default("running"),
  itemsFetched: integer("items_fetched").notNull().default(0),
  itemsUpserted: integer("items_upserted").notNull().default(0),
  error: text("error"),
  cursor: jsonb("cursor"),
});

export type Cve = typeof cves.$inferSelect;
export type NewCve = typeof cves.$inferInsert;
export type ThreatEvent = typeof threatEvents.$inferSelect;
export type NewThreatEvent = typeof threatEvents.$inferInsert;
