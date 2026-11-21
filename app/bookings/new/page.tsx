import { CustomerGate } from "@/components/AuthGate";
import { BookingRequestForm } from "@/components/CoreFlow";

export const dynamic = "force-dynamic";

export default function NewBookingPage() {
  return (
    <CustomerGate>
      <BookingRequestForm />
    </CustomerGate>
  );
}
