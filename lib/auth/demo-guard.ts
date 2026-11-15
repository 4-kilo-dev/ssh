import { NextResponse } from "next/server";

/**
 * The /api/auth/demo-* routes sign anyone in as a preset account (including
 * super_admin) and reset that account's password. They exist for local demos
 * only, so they are switched off in production unless explicitly allowed.
 */
export function isDemoAuthEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_AUTH === "true";
}

/** Returns a 404 response when demo sign-in is disabled, otherwise null. */
export function demoAuthDisabledResponse(): NextResponse | null {
  if (isDemoAuthEnabled()) {
    return null;
  }
  return NextResponse.json(
    { status: "error", error: "Demo sign-in is turned off on this server" },
    { status: 404 }
  );
}
