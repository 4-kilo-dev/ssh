"use client";

import { useParams } from "next/navigation";
import { VendorGate } from "@/components/AuthGate";
import { VendorFeeStatementDetail } from "@/components/VendorFlow";

export default function VendorFeeStatementDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  return (
    <VendorGate>
      <VendorFeeStatementDetail statementId={id} />
    </VendorGate>
  );
}
