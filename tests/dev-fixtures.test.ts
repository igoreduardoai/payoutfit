import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ACCOUNT } from "../src/labels";
import { journalBalances } from "../src/journal";
import { reconcileCsv } from "../src/reconcile";

function load(name: string): string {
  const text = readFileSync(new URL(`../fixtures/dev/${name}`, import.meta.url), "utf8");
  expect(text).toMatch(/Synthetic/);
  return text;
}

function open(name: string) {
  const result = reconcileCsv(load(name), name);
  expect(result.ok, result.ok ? "" : result.message).toBe(true);
  if (!result.ok) throw new Error(result.message);
  return result;
}

describe("synthetic dev fixtures", () => {
  it("keeps a half-up gross that still ties to the net", () => {
    const { reconciliation, journal } = open("fee-rounding-ties.csv");
    expect(reconciliation.breakdown.grossSalesCents).toBe(1000);
    expect(reconciliation.breakdown.feeCents).toBe(0);
    expect(reconciliation.heroCents).toBe(1000);
    expect(reconciliation.flags).toEqual([]);
    expect(reconciliation.status).toBe("reconciled");
    expect(journalBalances(journal)).toBe(true);
  });

  it("books a partial refund and the fee that came back with it", () => {
    const { reconciliation, journal } = open("partial-refund-fee-rebate.csv");
    expect(reconciliation.processor).toBe("paypal");
    expect(reconciliation.breakdown.grossSalesCents).toBe(12000);
    expect(reconciliation.breakdown.refundCents).toBe(3000);
    expect(reconciliation.breakdown.feeCents).toBe(288);
    expect(reconciliation.heroCents).toBe(8712);
    expect(reconciliation.payoutDate).toBe("2026-11-12");
    expect(reconciliation.status).toBe("reconciled");
    expect(journal.lines.find((line) => line.account === ACCOUNT.refunds)?.debitCents).toBe(3000);
    expect(journalBalances(journal)).toBe(true);
  });

  it("leaves a repeated transaction id out of the deposit", () => {
    const { reconciliation } = open("duplicate-transaction-id.csv");
    expect(reconciliation.heroCents).toBe(1718);
    expect(reconciliation.breakdown.grossSalesCents).toBe(1800);
    expect(reconciliation.flags.map((flag) => flag.code)).toEqual(["DUPLICATE_ID"]);
    expect(reconciliation.status).toBe("needs-review");
  });

  it("uses the computed net when the payout row is missing", () => {
    const { reconciliation, journal } = open("missing-payout-row.csv");
    expect(reconciliation.processor).toBe("shopify");
    expect(reconciliation.breakdown.statedPayoutCents).toBeNull();
    expect(reconciliation.heroCents).toBe(4296);
    expect(reconciliation.payoutDate).toBe("2026-11-14");
    expect(reconciliation.flags).toEqual([]);
    expect(journal.lines.find((line) => line.account === ACCOUNT.bank)?.debitCents).toBe(4296);
    expect(journalBalances(journal)).toBe(true);
  });

  it("flags a negative charge and does not balance the journal against a positive payout", () => {
    const { reconciliation, journal } = open("reversed-sign-charge.csv");
    expect(reconciliation.flags.map((flag) => flag.code)).toEqual(["UNEXPECTED_SIGN", "PAYOUT_MISMATCH"]);
    expect(reconciliation.breakdown.grossSalesCents).toBe(-1200);
    expect(reconciliation.breakdown.computedNetCents).toBe(-1200);
    expect(reconciliation.heroCents).toBe(1200);
    expect(reconciliation.breakdown.differenceCents).toBe(2400);
    expect(journal.lines.find((line) => line.account === ACCOUNT.bank)?.debitCents).toBe(1200);
    expect(journal.lines.find((line) => line.account === ACCOUNT.sales)?.creditCents).toBe(1200);
    expect(journal.lines.find((line) => line.account === ACCOUNT.suspense)?.creditCents).toBe(2400);
    expect(journalBalances(journal)).toBe(false);
    expect(journal.debitCents).toBe(1200);
    expect(journal.creditCents).toBe(3600);
  });

  it("drops a stated payout when the payout rows do not share a sign", () => {
    const { reconciliation, journal } = open("mixed-payout-signs.csv");
    expect(reconciliation.flags.map((flag) => flag.code)).toEqual(["MIXED_PAYOUT_SIGNS"]);
    expect(reconciliation.breakdown.statedPayoutCents).toBeNull();
    expect(reconciliation.heroCents).toBe(2000);
    expect(journalBalances(journal)).toBe(true);
  });

  it("reads a thousands separator and a half-up fee that still ties", () => {
    const { reconciliation, journal } = open("thousands-and-half-up.csv");
    expect(reconciliation.breakdown.grossSalesCents).toBe(125050);
    expect(reconciliation.breakdown.feeCents).toBe(3752);
    expect(reconciliation.heroCents).toBe(121298);
    expect(reconciliation.flags).toEqual([]);
    expect(journalBalances(journal)).toBe(true);
  });

  it("keeps a partial chargeback principal off the fee line", () => {
    const { reconciliation, journal } = open("partial-chargeback.csv");
    expect(reconciliation.processor).toBe("stripe");
    expect(reconciliation.breakdown.grossSalesCents).toBe(5000);
    expect(reconciliation.breakdown.chargebackCents).toBe(2000);
    expect(reconciliation.breakdown.feeCents).toBe(1675);
    expect(reconciliation.heroCents).toBe(1325);
    expect(reconciliation.status).toBe("reconciled");
    expect(journal.lines.find((line) => line.account === ACCOUNT.chargebacks)?.debitCents).toBe(2000);
    expect(journalBalances(journal)).toBe(true);
  });
});
