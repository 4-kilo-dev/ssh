import { NextRequest, NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth/require-auth";
import { listAuditLogs } from "@/lib/services/audit-service";

export async function GET(req: NextRequest) {
  const auth = await authenticateSession(req);
  if (!auth.account) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (auth.account.role !== "super_admin") {
    return NextResponse.json(
      { error: "Forbidden: Super Admin access required" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const targetType = searchParams.get("targetType") || undefined;
  const action = searchParams.get("action") || undefined;
  const actorId = searchParams.get("actorId") || undefined;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;

  try {
    const logs = await listAuditLogs({
      callerId: auth.account.id,
      targetType,
      action,
      actorId,
      limit,
    });

    return NextResponse.json({ auditLogs: logs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
