import { parseDate } from "./dates";
import { normalizeHeader, parseCsvRows } from "./csv";
import { feeCostCents, formatCents, parseMoneyToCents } from "./money";
import type {
  Breakdown,
  Cents,
  Flag,
  LineKind,
  NormalizedLine,
  ProcessorId,
  Reconciliation,
  ReconcileOutcome,
} from "./types";
import { buildJournal } from "./journal";

const GROSS_KEYS = ["gross", "amount"];
const FEE_KEYS = ["fee", "fees"];
const NET_KEYS = ["net"];
const TYPE_KEYS = ["reporting_category", "type"];
const ID_KEYS = ["balance_transaction_id", "transaction_id", "id"];
const PAYOUT_ID_KEYS = ["automatic_payout_id", "payout_id"];
const PAYOUT_DATE_KEYS = [
  "automatic_payout_effective_at",
  "payout_date",
  "available_on",
  "available_on_utc",
];
const ACTIVITY_DATE_KEYS = ["transaction_date", "date", "created", "created_utc"];
const CURRENCY_KEYS = ["currency"];
const DESC_KEYS = ["description", "item_title", "order", "memo"];

function pick(headers: string[], keys: string[]): number {
  for (const key of keys) {
    const index = headers.indexOf(key);
    if (index >= 0) return index;
  }
  return -1;
}

function detectProcessor(headers: string[]): ProcessorId {
  const set = new Set(headers);
  if (
    set.has("reporting_category") ||
    set.has("automatic_payout_id") ||
    set.has("balance_transaction_id")
  ) {
    return "stripe";
  }
  if (set.has("transaction_id") && (set.has("item_title") || set.has("balance"))) {
    return "paypal";
  }
  if (
    set.has("payout_date") &&
    set.has("amount") &&
    (set.has("order") || set.has("transaction_date"))
  ) {
    return "shopify";
  }
  return "generic";
}

function kindFromLabel(label: string): LineKind | null {
  const t = label.trim().toLowerCase().replace(/\s+/g, " ");
  if (!t) return null;
  if (
    t === "payout" ||
    t === "transfer" ||
    t === "withdrawal" ||
    t === "general withdrawal" ||
    t === "user initiated withdrawal" ||
    t === "bank withdrawal"
  ) {
    return "payout";
  }
  if (t.includes("chargeback fee") || t.includes("dispute fee") || t === "fee") return "fee";
  if (t.includes("chargeback") || t.includes("dispute")) return "chargeback";
  if (t.includes("refund")) return "refund";
  if (t.includes("adjustment") || t === "reserve") return "adjustment";
  if (
    t === "charge" ||
    t === "payment" ||
    t === "sale" ||
    t.includes("checkout payment") ||
    t === "website payment" ||
    t === "subscription payment"
  ) {
    return "charge";
  }
  return "unknown";
}

function cell(row: string[], index: number): string {
  if (index < 0 || index >= row.length) return "";
  return row[index] ?? "";
}

