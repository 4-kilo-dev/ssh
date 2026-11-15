import type { useRouter } from "expo-router";
import type { Account } from "@/api/types";
import { HOME, sideOf } from "@/utils/roles";

type Router = ReturnType<typeof useRouter>;

/**
 * Where to go after signing in / up:
 * - Customers go back to what they were doing (e.g. the booking sheet, which
 *   then sends the request by itself).
 * - Managers, vendors and admins close the sheets; their area's layout then
 *   redirects to their own home screen.
 */
export function leaveAuthScreen(router: Router, account: Account) {
  const side = sideOf(account);
  if (side === "customer") {
    if (router.canGoBack()) router.back();
    else router.replace("/");
    return;
  }
  if (router.canDismiss()) router.dismissAll();
  else router.replace(HOME[side]);
}
