import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  FileWarning,
  Info,
  ReceiptText,
  Upload,
  createElement,
  type IconNode,
} from "lucide";
import { PROCESSOR_LABEL } from "./labels";
import { formatCents, formatPlainCents } from "./money";
import type { Cents, Journal, Reconciliation, ReconcileOutcome } from "./types";

type Child = Node | string;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string>,
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) node.append(typeof child === "string" ? document.createTextNode(child) : child);
  return node;
}

function icon(node: IconNode, cls = "size-4"): SVGElement {
  const svg = createElement(node);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("stroke-width", "1.75");
  svg.setAttribute("class", `${cls} shrink-0`);
  return svg;
}

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const BTN_PRIMARY = `${BTN_BASE} min-h-12 px-5 text-base bg-primary text-white shadow-sm hover:bg-primary-hover`;
const BTN_OUTLINE = `${BTN_BASE} min-h-11 px-4 text-sm border border-control bg-surface text-ink hover:bg-subtle`;
const CARD = "min-w-0 rounded-2xl bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.06),0_1px_3px_rgba(16,24,40,0.10)]";

function money(cents: Cents, currency: string | null): string {
  return formatCents(cents, currency);
}

function row(label: string, value: string, testId: string, strong = false): HTMLElement {
  return el("div", { class: `flex items-baseline justify-between gap-4 py-2 ${strong ? "font-semibold" : ""}` }, [
    el("dt", { class: strong ? "text-ink" : "text-muted" }, [label]),
    el("dd", { class: "tabular-nums text-ink", "data-testid": testId }, [value]),
  ]);
}

export function renderEmpty(): HTMLElement {
  return el("div", { class: `${CARD} flex flex-col items-start gap-3 p-6 sm:p-8` }, [
    el("span", { class: "grid size-10 place-items-center rounded-full bg-subtle text-muted" }, [icon(ReceiptText, "size-5")]),
    el("h2", { class: "text-lg font-semibold" }, ["No payout loaded"]),
    el("p", { class: "max-w-prose text-muted" }, [
      "Pick a synthetic sample, import a payout CSV, or drop a file on the page. PayoutFit reads gross sales, fees, refunds, and chargebacks, then shows the net deposit.",
    ]),
  ]);
}

export function renderOutcome(outcome: ReconcileOutcome, sourceCsv?: string): HTMLElement {
  if (!outcome.ok) {
    return el("div", { class: `${CARD} p-6 sm:p-8`, role: "alert" }, [
      el("p", { class: "mb-3 inline-flex items-center gap-2 rounded-full bg-err-bg px-3 py-1 text-sm font-medium text-err" }, [
        icon(FileWarning),
        "Could not read",
      ]),
      el("h2", { class: "text-xl font-semibold" }, ["This file could not be reconciled"]),
      el("p", { class: "mt-2 text-muted", "data-testid": "parse-error" }, [outcome.message]),
      el("p", { class: "mt-2 text-sm text-muted" }, ["Check that it is a payout CSV with a header row, or try one of the samples."]),
    ]);
  }
  return renderReconciliation(outcome.reconciliation, outcome.journal, sourceCsv);
}

function readableDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
}

function describe(reconciliation: Reconciliation): string {
  const parts = [`${PROCESSOR_LABEL[reconciliation.processor]} payout`];
  parts.push(reconciliation.payoutId ? reconciliation.payoutId : `from ${reconciliation.sourceName}`);
  const bits = [parts.join(" ")];
  if (reconciliation.currency) bits.push(reconciliation.currency);
  bits.push(reconciliation.payoutDate ? `paid ${readableDate(reconciliation.payoutDate)}` : "no payout date in the file");
  bits.push(`${reconciliation.activityCount} activity lines`);
  return `${bits.join(", ")}.`;
}

