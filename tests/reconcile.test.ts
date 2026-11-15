import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCsvRows, spreadsheetText, writeCsv } from "../src/csv";
import { ACCOUNT } from "../src/labels";
import { journalBalances, journalToCsv } from "../src/journal";
import { parseMoneyToCents } from "../src/money";
import { reconcileCsv } from "../src/reconcile";
import type { Reconciliation } from "../src/types";

function load(name: string): string {
  return readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8");
}

function ok(name: string): Reconciliation {
  const result = reconcileCsv(load(name), name);
  if (!result.ok) throw new Error(result.message);
  return result.reconciliation;
}

describe("parseMoneyToCents", () => {
  it("parses symbols, commas, parentheses, and half-up rounding", () => {
    expect(parseMoneyToCents("1,234.56")).toBe(123456);
    expect(parseMoneyToCents("$1.20")).toBe(120);
    expect(parseMoneyToCents("(1.20)")).toBe(-120);
    expect(parseMoneyToCents("-40.00")).toBe(-4000);
    expect(parseMoneyToCents("1.005")).toBe(101);
    expect(parseMoneyToCents("1.004")).toBe(100);
    expect(parseMoneyToCents("not money")).toBeNull();
  });
});

describe("synthetic payout fixtures", () => {
  it("ties the Stripe-style sample to a $320.19 deposit and keeps the chargeback", () => {
    const result = reconcileCsv(load("stripe-payout-balanced.csv"), "stripe-payout-balanced.csv");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { reconciliation, journal } = result;
    expect(reconciliation.processor).toBe("stripe");
    expect(reconciliation.lines[0]?.description).toBe("Synthetic invoice, card payment");
    expect(reconciliation.breakdown.grossSalesCents).toBe(47950);
    expect(reconciliation.breakdown.feeCents).toBe(2981);
    expect(reconciliation.breakdown.refundCents).toBe(4000);
    expect(reconciliation.breakdown.chargebackCents).toBe(8950);
    expect(reconciliation.breakdown.computedNetCents).toBe(32019);
    expect(reconciliation.breakdown.statedPayoutCents).toBe(32019);
    expect(reconciliation.breakdown.differenceCents).toBe(0);
    expect(reconciliation.heroCents).toBe(32019);
    expect(reconciliation.payoutDate).toBe("2026-11-03");
    expect(reconciliation.status).toBe("reconciled");
    expect(reconciliation.flags).toEqual([]);
    const chargebacks = journal.lines.find((line) => line.account === ACCOUNT.chargebacks);
    expect(chargebacks?.debitCents).toBe(8950);
    expect(journalBalances(journal)).toBe(true);
  });

  it("reads a PayPal-style signed fee and does not treat the chargeback fee as principal", () => {
    const reconciliation = ok("paypal-payout-balanced.csv");
    expect(reconciliation.processor).toBe("paypal");
    expect(reconciliation.breakdown.grossSalesCents).toBe(26000);
    expect(reconciliation.breakdown.feeCents).toBe(2314);
    expect(reconciliation.breakdown.refundCents).toBe(6000);
    expect(reconciliation.breakdown.chargebackCents).toBe(2500);
    expect(reconciliation.heroCents).toBe(15186);
    expect(reconciliation.payoutDate).toBe("2026-11-03");
    expect(reconciliation.status).toBe("reconciled");
  });

  it("keeps a Shopify-style adjustment on its own line", () => {
    const result = reconcileCsv(load("shopify-payout-balanced.csv"), "shopify-payout-balanced.csv");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reconciliation.processor).toBe("shopify");
    expect(result.reconciliation.breakdown.adjustmentCents).toBe(500);
    expect(result.reconciliation.heroCents).toBe(14171);
    expect(result.reconciliation.payoutDate).toBe("2026-11-04");
    expect(result.reconciliation.breakdown.statedPayoutCents).toBeNull();
    expect(result.reconciliation.status).toBe("reconciled");
    const adjustment = result.journal.lines.find((line) => line.account === ACCOUNT.adjustments);
    expect(adjustment?.creditCents).toBe(500);
    expect(journalBalances(result.journal)).toBe(true);
  });

  it("flags a stated payout that is $15.00 above the components and credits suspense", () => {
    const result = reconcileCsv(load("stripe-payout-mismatch.csv"), "stripe-payout-mismatch.csv");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reconciliation.heroCents).toBe(33519);
    expect(result.reconciliation.breakdown.computedNetCents).toBe(32019);
    expect(result.reconciliation.breakdown.differenceCents).toBe(1500);
    expect(result.reconciliation.flags.map((flag) => flag.code)).toContain("PAYOUT_MISMATCH");
    expect(result.reconciliation.status).toBe("needs-review");
    const suspense = result.journal.lines.find((line) => line.account === ACCOUNT.suspense);
    expect(suspense?.creditCents).toBe(1500);
    expect(journalBalances(result.journal)).toBe(true);
  });
});

