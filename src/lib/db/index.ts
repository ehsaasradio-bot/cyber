import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { dbInstance?: Db };

// On Workers a postgres.js connection is bound to the I/O context of the request
// that opened it and cannot be reused by a later request (doing so makes the
// Worker hang). So on Workers we scope one connection per request, keyed on the
// per-request execution context. In Node (local dev, `next build`, CI ingest)
// getCloudflareContext() throws and we reuse a single module-global client.
const perRequest = new WeakMap<object, Db>();

function makeDb(url: string): Db {
  return drizzle(postgres(url, { max: 5, onnotice: () => {}, fetch_types: false }), {
    schema,
  });
}

function getDb(): Db {
  try {
    const cf = getCloudflareContext();
    const ctx = cf.ctx as object | undefined;
    const env = cf.env as unknown as Record<string, { connectionString?: string } | undefined>;
    const url = env.HYPERDRIVE?.connectionString ?? process.env.DATABASE_URL!;
    if (ctx) {
      let inst = perRequest.get(ctx);
      if (!inst) {
        inst = makeDb(url);
        perRequest.set(ctx, inst);
      }
      return inst;
    }
    // On Workers but without a request context: don't cache across requests.
    return makeDb(url);
  } catch {
    // Not on Workers — reuse a single client for the process.
    return (globalForDb.dbInstance ??= makeDb(process.env.DATABASE_URL!));
  }
}

// Lazy proxy so the connection is created on first use within a request. Keeps
// existing `db.select()...` call sites unchanged.
export const db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export * as tables from "./schema";
