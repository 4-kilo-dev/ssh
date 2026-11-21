import { VendorGate } from "@/components/AuthGate";
import { VendorFeeStatements } from "@/components/VendorFlow";

export const dynamic = "force-dynamic";

export default function VendorFeeStatementsPage() {
  return (
    <VendorGate>
      <VendorFeeStatements />
    </VendorGate>
  );
}
