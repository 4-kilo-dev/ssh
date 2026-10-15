"use client";

import { useEffect, useState } from "react";
import { ExternalLink, RotateCcw, Smartphone } from "lucide-react";
import { useDemo } from "@/lib/store";
import { t } from "@/lib/i18n";
import "./preview.css";

const widths = [375, 390, 430] as const;

/**
 * Laptop-friendly preview of the Mini App.
 *
 * The /tg layout is driven by the same media queries as the web app, which
 * evaluate against the *viewport*. A 390px-wide container on a desktop monitor
 * would therefore render the desktop layout inside a narrow box. An iframe gets
 * its own 390px viewport, so the real phone layout is shown with no duplicated
 * responsive CSS — and because it is same-origin, it shares the demo state with
 * the rest of the app.
 */
export default function TgPreviewPage() {
  const { locale } = useDemo();
  const [width, setWidth] = useState<number>(390);
  const [nonce, setNonce] = useState(0);

  // AppShell is skipped on this route, so set the document language here.
  useEffect(() => { document.documentElement.lang = locale; document.documentElement.dir = "ltr"; }, [locale]);

  return <div className="tgpreview">
    <header className="tgpreview-bar">
      <div>
        <p className="eyebrow"><Smartphone size={14} aria-hidden="true" />{t("simulationOnly", locale)}</p>
        <h1>{t("tgPreviewTitle", locale)}</h1>
      </div>
      <div className="tgpreview-controls">
        {widths.map((option) => <button
          key={option}
          type="button"
          className="btn btn-secondary"
          aria-pressed={width === option}
          onClick={() => setWidth(option)}
        >{option}px</button>)}
        <button type="button" className="btn btn-secondary" onClick={() => setNonce((value) => value + 1)}>
          <RotateCcw size={15} aria-hidden="true" />{t("tgPreviewReload", locale)}
        </button>
        <a className="btn btn-primary" href="/tg" target="_blank" rel="noreferrer">
          <ExternalLink size={15} aria-hidden="true" />{t("tgPreviewOpen", locale)}
        </a>
      </div>
    </header>
    <p className="tgpreview-hint">{t("tgPreviewHint", locale)}</p>
    <div className="tgpreview-stage">
      <iframe
        key={nonce}
        src="/tg"
        title={t("tgPreviewTitle", locale)}
        className="tgpreview-frame"
        style={{ width, height: "min(844px, calc(100dvh - 210px))" }}
      />
    </div>
  </div>;
}
