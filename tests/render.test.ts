// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { journalToCsv } from "../src/journal";
import { reconcileCsv } from "../src/reconcile";
import { renderOutcome } from "../src/render";

function load(name: string): string {
  return readFileSync(`fixtures/${name}`, "utf8");
}

describe("hero screen", () => {
  it("shows the Stripe net deposit, the chargeback, and a balanced journal", () => {
    const outcome = reconcileCsv(load("stripe-payout-balanced.csv"), "stripe-payout-balanced.csv");
    const host = document.createElement("div");
    host.append(renderOutcome(outcome));
    expect(host.querySelector("[data-testid='net-deposit']")?.textContent).toBe("$320.19");
    expect(host.querySelector("[data-testid='status']")?.textContent).toBe("Reconciled");
    expect(host.querySelector("[data-testid='chargebacks']")?.textContent).toBe("$89.50");
    expect(host.querySelector("[data-testid='fees']")?.textContent).toBe("$29.81");
    expect(host.querySelector("[data-testid='journal-balance']")?.textContent).toMatch(/equal/);
    expect(host.textContent).toContain("Export bookkeeping CSV");
    if (!outcome.ok) throw new Error("expected a reconciliation");
    const csv = journalToCsv(outcome.journal);
    expect(csv).toContain("Bank deposit");
    expect(csv).toContain("320.19");
  });

  it("shows the mismatch flag on the sample that does not tie", () => {
    const outcome = reconcileCsv(load("stripe-payout-mismatch.csv"), "stripe-payout-mismatch.csv");
    const host = document.createElement("div");
    host.append(renderOutcome(outcome));
    expect(host.querySelector("[data-testid='net-deposit']")?.textContent).toBe("$335.19");
    expect(host.querySelector("[data-testid='status']")?.textContent).toBe("Needs review");
    expect(host.querySelector("[data-flag='PAYOUT_MISMATCH']")?.textContent).toMatch(/\$15\.00/);
    expect(host.textContent).toContain("Suspense — payout difference");
  });
});
