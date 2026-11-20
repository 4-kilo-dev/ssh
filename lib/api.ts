/**
 * Small typed fetch helpers for client-side API calls.
 *
 * Centralizes the `res.ok` check, JSON parsing and error shaping that was
 * previously hand-rolled at every call site, and threads an optional
 * `AbortSignal` so callers can cancel in-flight requests on unmount.
 */

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function parse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function messageFrom(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body) {
    const value = (body as { error: unknown }).error;
    if (typeof value === "string" && value) return value;
  }
  return fallback;
}

/** GET `path` and return the parsed JSON body typed as `T`. Throws `ApiError` on non-2xx. */
export async function apiGet<T>(path: string, options?: { signal?: AbortSignal }): Promise<T> {
  const res = await fetch(path, { signal: options?.signal });
  const body = await parse(res);
  if (!res.ok) {
    throw new ApiError(messageFrom(body, `Request failed (${res.status})`), res.status, body);
  }
  return body as T;
}

/** Send `body` to `path` with the given method and return the parsed JSON typed as `T`. */
export async function apiSend<T>(
  path: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
  options?: { signal?: AbortSignal },
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: options?.signal,
  });
  const parsed = await parse(res);
  if (!res.ok) {
    throw new ApiError(messageFrom(parsed, `Request failed (${res.status})`), res.status, parsed);
  }
  return parsed as T;
}
