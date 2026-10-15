"use client";

import NextLink from "next/link";
import { useRouter as useNextRouter } from "next/navigation";
import { createContext, useContext, useMemo, type ComponentProps, type ReactNode } from "react";

/**
 * Base path for in-app navigation.
 *
 * The web app runs with the default `""`, so every href is emitted exactly as
 * written and navigation behaviour is unchanged. The /tg Telegram Mini App
 * mounts `NavBaseProvider` with `base="/tg"`, which re-points the same shared
 * components at the Mini App routes instead of duplicating them.
 */
const NavBaseContext = createContext("");

export function NavBaseProvider({ base = "", children }: { base?: string; children: ReactNode }) {
  return <NavBaseContext.Provider value={base}>{children}</NavBaseContext.Provider>;
}

export function useNavBase(): string {
  return useContext(NavBaseContext);
}

/**
 * Prefix an app-absolute href with the active base path.
 *
 * Left untouched: external URLs, protocol-relative URLs, hashes, mailto: and
 * tel: links, and any href that already carries the base (so re-wrapping is
 * idempotent). With `base === ""` this is the identity function.
 */
export function withNavBase(base: string, href: string): string {
  if (!base) return href;
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  if (href === base || href.startsWith(`${base}/`)) return href;
  return href === "/" ? base : `${base}${href}`;
}

/** Drop-in replacement for `next/link` that respects the active base path. */
export function Link({ href, ...rest }: ComponentProps<typeof NextLink>) {
  const base = useNavBase();
  return <NextLink href={typeof href === "string" ? withNavBase(base, href) : href} {...rest} />;
}

/**
 * Drop-in replacement for `next/navigation`'s `useRouter` that respects the
 * active base path. Imperative `push`/`replace`/`prefetch` calls are prefixed
 * the same way `<Link>` is, which matters because the shared components
 * navigate imperatively after form submits and payment simulation.
 */
export function useRouter() {
  const base = useNavBase();
  const router = useNextRouter();
  return useMemo(() => ({
    ...router,
    push: (href: string, options?: Parameters<typeof router.push>[1]) => router.push(withNavBase(base, href), options),
    replace: (href: string, options?: Parameters<typeof router.replace>[1]) => router.replace(withNavBase(base, href), options),
    prefetch: (href: string, options?: Parameters<typeof router.prefetch>[1]) => router.prefetch(withNavBase(base, href), options),
  }), [router, base]);
}
