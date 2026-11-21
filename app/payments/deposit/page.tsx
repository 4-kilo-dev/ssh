import { CustomerGate } from "@/components/AuthGate";
import { PaymentScreen } from "@/components/CoreFlow";

export const dynamic = "force-dynamic";

export default function DepositPaymentPage() {
  return (
    <CustomerGate>
      <PaymentScreen />
    </CustomerGate>
  );
}
