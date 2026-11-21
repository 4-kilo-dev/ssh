import { CustomerGate } from "@/components/AuthGate";
import { InquiryRequest } from "@/components/VendorFlow";

export const dynamic = "force-dynamic";

export default function NewInquiryPage() {
  return (
    <CustomerGate>
      <InquiryRequest />
    </CustomerGate>
  );
}
