import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { healthCheck } from "@/lib/db/schema";

/**
 * GET /api/health
 * Proves database connectivity and query capability from Next.js route handlers.
 */
export async function GET() {
  try {
    const db = getDb();
    const rows = await db.select().from(healthCheck);
    return NextResponse.json({
      status: "ok",
      db: true,
      count: rows.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/health
 * Proves database mutation capability from Next.js route handlers.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({ note: "health check" }));
    const note = typeof body?.note === "string" ? body.note : "health check";

    const db = getDb();
    const [inserted] = await db
      .insert(healthCheck)
      .values({ note })
      .returning();

    return NextResponse.json({
      status: "ok",
      data: inserted,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
