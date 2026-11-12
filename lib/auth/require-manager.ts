import { getSessionTokenFromRequest, validateSession } from "./session";
import type { Account } from "../db/schema";

export interface AuthManagerResult {
  account: Account | null;
  error: string | null;
  status: 200 | 401 | 403;
}

/**
 * Validates the request session and verifies that the authenticated user is a venue manager.
 */
export async function authenticateManager(req: Request): Promise<AuthManagerResult> {
  const sessionToken = getSessionTokenFromRequest(req);
  if (!sessionToken) {
    return { account: null, error: "Authentication required", status: 401 };
  }

  const result = await validateSession(sessionToken);
  if (!result.valid || !result.account) {
    return { account: null, error: "Invalid or expired session", status: 401 };
  }

  if (result.account.role !== "venue_manager") {
    return { account: null, error: "Forbidden: venue_manager role required", status: 403 };
  }

  return { account: result.account, error: null, status: 200 };
}
