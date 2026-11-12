/**
 * Database client factory.
 *
 * We deliberately expose a factory (`createDb`) rather than a single global
 * connection so the test harness can create an isolated pool against
 * TEST_DATABASE_URL and dispose of it cleanly per run, while the app uses a
 * lazily-created singleton against DATABASE_URL.
 */
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

export type DbHandle = {
  db: Database;
  pool: Pool;
  close: () => Promise<void>;
};

/** Create a fresh pool + Drizzle instance for a given connection string. */
export function createDb(connectionString: string): DbHandle {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });
  return { db, pool, close: () => pool.end() };
}

let singleton: DbHandle | null = null;

/** Override or clear the singleton handle (used by tests to inject an isolated test DB). */
export function setDb(handle: DbHandle | null): void {
  singleton = handle;
}

/** App-wide database handle, created lazily from DATABASE_URL. */
export function getDb(): Database {
  if (!singleton) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    singleton = createDb(connectionString);
  }
  return singleton.db;
}
