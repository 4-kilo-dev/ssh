import { CustomerGate } from "@/components/AuthGate";
import { CustomerBookings } from "@/components/CustomerExtras";

export const dynamic = "force-dynamic";

export default function MyBookingsPage() {
  return (
    <CustomerGate>
      <CustomerBookings />
    </CustomerGate>
  );
}
