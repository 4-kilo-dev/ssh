import { VendorGate } from "@/components/AuthGate";
import { VendorListingPreview } from "@/components/VendorExtras";

export const dynamic = "force-dynamic";

export default function VendorListingPreviewPage() {
  return (
    <VendorGate>
      <VendorListingPreview />
    </VendorGate>
  );
}
