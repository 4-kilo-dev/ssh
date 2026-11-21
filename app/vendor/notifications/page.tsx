import { VendorGate } from "@/components/AuthGate";
import { VendorNotifications } from "@/components/VendorExtras";

export const dynamic = "force-dynamic";

export default function VendorNotificationsPage() {
  return (
    <VendorGate>
      <VendorNotifications />
    </VendorGate>
  );
}
