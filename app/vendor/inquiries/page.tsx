import { VendorGate } from "@/components/AuthGate";
import { VendorInquiries } from "@/components/VendorFlow";

export const dynamic = "force-dynamic";

export default function VendorInquiriesPage() {
  return (
    <VendorGate>
      <VendorInquiries />
    </VendorGate>
  );
}
