import { CustomerGate } from "@/components/AuthGate";
import { CustomerInquiries } from "@/components/VendorFlow";

export const dynamic = "force-dynamic";

export default function MyInquiriesPage() {
  return (
    <CustomerGate>
      <CustomerInquiries />
    </CustomerGate>
  );
}
