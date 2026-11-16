import { Suspense } from "react";
import { PageRouter } from "@/components/PageRouter";
import { LocaleLoading } from "@/components/LocaleLoading";

// Keep this route out of the catch-all page. Vercel can otherwise serve a stale
// cached version of the dynamic route and return a 500 for /sign-in.
export const dynamic = "force-dynamic";

export default function SignInPage() {
  return <Suspense fallback={<LocaleLoading />}><PageRouter /></Suspense>;
}
