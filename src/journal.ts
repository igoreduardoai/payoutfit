import { writeCsv } from "./csv";
import { ACCOUNT, PROCESSOR_LABEL } from "./labels";
import { formatPlainCents } from "./money";
import type { Cents, Journal, JournalLine, Reconciliation } from "./types";

function push(
  lines: JournalLine[],
  date: string,
  account: string,
  memo: string,
  side: "debit" | "credit",
  amount: Cents,
): void {
  if (amount === 0) return;
  const cents = Math.abs(amount);
  lines.push({
    date,
    account,
    memo,
    debitCents: side === "debit" ? cents : null,
    creditCents: side === "credit" ? cents : null,
  });
}

export function buildJournal(reconciliation: Reconciliation): Journal {
  const { breakdown, payoutDate, payoutId, sourceName, processor } = reconciliation;
  const date = payoutDate ?? "";
  const label = PROCESSOR_LABEL[processor];
  const memo = payoutId ? `${label} payout ${payoutId}` : `${label} import ${sourceName}`;
  const lines: JournalLine[] = [];
  const stated = breakdown.statedPayoutCents;
  const diff = stated === null ? 0 : stated - breakdown.computedNetCents;

  push(lines, date, ACCOUNT.bank, memo, "debit", reconciliation.heroCents);
  push(lines, date, ACCOUNT.fees, memo, breakdown.feeCents >= 0 ? "debit" : "credit", breakdown.feeCents);
  push(lines, date, ACCOUNT.refunds, memo, "debit", breakdown.refundCents);
  push(lines, date, ACCOUNT.chargebacks, memo, "debit", breakdown.chargebackCents);
  push(
    lines,
    date,
    ACCOUNT.adjustments,
    memo,
    breakdown.adjustmentCents >= 0 ? "credit" : "debit",
    breakdown.adjustmentCents,
  );
  push(
    lines,
    date,
    ACCOUNT.unclassified,
    memo,
    breakdown.unclassifiedCents >= 0 ? "credit" : "debit",
    breakdown.unclassifiedCents,
  );
  push(lines, date, ACCOUNT.sales, memo, "credit", breakdown.grossSalesCents);
  // A stated deposit that the components do not explain is parked in suspense
  // so the journal still balances and the difference stays visible.
  push(lines, date, ACCOUNT.suspense, `${memo}; stated payout differs from components`, diff > 0 ? "credit" : "debit", diff);

  const debitCents = lines.reduce((sum, line) => sum + (line.debitCents ?? 0), 0);
  const creditCents = lines.reduce((sum, line) => sum + (line.creditCents ?? 0), 0);
  const filename = `payoutfit-journal-${payoutDate ?? "undated"}.csv`;
  return { lines, debitCents, creditCents, filename };
}

export function journalToCsv(journal: Journal): string {
  const rows = [
    ["date", "account", "memo", "debit", "credit"],
    ...journal.lines.map((line) => [
      line.date,
      line.account,
      line.memo,
      line.debitCents === null ? "" : formatPlainCents(line.debitCents),
      line.creditCents === null ? "" : formatPlainCents(line.creditCents),
    ]),
  ];
  return writeCsv(rows);
}

export function journalBalances(journal: Journal): boolean {
  return journal.debitCents === journal.creditCents;
}
