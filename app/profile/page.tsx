import { Suspense } from "react";
import { PageRouter } from "@/components/PageRouter";
import { LocaleLoading } from "@/components/LocaleLoading";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  return <Suspense fallback={<LocaleLoading />}><PageRouter /></Suspense>;
}
