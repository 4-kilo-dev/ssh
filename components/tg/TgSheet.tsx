"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { t } from "@/lib/i18n";
import { useDemo } from "@/lib/store";

/**
 * Bottom sheet used in place of a modal on small screens.
 *
 * Modal-dialog semantics: moves focus in on open, traps Tab, closes on Escape
 * or backdrop press, and returns focus to the trigger on close. The mobile
 * rules for /tg ask for sheets rather than centred dialogs.
 */
export function TgSheet({ open, onClose, title, children, footer }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { locale } = useDemo();
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab") return;
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return <div className="tg-sheet-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="tg-sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={panelRef}>
      <span className="tg-sheet-handle" aria-hidden="true" />
      <div className="tg-sheet-head">
        <h2>{title}</h2>
        <button type="button" className="tg-icon-btn" onClick={onClose} aria-label={t("tgClose", locale)}>
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="tg-sheet-body">{children}</div>
      {footer && <div className="tg-sheet-foot">{footer}</div>}
    </div>
  </div>;
}
