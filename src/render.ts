import { PROCESSOR_LABEL } from "./labels";
import { formatCents, formatPlainCents } from "./money";
import type { Cents, Journal, Reconciliation, ReconcileOutcome } from "./types";

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string>,
  children: Array<Node | string> = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) node.append(typeof child === "string" ? document.createTextNode(child) : child);
  return node;
}

function money(cents: Cents, currency: string | null): string {
  return formatCents(cents, currency);
}

function row(label: string, value: string, testId: string): HTMLElement {
  return el("div", { class: "break-row" }, [
    el("dt", {}, [label]),
    el("dd", { "data-testid": testId }, [value]),
  ]);
}

export function renderEmpty(): HTMLElement {
  return el("div", { class: "empty" }, [
    el("p", { class: "empty-title" }, ["No payout loaded"]),
    el("p", {}, [
      "Use Import payout CSV, drop a file on the page, or load a synthetic sample. PayoutFit reads gross, fees, refunds, and chargebacks, then shows the net deposit.",
    ]),
  ]);
}

export function renderOutcome(outcome: ReconcileOutcome): HTMLElement {
  if (!outcome.ok) {
    return el("div", { class: "panel error-panel", role: "alert" }, [
      el("h2", {}, ["This file could not be reconciled"]),
      el("p", { "data-testid": "parse-error" }, [outcome.message]),
    ]);
  }
  return renderReconciliation(outcome.reconciliation, outcome.journal);
}

export function renderReconciliation(reconciliation: Reconciliation, journal: Journal): HTMLElement {
  const currency = reconciliation.currency;
  const statusLabel = reconciliation.status === "reconciled" ? "Reconciled" : "Needs review";
  const { breakdown } = reconciliation;
  const rows = [
    row("Gross sales", money(breakdown.grossSalesCents, currency), "gross-sales"),
    row("Fees", money(breakdown.feeCents, currency), "fees"),
    row("Refunds", money(breakdown.refundCents, currency), "refunds"),
    row("Chargebacks", money(breakdown.chargebackCents, currency), "chargebacks"),
  ];
  if (breakdown.adjustmentCents !== 0) {
    rows.push(row("Adjustments", money(breakdown.adjustmentCents, currency), "adjustments"));
  }
  if (breakdown.unclassifiedCents !== 0) {
    rows.push(row("Unclassified", money(breakdown.unclassifiedCents, currency), "unclassified"));
  }
  rows.push(row("Computed net", money(breakdown.computedNetCents, currency), "computed-net"));
  rows.push(
    row(
      "Stated payout",
      breakdown.statedPayoutCents === null ? "Not in file" : money(breakdown.statedPayoutCents, currency),
      "stated-payout",
    ),
  );
  if (breakdown.differenceCents !== null) {
    rows.push(row("Difference", money(breakdown.differenceCents, currency), "difference"));
  }

  const meta = [
    PROCESSOR_LABEL[reconciliation.processor],
    reconciliation.currency ?? "No currency",
    reconciliation.payoutDate ?? "No payout date",
    reconciliation.payoutId ?? reconciliation.sourceName,
    `${reconciliation.activityCount} activity lines`,
  ].join(" · ");

  const flagList =
    reconciliation.flags.length === 0
      ? el("p", { class: "quiet", "data-testid": "flags" }, ["No mismatch flags."])
      : el(
          "ul",
          { class: "flags", "data-testid": "flags" },
          reconciliation.flags.map((flag) =>
            el("li", { "data-flag": flag.code }, [flag.message]),
          ),
        );

  const balanceText =
    journal.debitCents === journal.creditCents
      ? `Debits ${money(journal.debitCents, currency)} equal credits ${money(journal.creditCents, currency)}.`
      : `Debits ${money(journal.debitCents, currency)} do not equal credits ${money(journal.creditCents, currency)}.`;

  return el("div", { class: "result" }, [
    el("section", { class: `hero ${reconciliation.status}`, "aria-label": "Net deposit" }, [
      el("p", { class: "eyebrow" }, ["Net deposit"]),
      el("p", { class: "hero-number", "data-testid": "net-deposit", "data-net-cents": String(reconciliation.heroCents) }, [
        money(reconciliation.heroCents, currency),
      ]),
      el("p", { class: "meta", "data-testid": "meta" }, [meta]),
      el("p", { class: `status ${reconciliation.status}`, "data-testid": "status" }, [statusLabel]),
    ]),
    el("section", { class: "panel" }, [
      el("h2", {}, ["Breakdown"]),
      el("p", { class: "formula" }, [
        "Computed net = gross sales − fees − refunds − chargebacks + adjustments.",
      ]),
      el("dl", { class: "break" }, rows),
    ]),
    el("section", { class: "panel" }, [
      el("h2", {}, ["Mismatch flags"]),
      flagList,
    ]),
    el("section", { class: "panel" }, [
      el("h2", {}, ["Journal preview"]),
      el("p", { class: "quiet" }, [
        "Summary entry for the deposit. A stated payout that the components do not explain is parked in suspense so the columns still balance.",
      ]),
      renderTable(journal),
      el("p", { "data-testid": "journal-balance" }, [balanceText]),
      el("div", { class: "export-row" }, [
        el("button", { type: "button", id: "export-journal", class: "primary" }, ["Export bookkeeping CSV"]),
        el("p", { id: "export-status", "data-testid": "export-status", role: "status" }, [""]),
      ]),
    ]),
  ]);
}

function renderTable(journal: Journal): HTMLElement {
  const table = el("table", {}, [
    el("caption", { class: "sr-only" }, ["Bookkeeping journal preview"]),
    el("thead", {}, [
      el("tr", {}, ["date", "account", "memo", "debit", "credit"].map((name) => el("th", { scope: "col" }, [name]))),
    ]),
  ]);
  const body = el("tbody", {}, []);
  for (const line of journal.lines) {
    body.append(
      el("tr", {}, [
        el("td", {}, [line.date]),
        el("td", {}, [line.account]),
        el("td", {}, [line.memo]),
        el("td", { class: "num" }, [line.debitCents === null ? "" : formatPlainCents(line.debitCents)]),
        el("td", { class: "num" }, [line.creditCents === null ? "" : formatPlainCents(line.creditCents)]),
      ]),
    );
  }
  table.append(body);
  return table;
}

export function renderShell(demoLabels: Array<{ id: string; label: string }>): HTMLElement {
  const controls = el("section", { class: "controls", "aria-label": "Import a payout" }, []);
  const file = el("input", { id: "payout-file", type: "file", accept: ".csv,text/csv" });
  const fileLabel = el("label", { class: "file-button", for: "payout-file" }, ["Import payout CSV"]);
  fileLabel.append(file);
  controls.append(fileLabel);
  for (const demo of demoLabels) {
    controls.append(
      el("button", { type: "button", class: "demo", "data-demo": demo.id }, [demo.label]),
    );
  }
  const drop = el("p", { id: "drop-hint", class: "drop-hint" }, [
    "Or drop a .csv anywhere on this page.",
  ]);

  return el("div", { class: "page" }, [
    el("header", { class: "top" }, [
      el("p", { class: "mark" }, ["PayoutFit"]),
      el("h1", {}, ["The deposit, tied out."]),
      el("p", { class: "lede" }, [
        "A payout file is not the sales number. Load it, read the net deposit, and export the journal.",
      ]),
    ]),
    el("main", {}, [
      controls,
      drop,
      el("section", { id: "result", "aria-live": "polite" }, [renderEmpty()]),
    ]),
    el("footer", {}, [
      "Samples are synthetic. Imported files stay in this browser and are not uploaded.",
    ]),
  ]);
}
