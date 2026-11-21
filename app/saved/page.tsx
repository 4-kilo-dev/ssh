import { CustomerGate } from "@/components/AuthGate";
import { CustomerSavedVendors } from "@/components/CustomerExtras";

export const dynamic = "force-dynamic";

export default function SavedVendorsPage() {
  return (
    <CustomerGate>
      <CustomerSavedVendors />
    </CustomerGate>
  );
}