export function renderReconciliation(reconciliation: Reconciliation, journal: Journal, sourceCsv?: string): HTMLElement {
  const currency = reconciliation.currency;
  const reconciled = reconciliation.status === "reconciled";
  const statusLabel = reconciled ? "Reconciled" : "Needs review";
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
  const totals = [
    row("Computed net", money(breakdown.computedNetCents, currency), "computed-net", true),
    row(
      "Stated payout",
      breakdown.statedPayoutCents === null ? "Not in file" : money(breakdown.statedPayoutCents, currency),
      "stated-payout",
    ),
  ];
  if (breakdown.differenceCents !== null) {
    totals.push(row("Difference", money(breakdown.differenceCents, currency), "difference"));
  }

  const flagList =
    reconciliation.flags.length === 0
      ? el("p", { class: "text-sm text-muted", "data-testid": "flags" }, ["No mismatch flags."])
      : el(
          "div",
          { class: "flex gap-3 rounded-xl bg-wait-bg p-4 text-wait", role: "note" },
          [
            icon(AlertTriangle, "size-5 mt-0.5"),
            el(
              "ul",
              { class: "space-y-1 text-sm", "data-testid": "flags" },
              reconciliation.flags.map((flag) => el("li", { "data-flag": flag.code }, [flag.message])),
            ),
          ],
        );

  const balanced = journal.debitCents === journal.creditCents;
  const balanceText = balanced
    ? `Debits ${money(journal.debitCents, currency)} equal credits ${money(journal.creditCents, currency)}.`
    : `Debits ${money(journal.debitCents, currency)} do not equal credits ${money(journal.creditCents, currency)}.`;

  const badge = el(
    "p",
    {
      class: `inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
        reconciled ? "bg-ok-bg text-ok" : "bg-wait-bg text-wait"
      }`,
    },
    [icon(reconciled ? CheckCircle2 : AlertTriangle), el("span", { "data-testid": "status" }, [statusLabel])],
  );

  const resultCard = el("section", { class: `${CARD} result-card p-6 sm:p-8`, "aria-labelledby": "net-heading" }, [
    el("div", { class: "grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]" }, [
      el("div", { class: "flex min-w-0 flex-col items-start gap-4" }, [
        badge,
        el("div", {}, [
          el("h2", { id: "net-heading", class: "text-base font-medium text-muted" }, ["Net deposit"]),
          el(
            "p",
            {
              class: "mt-1 text-[2.5rem] leading-[1.1] font-bold tracking-[-0.02em] tabular-nums sm:text-5xl",
              "data-testid": "net-deposit",
              "data-net-cents": String(reconciliation.heroCents),
            },
            [money(reconciliation.heroCents, currency)],
          ),
          el("p", { class: "mt-2 max-w-prose text-sm text-muted", "data-testid": "meta" }, [describe(reconciliation)]),
        ]),
        flagList,
        el("div", { class: "flex w-full flex-col items-start gap-2 pt-2" }, [
          el("button", { type: "button", id: "export-journal", class: BTN_PRIMARY }, [icon(Download, "size-5"), "Export bookkeeping CSV"]),
          el("p", { id: "export-status", class: "min-h-5 text-sm text-ok", "data-testid": "export-status", role: "status" }, [""]),
        ]),
      ]),
      el("div", { class: "min-w-0 lg:border-l lg:border-line lg:pl-8" }, [
        el("h3", { class: "text-base font-semibold" }, ["Breakdown"]),
        el("dl", { class: "mt-2 divide-y divide-line/70" }, rows),
        el("dl", { class: "mt-1 border-t border-ink/20" }, totals),
        el("p", { class: "mt-3 text-xs text-muted" }, [
          "Computed net = gross sales − fees − refunds − chargebacks + adjustments.",
        ]),
      ]),
    ]),
  ]);

  const journalCard = el("section", { class: `${CARD} p-6 sm:p-8`, "aria-labelledby": "journal-heading" }, [
    el("div", { class: "flex flex-wrap items-baseline justify-between gap-2" }, [
      el("h2", { id: "journal-heading", class: "text-lg font-semibold" }, ["Journal preview"]),
      el(
        "p",
        { class: `inline-flex items-center gap-1.5 text-sm font-medium ${balanced ? "text-ok" : "text-err"}`, "data-testid": "journal-balance" },
        [icon(balanced ? CheckCircle2 : AlertTriangle), balanceText],
      ),
    ]),
    el("p", { class: "mt-1 max-w-prose text-sm text-muted" }, [
      "One summary entry for the deposit. A stated payout that the components do not explain is parked in suspense so the columns still balance.",
    ]),
    el("div", { class: "mt-4 overflow-x-auto rounded-lg", tabindex: "0", role: "region", "aria-label": "Journal table" }, [renderTable(journal)]),
  ]);

  const children: HTMLElement[] = [resultCard, journalCard];
  if (sourceCsv) {
    children.push(
      el("details", { class: `${CARD} group` }, [
        el("summary", { class: "flex cursor-pointer items-center justify-between gap-2 rounded-2xl px-6 py-4 font-medium hover:bg-subtle sm:px-8" }, [
          "Show source CSV",
          icon(ChevronDown, "size-4 transition-transform group-open:rotate-180"),
        ]),
        el("pre", { class: "mx-6 mb-6 overflow-x-auto rounded-lg bg-code p-4 font-mono text-[0.8125rem] leading-relaxed text-code-ink sm:mx-8", tabindex: "0" }, [
          sourceCsv.trim(),
        ]),
      ]),
    );
  }
  return el("div", { class: "flex min-w-0 flex-col gap-6" }, children);
}

