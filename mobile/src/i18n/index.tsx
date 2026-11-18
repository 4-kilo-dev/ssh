import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { en, type CopyKey } from "./en";
import { am } from "./am";

export type Locale = "en" | "am";
export type { CopyKey };

const dictionaries: Record<Locale, Record<CopyKey, string>> = { en, am };
const STORAGE_KEY = "addisvenue.locale";

type Vars = Record<string, string | number>;

interface LocaleContextValue {
  ready: boolean;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: CopyKey, vars?: Vars) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match
  );
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((saved) => {
        if (saved === "en" || saved === "am") setLocaleState(saved);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {});
  }, []);

  const t = useCallback(
    (key: CopyKey, vars?: Vars) => interpolate(dictionaries[locale][key] ?? en[key] ?? key, vars),
    [locale]
  );

  const value = useMemo(() => ({ ready, locale, setLocale, t }), [ready, locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside LocaleProvider");
  return ctx;
}

/** Shortcut for the translate function. */
export function useT() {
  return useLocale().t;
}
