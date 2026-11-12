import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "@/lib/db/schema";
import { setDb, type DbHandle } from "@/lib/db/client";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ??
  "postgres://addisvenue:addisvenue@localhost:5434/addisvenue_test";

export interface TestDbInstance {
  db: ReturnType<typeof drizzle<typeof schema>>;
  pool: Pool;
  cleanup: () => Promise<void>;
}

/**
 * Creates an isolated test database harness:
 * 1. Connects to TEST_DATABASE_URL.
 * 2. Wipes public schema to ensure a 100% clean slate.
 * 3. Applies Drizzle migrations from ./drizzle.
 * 4. Injects the test DB handle into the app client singleton so route handlers hit it.
 * 5. Provides a teardown function to close pools and reset state.
 */
export async function setupTestDatabase(): Promise<TestDbInstance> {
  const pool = new Pool({ connectionString: TEST_DB_URL });

  // Reset the public schema and drizzle metadata schema to ensure a complete clean slate
  await pool.query(`
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
    DROP SCHEMA IF EXISTS drizzle CASCADE;
  `);

  const db = drizzle(pool, { schema });

  // Apply all pending migrations from the migrations folder
  const migrationsFolder = path.resolve(process.cwd(), "drizzle");
  await migrate(db, { migrationsFolder });

  const handle: DbHandle = {
    db,
    pool,
    close: () => pool.end(),
  };

  // Point getDb() in route handlers to this test database instance
  setDb(handle);

  return {
    db,
    pool,
    cleanup: async () => {
      setDb(null);
      await pool.end();
    },
  };
}
