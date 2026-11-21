import { VendorGate } from "@/components/AuthGate";
import { VendorApplicationStatus } from "@/components/VendorExtras";

export const dynamic = "force-dynamic";

export default function VendorApplicationStatusPage() {
  return (
    <VendorGate>
      <VendorApplicationStatus />
    </VendorGate>
  );
}