function mode(values: string[]): string | null {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

export function reconcileCsv(text: string, sourceName: string): ReconcileOutcome {
  const table = parseCsvRows(text);
  if (table.length === 0) {
    return { ok: false, message: "The file is empty." };
  }
  const headers = table[0].map(normalizeHeader);
  const data = table.slice(1);
  if (data.length === 0) {
    return { ok: false, message: "The file has headers but no data rows." };
  }
  const grossIndex = pick(headers, GROSS_KEYS);
  const netIndex = pick(headers, NET_KEYS);
  if (grossIndex < 0 || netIndex < 0) {
    const found = headers.filter(Boolean).join(", ") || "(none)";
    return {
      ok: false,
      message: `This CSV needs a gross (or amount) column and a net column. Found: ${found}.`,
    };
  }

  const feeIndex = pick(headers, FEE_KEYS);
  const typeIndex = pick(headers, TYPE_KEYS);
  const idIndex = pick(headers, ID_KEYS);
  const payoutIdIndex = pick(headers, PAYOUT_ID_KEYS);
  const payoutDateIndex = pick(headers, PAYOUT_DATE_KEYS);
  const activityDateIndex = pick(headers, ACTIVITY_DATE_KEYS);
  const currencyIndex = pick(headers, CURRENCY_KEYS);
  const descIndex = pick(headers, DESC_KEYS);
  const processor = detectProcessor(headers);
  const flags: Flag[] = [];
  const seenIds = new Set<string>();
  const lines: NormalizedLine[] = [];

  data.forEach((row, index) => {
    const lineNumber = index + 2;
    if (row.length !== headers.length) {
      flags.push({
        code: "ROW_WIDTH",
        lineNumber,
        message: `Line ${lineNumber} has ${row.length} cells and the header has ${headers.length}.`,
      });
    }
    const grossCell = cell(row, grossIndex);
    const netCell = cell(row, netIndex);
    const feeCell = feeIndex < 0 ? "" : cell(row, feeIndex);
    const gross = parseMoneyToCents(grossCell);
    const net = parseMoneyToCents(netCell);
    if (netCell.trim() === "" || net === null) {
      flags.push({
        code: netCell.trim() === "" ? "MISSING_NET" : "BAD_AMOUNT",
        lineNumber,
        message: `Line ${lineNumber} has no usable net amount ("${netCell}"). It was left out of the totals.`,
      });
      return;
    }
    if (grossCell.trim() === "" || gross === null) {
      flags.push({
        code: grossCell.trim() === "" ? "MISSING_GROSS" : "BAD_AMOUNT",
        lineNumber,
        message: `Line ${lineNumber} has no usable gross amount. Its net was kept as unclassified.`,
      });
    }
    const feeRaw = feeCell.trim() === "" ? 0 : parseMoneyToCents(feeCell);
    if (feeRaw === null) {
      flags.push({
        code: "BAD_AMOUNT",
        lineNumber,
        message: `Line ${lineNumber} has a fee that is not a number ("${feeCell}").`,
      });
    }
    const grossCents = gross ?? 0;
    const feeForMath = feeRaw ?? 0;
    const cost = gross === null || feeRaw === null ? null : feeCostCents(grossCents, feeForMath, net);
    if (cost === null && gross !== null && feeRaw !== null) {
      flags.push({
        code: "ROW_NET_MISMATCH",
        lineNumber,
        message: `Line ${lineNumber}: net ${formatCents(net, null)} is not gross minus fee or gross plus fee.`,
      });
    }

    const label = cell(row, typeIndex);
    let kind = kindFromLabel(label);
    if (kind === null) {
      if (gross !== null && gross > 0) kind = "charge";
      else if (gross !== null && gross < 0) {
        kind = "unknown";
        flags.push({
          code: "UNCLASSIFIED_ROW",
          lineNumber,
          message: `Line ${lineNumber} is negative and has no type, so it was not guessed as a refund or a chargeback.`,
        });
      } else kind = "unknown";
    } else if (kind === "unknown") {
      flags.push({
        code: "UNCLASSIFIED_ROW",
        lineNumber,
        message: `Line ${lineNumber} has an unrecognized type "${label}". Its net was kept as unclassified.`,
      });
    }

    if ((kind === "refund" || kind === "chargeback") && gross !== null && gross > 0) {
      flags.push({
        code: "UNEXPECTED_SIGN",
        lineNumber,
        message: `Line ${lineNumber} is a ${kind} with a positive gross. Its net was kept as unclassified.`,
      });
      kind = "unknown";
    }
    if (kind === "charge" && gross !== null && gross < 0) {
      flags.push({
        code: "UNEXPECTED_SIGN",
        lineNumber,
        message: `Line ${lineNumber} is a charge with a negative gross.`,
      });
    }

    const id = cell(row, idIndex).trim();
    let skippedDuplicate = false;
    if (id) {
      if (seenIds.has(id)) {
        skippedDuplicate = true;
        flags.push({
          code: "DUPLICATE_ID",
          lineNumber,
          message: `Line ${lineNumber} repeats transaction ${id}. The later copy was left out of the totals.`,
        });
      } else {
        seenIds.add(id);
      }
    }

    lines.push({
      lineNumber,
      id,
      kind,
      grossCents,
      feeCostCents: cost ?? 0,
      netCents: net,
      currency: cell(row, currencyIndex).trim().toUpperCase(),
      activityDate: parseDate(cell(row, activityDateIndex)),
      payoutDate: parseDate(cell(row, payoutDateIndex)),
      payoutId: cell(row, payoutIdIndex).trim() || null,
      description: cell(row, descIndex).trim(),
      skippedDuplicate,
    });
  });

  const counted = lines.filter((line) => !line.skippedDuplicate);
  const currencies = [...new Set(counted.map((line) => line.currency).filter(Boolean))];
  let currency: string | null = null;
  if (currencies.length === 1) currency = currencies[0];
  else if (currencies.length === 0) {
    flags.push({
      code: "MISSING_CURRENCY",
      message: "No currency column was filled in. Amounts are shown without a conversion.",
    });
  } else {
    flags.push({
      code: "MIXED_CURRENCY",
      message: `The file mixes ${currencies.join(", ")}. Amounts were not converted.`,
    });
  }

  const activity = counted.filter((line) => line.kind !== "payout");
  const payouts = counted.filter((line) => line.kind === "payout");
  const breakdown = accumulate(activity);
  const stated = statedPayout(payouts, flags, currency);
  breakdown.statedPayoutCents = stated;
  breakdown.differenceCents = stated === null ? null : stated - breakdown.computedNetCents;
  if (breakdown.differenceCents !== null && breakdown.differenceCents !== 0) {
    flags.push({
      code: "PAYOUT_MISMATCH",
      message: `Stated payout ${formatCents(stated ?? 0, currency)} does not match computed net ${formatCents(breakdown.computedNetCents, currency)} (difference ${formatCents(breakdown.differenceCents, currency)}).`,
    });
  }

  const payoutDate =
    mode(payouts.map((line) => line.activityDate ?? "")) ??
    mode(counted.map((line) => line.payoutDate ?? "")) ??
    null;
  if (!payoutDate) {
    flags.push({
      code: "MISSING_PAYOUT_DATE",
      message: "No payout date was found. The journal date is blank.",
    });
  }
  const payoutId = mode(counted.map((line) => line.payoutId ?? "").filter(Boolean)) ?? null;

  const parts =
    breakdown.grossSalesCents -
    breakdown.feeCents -
    breakdown.refundCents -
    breakdown.chargebackCents +
    breakdown.adjustmentCents +
    breakdown.unclassifiedCents;
  if (parts !== breakdown.computedNetCents) {
    flags.push({
      code: "COMPONENT_GAP",
      message: `The breakdown adds to ${formatCents(parts, currency)} but the line nets add to ${formatCents(breakdown.computedNetCents, currency)}.`,
    });
  }

  const heroCents = stated ?? breakdown.computedNetCents;
  const reconciliation: Reconciliation = {
    processor,
    sourceName,
    currency,
    payoutDate,
    payoutId,
    lines,
    activityCount: activity.length,
    payoutCount: payouts.length,
    breakdown,
    flags,
    heroCents,
    status: flags.length === 0 ? "reconciled" : "needs-review",
  };
  return { ok: true, reconciliation, journal: buildJournal(reconciliation) };
}

function accumulate(activity: NormalizedLine[]): Breakdown {
  let grossSalesCents = 0;
  let feeCents = 0;
  let refundCents = 0;
  let chargebackCents = 0;
  let adjustmentCents = 0;
  let unclassifiedCents = 0;
  let computedNetCents = 0;

  for (const line of activity) {
    computedNetCents += line.netCents;
    const decomposed = line.grossCents - line.feeCostCents === line.netCents;
    if (!decomposed || line.kind === "unknown") {
      unclassifiedCents += line.netCents;
      continue;
    }
    switch (line.kind) {
      case "charge":
        grossSalesCents += line.grossCents;
        feeCents += line.feeCostCents;
        break;
      case "refund":
        refundCents += Math.abs(line.grossCents);
        feeCents += line.feeCostCents;
        break;
      case "chargeback":
        // Principal stays on Chargebacks. Folding the whole net into fees
        // still balances, and the hero number does not move. See kane/RED_GREEN.md.
        chargebackCents += Math.abs(line.grossCents);
        feeCents += line.feeCostCents;
        break;
      case "fee":
        feeCents += -line.netCents;
        break;
      case "adjustment":
        adjustmentCents += line.netCents;
        break;
      default:
        unclassifiedCents += line.netCents;
        break;
    }
  }

  return {
    grossSalesCents,
    feeCents,
    refundCents,
    chargebackCents,
    adjustmentCents,
    unclassifiedCents,
    computedNetCents,
    statedPayoutCents: null,
    differenceCents: null,
  };
}

function statedPayout(payouts: NormalizedLine[], flags: Flag[], currency: string | null): Cents | null {
  if (payouts.length === 0) return null;
  const nets = payouts.map((line) => line.netCents);
  if (nets.every((net) => net <= 0)) return -nets.reduce((sum, net) => sum + net, 0);
  if (nets.every((net) => net >= 0)) return nets.reduce((sum, net) => sum + net, 0);
  flags.push({
    code: "MIXED_PAYOUT_SIGNS",
    message: `Payout rows mix signs (${nets.map((net) => formatCents(net, currency)).join(", ")}). The hero uses the computed net.`,
  });
  return null;
}
