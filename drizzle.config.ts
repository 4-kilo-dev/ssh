/**
 * Drizzle Kit config — used to generate SQL migrations from lib/db/schema.ts
 * and to apply them. Migrations are written to ./drizzle.
 */
import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config();

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://addisvenue:addisvenue@localhost:5434/addisvenue",
  },
});
