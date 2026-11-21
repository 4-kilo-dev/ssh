import { CustomerGate } from "@/components/AuthGate";
import { CustomerPayments } from "@/components/CustomerExtras";

export const dynamic = "force-dynamic";

export default function MyPaymentsPage() {
  return (
    <CustomerGate>
      <CustomerPayments />
    </CustomerGate>
  );
}
