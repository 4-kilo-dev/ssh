import { Suspense } from "react";
import { PageRouter } from "@/components/PageRouter";
import { LocaleLoading } from "@/components/LocaleLoading";

// Use a concrete route for the main customer destination on Vercel.
export const dynamic = "force-dynamic";

export default function MyEventPage() {
  return <Suspense fallback={<LocaleLoading />}><PageRouter /></Suspense>;
}
