import { CustomerGate } from "@/components/AuthGate";
import { MyEventDashboard } from "@/components/CoreFlow";

export const dynamic = "force-dynamic";

export default function MyEventPage() {
  return (
    <CustomerGate>
      <MyEventDashboard />
    </CustomerGate>
  );
}
