import { VendorGate } from "@/components/AuthGate";
import { VendorHome } from "@/components/VendorFlow";

export const dynamic = "force-dynamic";

export default function VendorHomePage() {
  return (
    <VendorGate>
      <VendorHome />
    </VendorGate>
  );
}
