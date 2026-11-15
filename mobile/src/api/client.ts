import { API_URL } from "@/config";

/**
 * Small fetch wrapper for the AddisVenue backend.
 * - Sends the session as `Authorization: Bearer <token>`.
 * - Sends `x-addisvenue-client: mobile` so auth routes return the token.
 * - Never uses cookies (`credentials: "omit"`), so state lives only in the token.
 * - Turns every failure into an ApiError with a readable message.
 */

const TIMEOUT_MS = 20_000;

let authToken: string | null = null;
let onSessionExpired: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Called when the server rejects our token (expired / revoked session). */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
  get isNetwork() {
    return this.status === 0;
  }
  get isConflict() {
    return this.status === 409;
  }
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export async function api<T>(path: string, options: { method?: Method; body?: unknown } = {}): Promise<T> {
  const { method = "GET", body } = options;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "x-addisvenue-client": "mobile",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const sentToken = authToken;
  if (sentToken) headers.Authorization = `Bearer ${sentToken}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "omit",
      signal: controller.signal,
    });
  } catch {
    throw new ApiError("network", 0);
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    if (res.status === 401 && sentToken && onSessionExpired) {
      onSessionExpired();
    }
    const message =
      (data && (data.error || data.reason)) || `Request failed (${res.status})`;
    throw new ApiError(String(message), res.status);
  }

  return data as T;
}
