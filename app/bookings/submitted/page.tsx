import { CustomerGate } from "@/components/AuthGate";
import { BookingSubmitted } from "@/components/CoreFlow";

export const dynamic = "force-dynamic";

export default function BookingSubmittedPage() {
  return (
    <CustomerGate>
      <BookingSubmitted />
    </CustomerGate>
  );
}
