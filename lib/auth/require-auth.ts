import { getSessionTokenFromRequest, validateSession } from "./session";
import type { Account } from "../db/schema";

export interface AuthSessionResult {
  account: Account | null;
  error: string | null;
  status: 200 | 401 | 403;
}

/**
 * Validates the request session and returns the authenticated account.
 */
export async function authenticateSession(req: Request): Promise<AuthSessionResult> {
  const sessionToken = getSessionTokenFromRequest(req);
  if (!sessionToken) {
    return { account: null, error: "Authentication required", status: 401 };
  }

  const result = await validateSession(sessionToken);
  if (!result.valid || !result.account) {
    return { account: null, error: "Invalid or expired session", status: 401 };
  }

  return { account: result.account, error: null, status: 200 };
}
