"use client";

import { VenueBrowser } from "@/components/CoreFlow";
import { TgVenueBrowser } from "@/components/tg/TgVenueBrowser";


/** /venues: use the original venue cards and controls with the expanded filters. */
export function VenueBrowserGate() {
  return <VenueBrowser />;
}

/** /tg/venues: keep the original Mini App venue UI. */
export function TgVenueBrowserGate() {
  return <TgVenueBrowser />;
}
