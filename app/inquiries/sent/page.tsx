import { CustomerGate } from "@/components/AuthGate";
import { InquirySent } from "@/components/VendorFlow";

export const dynamic = "force-dynamic";

export default function InquirySentPage() {
  return (
    <CustomerGate>
      <InquirySent />
    </CustomerGate>
  );
}
