/** Indian-grouped rupee string: Rs.1,23,456 */
export const formatINR = (n: number): string => `Rs.${Math.round(n).toLocaleString('en-IN')}`;

/**
 * Parses "1299", "Rs.1,299", "Rs 1,299", "₹1,299", "INR 1299", "1,299.00".
 * Returns null for anything that is not a plain non-negative amount (never NaN).
 */
export function parseCurrency(v: unknown): number | null {
  if (v === undefined || v === null) return null;
  const s = String(v).replace(/[\u00A0\s]/g, '').replace(/^(?:rs\.?|inr|₹)/i, '').replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}
