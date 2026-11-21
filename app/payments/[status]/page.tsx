"use client";

import { useParams } from "next/navigation";
import { CustomerGate } from "@/components/AuthGate";
import { PaymentScreen } from "@/components/CoreFlow";

export default function PaymentStatusPage() {
  const params = useParams();
  const status = Array.isArray(params.status) ? params.status[0] : (params.status as string);
  if (!["success", "failed", "receipt"].includes(status)) {
    return (
      <CustomerGate>
        <PaymentScreen />
      </CustomerGate>
    );
  }
  return (
    <CustomerGate>
      <PaymentScreen receiptOnly />
    </CustomerGate>
  );
}
