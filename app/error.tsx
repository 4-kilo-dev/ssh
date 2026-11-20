"use client";

import { useEffect } from "react";
import { t, type Locale } from "@/lib/i18n";

/**
 * Route-level error boundary. Rendered inside the root layout, so it stays
 * within the app chrome. `global-error.tsx` handles failures in the layout
 * itself. Locale is read from <html lang> rather than DemoProvider, because an
 * error may have originated inside that provider.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error boundary caught:", error);
  }, [error]);

  const locale: Locale =
    typeof document !== "undefined" && document.documentElement.lang === "am" ? "am" : "en";

  return (
    <section className="card access-denied" role="alert">
      <h1>{t("loadError", locale)}</h1>
      {error.digest && (
        <p className="muted" style={{ fontFamily: "monospace", fontSize: "12px" }}>
          {error.digest}
        </p>
      )}
      <button type="button" className="btn btn-primary" onClick={() => reset()}>
        {t("retry", locale)}
      </button>
    </section>
  );
}
