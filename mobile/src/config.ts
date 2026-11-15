import Constants from "expo-constants";

/**
 * Backend base URL.
 *
 * 1. EXPO_PUBLIC_API_URL if set (use this for real builds — must be HTTPS).
 * 2. In development: the laptop that runs `expo start`, on port 3000, where
 *    `pnpm dev` serves the Next.js backend. Phone and laptop must be on the
 *    same Wi-Fi. No setup needed.
 * 3. Fallback: localhost (iOS simulator).
 */
function devServerUrl(): string | null {
  const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.20:8081"
  if (!hostUri) return null;
  const host = hostUri.split(":")[0];
  return host ? `http://${host}:3000` : null;
}

export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || devServerUrl() || "http://localhost:3000"
).replace(/\/+$/, "");

/** Turns a stored image path ("/images/x.svg") into a full URL. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
