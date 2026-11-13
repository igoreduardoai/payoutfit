import type { Cents } from "./types";

/**
 * Parse a money cell into integer cents.
 * Accepts 1,234.56, $1.20, (1.20), and a leading minus.
 * A third decimal digit of 5 or more rounds away from zero.
 * Returns null when the cell is not a number.
 */
export function parseMoneyToCents(input: string): Cents | null {
  let s = input.trim();
  if (!s) return null;
  s = s.replace(/[\s$]/g, "");
  let negative = false;
  if (s.startsWith("(") && s.endsWith(")")) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith("+")) s = s.slice(1);
  else if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }
  s = s.replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  const digits = (frac + "000").slice(0, 3);
  let cents = Number(whole) * 100 + Number(digits.slice(0, 2));
  if (digits[2] >= "5") cents += 1;
  if (!Number.isSafeInteger(cents)) return null;
  return negative ? -cents : cents;
}

/**
 * Fee column conventions differ by processor.
 * Stripe/Shopify store a positive cost and net = gross - fee.
 * PayPal stores a signed fee and net = gross + fee.
 * Returns the fee as a cost (positive reduces the deposit) or null when
 * neither convention reproduces the net.
 */
export function feeCostCents(gross: Cents, feeRaw: Cents, net: Cents): Cents | null {
  const positiveCostMatches = gross - feeRaw === net;
  const signedMatches = gross + feeRaw === net;
  if (positiveCostMatches && signedMatches) return 0;
  if (positiveCostMatches) return feeRaw;
  if (signedMatches) return -feeRaw;
  return null;
}

export function formatCents(cents: Cents, currency: string | null): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100).toString();
  const withCommas = dollars.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = String(abs % 100).padStart(2, "0");
  const number = `${sign}${withCommas}.${frac}`;
  if (!currency || currency === "USD") return `${sign}$${withCommas}.${frac}`;
  return `${currency} ${number}`;
}

/** Plain decimal for a spreadsheet cell. No symbol and no thousands separator. */
export function formatPlainCents(cents: Cents): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
