"use client";

import { useParams } from "next/navigation";
import { VenueDetails } from "@/components/CoreFlow";

export default function VenueDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  return <VenueDetails venueId={id} />;
}
