/**
 * Ethiopian mobile number normalization.
 *
 * Accepts the ways people actually type a number — "0911 22 33 44",
 * "911223344", "251911223344", "+251-911-223344" — and returns the canonical
 * stored form "+251911223344". Mobile numbers start with 9 (Ethio telecom) or
 * 7 (Safaricom). Returns null when the input is not a valid mobile number.
 */
export function normalizeEthiopianPhone(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const compact = raw.replace(/[\s\-().]/g, "");
  const match = compact.match(/^(?:\+251|251|0)?([79]\d{8})$/);
  return match ? `+251${match[1]}` : null;
}
