import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { journalBalances } from "../src/journal";
import { reconcileCsv } from "../src/reconcile";

const root = new URL("../fixtures/holdout/", import.meta.url);

function read(name: string): string {
  return readFileSync(new URL(name, root), "utf8");
}

interface JournalExpect {
  account: string;
  debitCents: number | null;
  creditCents: number | null;
}

interface HoldoutCase {
  file: string;
  class: string;
  processor: string;
  heroCents: number;
  status: "reconciled" | "needs-review";
  currency: string;
  payoutDate: string;
  flags: string[];
  grossSalesCents: number;
  feeCents: number;
  refundCents: number;
  chargebackCents: number;
  unclassifiedCents: number;
  computedNetCents: number;
  statedPayoutCents: number | null;
  differenceCents: number | null;
  journalBalances: boolean;
  journal: JournalExpect[];
}

function bundleHash(): string {
  const names = readdirSync(root)
    .filter((name) => name.endsWith(".csv") || name === "expected.json")
    .sort();
  const listing = names
    .map((name) => {
      const data = readFileSync(new URL(name, root));
      const digest = createHash("sha256").update(data).digest("hex");
      return `${digest}  ./${name}`;
    })
    .join("\n");
  const sums = `${listing}\n`;
  expect(read("SHA256SUMS")).toBe(sums);
  return createHash("sha256").update(sums).digest("hex");
}

describe("synthetic holdout", () => {
  it("matches the hash recorded before these files were reconciled", () => {
    expect(bundleHash()).toBe(read("BUNDLE_SHA256.txt").trim());
  });

  it("agrees with the hand totals", () => {
    const gold = JSON.parse(read("expected.json")) as { cases: HoldoutCase[] };
    const misses: string[] = [];
    for (const item of gold.cases) {
      const text = read(item.file);
      expect(text).toMatch(/Synthetic/);
      const result = reconcileCsv(text, item.file);
      if (!result.ok) {
        misses.push(`${item.file}: ${result.message}`);
        continue;
      }
      const { reconciliation, journal } = result;
      const got = {
        processor: reconciliation.processor,
        heroCents: reconciliation.heroCents,
        status: reconciliation.status,
        currency: reconciliation.currency,
        payoutDate: reconciliation.payoutDate,
        flags: reconciliation.flags.map((flag) => flag.code),
        grossSalesCents: reconciliation.breakdown.grossSalesCents,
        feeCents: reconciliation.breakdown.feeCents,
        refundCents: reconciliation.breakdown.refundCents,
        chargebackCents: reconciliation.breakdown.chargebackCents,
        unclassifiedCents: reconciliation.breakdown.unclassifiedCents,
        computedNetCents: reconciliation.breakdown.computedNetCents,
        statedPayoutCents: reconciliation.breakdown.statedPayoutCents,
        differenceCents: reconciliation.breakdown.differenceCents,
        journalBalances: journalBalances(journal),
        journal: journal.lines.map((line) => ({
          account: line.account,
          debitCents: line.debitCents,
          creditCents: line.creditCents,
        })),
      };
      const want = {
        processor: item.processor,
        heroCents: item.heroCents,
        status: item.status,
        currency: item.currency,
        payoutDate: item.payoutDate,
        flags: item.flags,
        grossSalesCents: item.grossSalesCents,
        feeCents: item.feeCents,
        refundCents: item.refundCents,
        chargebackCents: item.chargebackCents,
        unclassifiedCents: item.unclassifiedCents,
        computedNetCents: item.computedNetCents,
        statedPayoutCents: item.statedPayoutCents,
        differenceCents: item.differenceCents,
        journalBalances: item.journalBalances,
        journal: item.journal,
      };
      if (JSON.stringify(got) !== JSON.stringify(want)) {
        misses.push(`${item.file}\n got  ${JSON.stringify(got)}\n want ${JSON.stringify(want)}`);
      }
    }
    expect(misses, misses.join("\n\n")).toEqual([]);
  });
});
