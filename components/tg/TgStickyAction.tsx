"use client";

import { useEffect, useState } from "react";
import { isTelegramMainButtonAvailable, showTelegramMainButton } from "@/lib/telegram";

/**
 * Sticky primary action for the Mini App booking and payment screens.
 *
 * It does not own any flow logic: it finds the screen's real primary button via
 * `[data-tg-primary]`, mirrors its label and disabled state, and forwards clicks
 * to it. That keeps one implementation of every flow in the shared components.
 *
 * Inside Telegram the action is mirrored onto the native MainButton instead, so
 * the two never appear at once.
 */
export function TgStickyAction() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [label, setLabel] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [nativeMainButton, setNativeMainButton] = useState(false);

  useEffect(() => { setNativeMainButton(isTelegramMainButtonAvailable()); }, []);

  // Track the current screen's primary action (label changes as forms submit).
  useEffect(() => {
    let frame = 0;
    function read() {
      const element = document.querySelector<HTMLElement>("[data-tg-primary]");
      setTarget(element);
      setLabel(element?.textContent?.trim() ?? "");
      setDisabled(element instanceof HTMLButtonElement ? element.disabled : false);
    }
    // First read runs synchronously so the bar is present on the first paint;
    // later DOM churn is coalesced into an animation frame.
    function schedule() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(read);
    }
    read();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["disabled"],
    });
    return () => { window.cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  const active = Boolean(target && label);

  useEffect(() => {
    if (!nativeMainButton || !active || !target) return;
    return showTelegramMainButton({ text: label, disabled, onClick: () => target.click() });
  }, [nativeMainButton, active, label, disabled, target]);

  if (nativeMainButton || !active) return null;

  return <>
    <div className="tg-sticky-spacer" aria-hidden="true" />
    <div className="tg-sticky-action">
      <button type="button" className="btn btn-primary full-width" disabled={disabled} onClick={() => target?.click()}>
        {label}
      </button>
    </div>
  </>;
}
