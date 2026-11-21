import { CustomerGate } from "@/components/AuthGate";
import { CustomerSettings } from "@/components/CustomerExtras";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <CustomerGate>
      <CustomerSettings />
    </CustomerGate>
  );
}