describe("edge cases", () => {
  it("debits suspense when the stated payout is short", () => {
    const csv = [
      "payout_id,payout_date,id,currency,gross,fee,net,type,description",
      "po_short,2026-11-03,a,USD,100.00,0.00,100.00,charge,Synthetic",
      "po_short,2026-11-03,b,USD,-80.00,0.00,-80.00,payout,Synthetic short payout",
    ].join("\n");
    const result = reconcileCsv(csv, "short.csv");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reconciliation.breakdown.differenceCents).toBe(-2000);
    const suspense = result.journal.lines.find((line) => line.account === ACCOUNT.suspense);
    expect(suspense?.debitCents).toBe(2000);
    expect(journalBalances(result.journal)).toBe(true);
  });

  it("drops a repeated transaction id from the totals", () => {
    const csv = [
      "id,currency,gross,fee,net,type",
      "dup,USD,10.00,0.00,10.00,charge",
      "dup,USD,10.00,0.00,10.00,charge",
    ].join("\n");
    const result = reconcileCsv(csv, "dup.csv");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reconciliation.heroCents).toBe(1000);
    expect(result.reconciliation.flags.map((flag) => flag.code)).toContain("DUPLICATE_ID");
  });

  it("flags a row whose net matches neither fee convention and keeps the net", () => {
    const csv = ["gross,fee,net,type,currency", "10.00,1.00,8.00,charge,USD"].join("\n");
    const result = reconcileCsv(csv, "bad-row.csv");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reconciliation.flags.map((flag) => flag.code)).toContain("ROW_NET_MISMATCH");
    expect(result.reconciliation.breakdown.unclassifiedCents).toBe(800);
    expect(result.reconciliation.heroCents).toBe(800);
  });

  it("flags mixed currencies and does not convert them", () => {
    const csv = [
      "gross,fee,net,type,currency",
      "10.00,0.00,10.00,charge,USD",
      "5.00,0.00,5.00,charge,EUR",
    ].join("\n");
    const result = reconcileCsv(csv, "mix.csv");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reconciliation.flags.map((flag) => flag.code)).toContain("MIXED_CURRENCY");
    expect(result.reconciliation.heroCents).toBe(1500);
  });

  it("refuses a file without the columns it needs", () => {
    const result = reconcileCsv("note,value\nhello,1\n", "notes.csv");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/gross/);
  });

  it("refuses an empty file", () => {
    expect(reconcileCsv("", "empty.csv").ok).toBe(false);
    expect(reconcileCsv("gross,fee,net\n", "headers.csv").ok).toBe(false);
  });
});

describe("journal csv", () => {
  it("writes a UTF-8 BOM, CRLF, and spreadsheet-safe cells", () => {
    const csv = [
      "payout_date,id,currency,gross,fee,net,type",
      "2026-11-03,a,USD,25.00,1.00,24.00,charge",
    ].join("\n");
    const result = reconcileCsv(csv, "plain.csv");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const text = journalToCsv(result.journal);
    expect(text.startsWith("\uFEFF")).toBe(true);
    expect(text.includes("\r\n")).toBe(true);
    expect(text).toContain('"date","account","memo","debit","credit"');
    expect(text).toContain("24.00");
    const rows = parseCsvRows(text);
    expect(rows[0]).toEqual(["date", "account", "memo", "debit", "credit"]);
    expect(journalBalances(result.journal)).toBe(true);

    expect(spreadsheetText("=1+1")).toBe("'=1+1");
    const guarded = writeCsv([
      ["date", "account", "memo", "debit", "credit"],
      ["2026-11-03", "=1+1", "note", "1.00", ""],
    ]);
    expect(guarded).toContain(`"'=1+1"`);
    expect(parseCsvRows(guarded)[1]?.[1]).toBe("'=1+1");
  });
});
