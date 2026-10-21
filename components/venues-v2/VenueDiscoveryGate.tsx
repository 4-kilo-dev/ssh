"use client";

import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { VenueBrowserV2 } from "./VenueBrowserV2";

/**
 * Shows the v2 venue filters and card only when the URL has ?filters=v2.
 * Without the flag it renders `fallback`, the existing browser, unchanged.
 */
export function VenueDiscoveryGate({ variant, fallback }: { variant: "web" | "tg"; fallback: ReactNode }) {
  const enabled = useSearchParams().get("filters") === "v2";
  return enabled ? <VenueBrowserV2 variant={variant} /> : <>{fallback}</>;
}
