"use client";

import { useEffect } from "react";

/**
 * Top-level boundary for errors thrown in the root layout itself. It replaces
 * the whole document, so it must render its own <html>/<body> and cannot rely
 * on the app's global stylesheet being applied. Inline styles are intentional.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f7f7f3",
          color: "#1a1a1a",
          padding: "24px",
        }}
      >
        <main
          style={{
            maxWidth: "420px",
            textAlign: "center",
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: "16px",
            padding: "32px",
          }}
        >
          <h1 style={{ fontSize: "20px", marginBottom: "8px" }}>Something went wrong</h1>
          <p style={{ color: "#555", marginBottom: "20px" }}>
            An unexpected error occurred. Try again, or reload the page.
          </p>
          {error.digest && (
            <p style={{ fontFamily: "monospace", fontSize: "12px", color: "#888", marginBottom: "20px" }}>
              {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              appearance: "none",
              border: "none",
              borderRadius: "10px",
              padding: "10px 18px",
              background: "#0d5d56",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
