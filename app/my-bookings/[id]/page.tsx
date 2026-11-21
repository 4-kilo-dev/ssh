"use client";

import { useParams } from "next/navigation";
import { CustomerGate } from "@/components/AuthGate";
import { CustomerBookingDetail } from "@/components/CustomerExtras";

export default function MyBookingDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  return (
    <CustomerGate>
      <CustomerBookingDetail bookingId={id} />
    </CustomerGate>
  );
}
