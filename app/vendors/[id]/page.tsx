"use client";

import { useParams } from "next/navigation";
import { VendorProfile } from "@/components/VendorFlow";

export default function VendorDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  return <VendorProfile vendorId={id} />;
}
