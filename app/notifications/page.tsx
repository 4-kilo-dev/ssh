import { CustomerGate } from "@/components/AuthGate";
import { CustomerNotifications } from "@/components/CustomerExtras";

export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  return (
    <CustomerGate>
      <CustomerNotifications />
    </CustomerGate>
  );
}
