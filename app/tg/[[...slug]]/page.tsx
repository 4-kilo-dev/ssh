import { Suspense } from "react";
import { TgPageRouter } from "@/components/tg/TgPageRouter";
import { LocaleLoading } from "@/components/LocaleLoading";

export const dynamic = "force-dynamic";

export default function TelegramPage() {
  return <Suspense fallback={<LocaleLoading />}><TgPageRouter /></Suspense>;
}
