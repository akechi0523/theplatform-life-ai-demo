import { defineConfig } from "drizzle-kit";

// DATABASE_URL must point at the Supabase Postgres connection string
// (Project Settings → Database → Connection string → URI).
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  // drizzle-kit reads this file directly; surface a clear error early.
  console.warn("[drizzle] DATABASE_URL is not set — migrations/studio will fail.");
}

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl ?? "",
  },
  verbose: true,
  strict: true,
});
