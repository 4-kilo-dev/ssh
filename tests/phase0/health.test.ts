/**
 * Phase 0 Integration Tests: Foundations & Test Harness
 *
 * Requirements verified:
 * 1. Test database connection & migrations:
 *    Proves the harness connects to Postgres in Docker, creates a clean schema,
 *    and runs Drizzle migrations without errors.
 * 2. Database round-trip:
 *    Proves write & read operations function properly against the test database.
 * 3. Route handler integration (GET /api/health):
 *    Proves that Next.js API route handlers can resolve the database connection
 *    via getDb() and execute queries.
 * 4. Route handler mutation (POST /api/health):
 *    Proves that data posted through the API persists to the database and returns correctly.
 * 5. Isolation & Teardown:
 *    Proves that cleanup closes connections and resetting the schema wipes previous data.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDatabase, type TestDbInstance } from "../helpers/db";
import { healthCheck } from "@/lib/db/schema";
import { GET, POST } from "@/app/api/health/route";
import { eq } from "drizzle-orm";

describe("Phase 0 — Database and Test Harness", () => {
  let testDb: TestDbInstance;

  beforeAll(async () => {
    // Spin up the fresh test database schema and run migrations
    testDb = await setupTestDatabase();
  });

  afterAll(async () => {
    // Gracefully tear down database pool connections
    await testDb.cleanup();
  });

  it("proves the test DB harness creates the schema and migrates tables", async () => {
    // Query pg_tables to prove the health_check table was created by the migration
    const res = await testDb.pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'health_check';"
    );
    expect(res.rows.length).toBe(1);
    expect(res.rows[0].table_name).toBe("health_check");
  });

  it("proves basic database round-trip (insert and query)", async () => {
    // Insert a test row into health_check
    const [inserted] = await testDb.db
      .insert(healthCheck)
      .values({ note: "harness verification" })
      .returning();

    expect(inserted).toBeDefined();
    expect(inserted.id).toBeGreaterThan(0);
    expect(inserted.note).toBe("harness verification");
    expect(inserted.createdAt).toBeInstanceOf(Date);

    // Query it back
    const [found] = await testDb.db
      .select()
      .from(healthCheck)
      .where(eq(healthCheck.id, inserted.id));

    expect(found).toBeDefined();
    expect(found.note).toBe("harness verification");
  });

  it("proves GET /api/health route handler returns healthy status and connects to DB", async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.status).toBe("ok");
    expect(json.db).toBe(true);
    expect(typeof json.count).toBe("number");
  });

  it("proves POST /api/health route handler writes to the database and returns the record", async () => {
    const request = new Request("http://localhost:3000/api/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: "end-to-end route test" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.status).toBe("ok");
    expect(json.data).toBeDefined();
    expect(json.data.note).toBe("end-to-end route test");

    // Verify it is actually in the database
    const [persisted] = await testDb.db
      .select()
      .from(healthCheck)
      .where(eq(healthCheck.id, json.data.id));

    expect(persisted).toBeDefined();
    expect(persisted.note).toBe("end-to-end route test");
  });

  it("proves a fresh setupTestDatabase run provides a clean slate without leftover rows", async () => {
    // Re-initialize test DB to prove isolation
    const secondInstance = await setupTestDatabase();
    try {
      const rows = await secondInstance.db.select().from(healthCheck);
      // Because migrations wiped and recreated public schema, count must be 0
      expect(rows.length).toBe(0);
    } finally {
      await secondInstance.cleanup();
    }
  });
});
