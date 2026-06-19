import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// ─────────────────────────────────────────────────────────────────────────────
// Drizzle client over Supabase Postgres.
//
// Initialized LAZILY: importing this module never opens a connection, so a
// build with no DATABASE_URL (e.g. Next's page-data collection) won't crash.
// A single connection is reused across hot reloads / serverless invocations.
// ─────────────────────────────────────────────────────────────────────────────

type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  _pgClient?: ReturnType<typeof postgres>;
  _db?: Db;
};

function getDb(): Db {
  if (globalForDb._db) return globalForDb._db;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add your Supabase Postgres connection string to .env.local.",
    );
  }

  // prepare:false is recommended for Supabase's transaction pooler (port 6543).
  const client = globalForDb._pgClient ?? postgres(url, { prepare: false });
  const instance = drizzle(client, { schema });

  if (process.env.NODE_ENV !== "production") {
    globalForDb._pgClient = client;
    globalForDb._db = instance;
  }
  return instance;
}

// Proxy so callers keep using `db.select()...` while connection stays lazy.
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const real = getDb();
    return Reflect.get(real as object, prop, receiver);
  },
}) as Db;

export { schema };
