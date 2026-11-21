import { VendorGate } from "@/components/AuthGate";
import { VendorSettings } from "@/components/VendorExtras";

export const dynamic = "force-dynamic";

export default function VendorSettingsPage() {
  return (
    <VendorGate>
      <VendorSettings />
    </VendorGate>
  );
}
