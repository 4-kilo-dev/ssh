import { VendorGate } from "@/components/AuthGate";
import { VendorListingEditor } from "@/components/VendorExtras";

export const dynamic = "force-dynamic";

export default function VendorProfileEditorPage() {
  return (
    <VendorGate>
      <VendorListingEditor />
    </VendorGate>
  );
}
