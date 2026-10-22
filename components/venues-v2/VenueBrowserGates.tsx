"use client";

import { VenueBrowser } from "@/components/CoreFlow";
import { TgVenueBrowser } from "@/components/tg/TgVenueBrowser";
import { useFiltersV2Flag } from "@/lib/venue-filters-v2";
import { VenueBrowserV2 } from "./VenueBrowserV2";
import { TgVenueBrowserV2 } from "./TgVenueBrowserV2";

/** /venues: the v2 browser only when the URL has ?filters=v2, otherwise the existing browser with no wrapper. */
export function VenueBrowserGate() {
  return useFiltersV2Flag() ? <VenueBrowserV2 /> : <VenueBrowser />;
}

/** /tg/venues: same gate for the Telegram Mini App browser. */
export function TgVenueBrowserGate() {
  return useFiltersV2Flag() ? <TgVenueBrowserV2 /> : <TgVenueBrowser />;
}
