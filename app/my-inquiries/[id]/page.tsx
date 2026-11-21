"use client";

import { useParams } from "next/navigation";
import { CustomerGate } from "@/components/AuthGate";
import { CustomerInquiryDetail } from "@/components/VendorFlow";

export default function MyInquiryDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  return (
    <CustomerGate>
      <CustomerInquiryDetail inquiryId={id} />
    </CustomerGate>
  );
}
