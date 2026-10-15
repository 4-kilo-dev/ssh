/**
 * Minimal, dependency-free wrapper around telegram-web-app.js.
 *
 * Every helper degrades to a no-op when the script is absent or the page is not
 * running inside Telegram, so the /tg Mini App works unchanged in a normal
 * browser (and the mock sign-in fallback takes over).
 *
 * We deliberately never read `themeParams`: the Mini App keeps the product's
 * own colours rather than adopting the Telegram client theme.
 */

export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
};

type TelegramButton = {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
};

type TelegramMainButton = TelegramButton & {
  text: string;
  isActive: boolean;
  isProgressVisible?: boolean;
  setText: (text: string) => void;
  enable: () => void;
  disable: () => void;
  showProgress?: (leaveActive?: boolean) => void;
  hideProgress?: () => void;
  setParams?: (params: { text?: string; is_active?: boolean; is_visible?: boolean }) => void;
};

export type TelegramWebApp = {
  initData: string;
  initDataUnsafe: { user?: TelegramUser };
  version: string;
  platform: string;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  ready: () => void;
  expand: () => void;
  close: () => void;
  onEvent: (event: string, callback: () => void) => void;
  offEvent: (event: string, callback: () => void) => void;
  BackButton: TelegramButton;
  MainButton: TelegramMainButton;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

/**
 * True only for a genuine Telegram launch. The script also loads in ordinary
 * browsers, where `initData` stays empty — that is the reliable signal.
 */
export function isTelegramMiniApp(): boolean {
  const webApp = getTelegramWebApp();
  return Boolean(webApp && webApp.initData);
}

/** Telegram account data when launched inside Telegram, otherwise null. */
export function getTelegramUser(): TelegramUser | null {
  if (!isTelegramMiniApp()) return null;
  return getTelegramWebApp()?.initDataUnsafe?.user ?? null;
}

/** `${first_name} ${last_name}` for the Telegram user, when available. */
export function getTelegramDisplayName(): string | null {
  const user = getTelegramUser();
  if (!user) return null;
  return [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.username || null;
}

/**
 * Boot the Mini App: signal readiness, expand to full height, and keep a live
 * viewport height in `--tg-viewport-height` so the shell can size itself
 * correctly as the Telegram header/footer collapse.
 */
export function initTelegram(): void {
  const webApp = getTelegramWebApp();
  if (!webApp) return;

  webApp.ready();
  webApp.expand();

  const syncViewport = () => {
    const height = webApp.viewportStableHeight || webApp.viewportHeight;
    if (height) document.documentElement.style.setProperty("--tg-viewport-height", `${height}px`);
  };
  syncViewport();
  webApp.onEvent("viewportChanged", syncViewport);

  // Keep our own palette in the Telegram chrome rather than the client theme.
  webApp.setHeaderColor?.("#f7f7f3");
  webApp.setBackgroundColor?.("#f7f7f3");
}

/**
 * True when Telegram's native MainButton should be used for the primary action.
 *
 * Note the `isTelegramMiniApp()` guard: telegram-web-app.js defines
 * `window.Telegram.WebApp` (and its MainButton/BackButton stubs) in ordinary
 * browsers too, so the presence of the object is not evidence that we are
 * actually running inside Telegram. Only `initData` is.
 */
export function isTelegramMainButtonAvailable(): boolean {
  if (!isTelegramMiniApp()) return false;
  return Boolean(getTelegramWebApp()?.MainButton);
}

/**
 * Show/hide the native Back button and wire it to `onClick`.
 * Returns a cleanup that detaches the handler and hides the button.
 */
export function setTelegramBackButton(visible: boolean, onClick: () => void): () => void {
  if (!isTelegramMiniApp()) return () => {};
  const button = getTelegramWebApp()?.BackButton;
  if (!button) return () => {};
  button.onClick(onClick);
  if (visible) button.show(); else button.hide();
  return () => { button.offClick(onClick); button.hide(); };
}

/**
 * Mirror an in-page primary action onto Telegram's native MainButton.
 * Returns a cleanup that detaches the handler and hides the button.
 */
export function showTelegramMainButton(options: { text: string; onClick: () => void; disabled?: boolean }): () => void {
  if (!isTelegramMiniApp()) return () => {};
  const button = getTelegramWebApp()?.MainButton;
  if (!button) return () => {};
  const { text, onClick, disabled } = options;
  button.setText(text);
  button.onClick(onClick);
  if (disabled) button.disable(); else button.enable();
  button.show();
  return () => { button.offClick(onClick); button.hide(); };
}
