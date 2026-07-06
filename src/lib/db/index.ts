import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  dbClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.dbClient ??
  postgres(process.env.DATABASE_URL!, { max: 5, onnotice: () => {} });

// Reuse the connection pool across Next.js dev-server hot reloads
if (process.env.NODE_ENV !== "production") globalForDb.dbClient = client;

export const db = drizzle(client, { schema });
export * as tables from "./schema";
