"use client";

import { useParams } from "next/navigation";
import { VendorGate } from "@/components/AuthGate";
import { VendorInquiryDetail } from "@/components/VendorFlow";

export default function VendorInquiryDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  return (
    <VendorGate>
      <VendorInquiryDetail inquiryId={id} />
    </VendorGate>
  );
}