function renderTable(journal: Journal): HTMLElement {
  const th = "px-3 py-2 text-left text-xs font-medium text-muted";
  const table = el("table", { class: "w-full min-w-[36rem] text-sm" }, [
    el("caption", { class: "sr-only" }, ["Bookkeeping journal preview"]),
    el("thead", { class: "bg-subtle" }, [
      el(
        "tr",
        {},
        ["Date", "Account", "Memo", "Debit", "Credit"].map((name, index) =>
          el("th", { scope: "col", class: `${th} ${index > 2 ? "text-right" : ""}` }, [name]),
        ),
      ),
    ]),
  ]);
  const body = el("tbody", { class: "divide-y divide-line/70" }, []);
  for (const line of journal.lines) {
    body.append(
      el("tr", {}, [
        el("td", { class: "px-3 py-2 whitespace-nowrap tabular-nums text-muted" }, [line.date]),
        el("td", { class: "px-3 py-2 font-medium" }, [line.account]),
        el("td", { class: "px-3 py-2 text-muted" }, [line.memo]),
        el("td", { class: "px-3 py-2 text-right tabular-nums" }, [line.debitCents === null ? "" : formatPlainCents(line.debitCents)]),
        el("td", { class: "px-3 py-2 text-right tabular-nums" }, [line.creditCents === null ? "" : formatPlainCents(line.creditCents)]),
      ]),
    );
  }
  table.append(body);
  return table;
}

export function renderShell(demoLabels: Array<{ id: string; label: string }>): HTMLElement {
  const file = el("input", { id: "payout-file", type: "file", accept: ".csv,text/csv", class: "sr-only" });
  const fileLabel = el("label", { class: `${BTN_OUTLINE} w-full focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus`, for: "payout-file" }, [
    icon(Upload),
    "Import payout CSV",
  ]);
  fileLabel.append(file);

  const samples = el(
    "div",
    { class: "grid grid-cols-2 gap-2 lg:grid-cols-1", role: "group", "aria-labelledby": "samples-heading" },
    demoLabels.map((demo) =>
      el(
        "button",
        {
          type: "button",
          class: `${BTN_BASE} demo min-h-11 justify-center rounded-lg border border-line bg-surface px-2 text-center text-sm lg:justify-start lg:px-3 lg:text-left text-ink hover:border-control hover:bg-subtle aria-pressed:border-primary aria-pressed:bg-primary/5 aria-pressed:text-primary`,
          "data-demo": demo.id,
          "aria-pressed": "false",
        },
        [demo.label],
      ),
    ),
  );

  const controls = el("section", { class: `${CARD} flex flex-col gap-4 p-5 lg:sticky lg:top-6`, "aria-label": "Import a payout" }, [
    el("h2", { class: "text-base font-semibold" }, ["Choose a payout"]),
    fileLabel,
    el("p", { id: "samples-heading", class: "text-sm text-muted" }, ["Or load a synthetic sample"]),
    samples,
    el("p", { id: "drop-hint", class: "hidden text-sm text-muted lg:block" }, ["You can also drop a .csv anywhere on this page."]),
  ]);

  return el("div", { class: "mx-auto flex min-h-screen max-w-6xl flex-col px-4 sm:px-6" }, [
    el("header", { class: "flex flex-col gap-1 py-5 sm:py-6" }, [
      el("div", { class: "flex items-center gap-2" }, [
        el("span", { class: "grid size-8 place-items-center rounded-lg bg-primary text-white" }, [icon(ReceiptText, "size-[18px]")]),
        el("h1", { class: "text-lg font-semibold" }, ["PayoutFit"]),
      ]),
      el("p", { class: "text-ink" }, ["Turn a processor payout CSV into the net deposit and a balanced bookkeeping journal."]),
      el("p", { class: "flex items-center gap-1.5 text-sm text-muted" }, [
        icon(Info),
        "Samples are synthetic. Imported files stay in this browser and are not uploaded.",
      ]),
    ]),
    el("main", { class: "grid flex-1 items-start gap-6 pb-12 lg:grid-cols-[18rem_minmax(0,1fr)]" }, [
      controls,
      el("section", { id: "result", class: "min-w-0", "aria-live": "polite", "aria-label": "Result" }, [renderEmpty()]),
    ]),
    el("footer", { class: "border-t border-line py-6 text-sm text-muted" }, [
      "PayoutFit by Igor Eduardo. Built with Cursor, verified with Kane CLI. MIT license.",
    ]),
  ]);
}
