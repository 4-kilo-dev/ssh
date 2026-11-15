/**
 * Same rule as the backend (lib/phone.ts): accepts "0911 22 33 44",
 * "911223344", "251911223344", "+251-911-223344" and returns "+251911223344".
 */
export function normalizeEthiopianPhone(raw: string): string | null {
  const compact = raw.replace(/[\s\-().]/g, "");
  const match = compact.match(/^(?:\+251|251|0)?([79]\d{8})$/);
  return match ? `+251${match[1]}` : null;
}

/** "+251911223344" → "0911 22 33 44" for display. */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const n = normalizeEthiopianPhone(phone);
  if (!n) return phone;
  const local = "0" + n.slice(4);
  return `${local.slice(0, 4)} ${local.slice(4, 6)} ${local.slice(6, 8)} ${local.slice(8)}`;
}
