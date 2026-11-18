import type { Account, Role } from "@/api/types";

/** Which part of the app a person uses. Guests use the customer side. */
export type Side = "customer" | "manager" | "vendor" | "admin";

export function sideOf(account: Account | null): Side {
  return sideOfRole(account?.role ?? null);
}

export function sideOfRole(role: Role | null): Side {
  switch (role) {
    case "venue_manager":
      return "manager";
    case "vendor":
      return "vendor";
    case "super_admin":
      return "admin";
    default:
      return "customer";
  }
}

/** Home screen for each side. */
export const HOME: Record<Side, "/" | "/requests" | "/listing" | "/admin"> = {
  customer: "/",
  manager: "/requests",
  vendor: "/listing",
  admin: "/admin",
};
