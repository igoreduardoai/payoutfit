/** Integer cents. Avoids binary floating point in the journal. */
export type Cents = number;

export type ProcessorId = "stripe" | "paypal" | "shopify" | "generic";

export type LineKind =
  | "charge"
  | "refund"
  | "chargeback"
  | "fee"
  | "adjustment"
  | "payout"
  | "unknown";

export type FlagCode =
  | "ROW_NET_MISMATCH"
  | "PAYOUT_MISMATCH"
  | "DUPLICATE_ID"
  | "MIXED_CURRENCY"
  | "MISSING_CURRENCY"
  | "MISSING_PAYOUT_DATE"
  | "MISSING_NET"
  | "MISSING_GROSS"
  | "BAD_AMOUNT"
  | "ROW_WIDTH"
  | "UNCLASSIFIED_ROW"
  | "UNEXPECTED_SIGN"
  | "MIXED_PAYOUT_SIGNS"
  | "COMPONENT_GAP";

export interface Flag {
  code: FlagCode;
  message: string;
  lineNumber?: number;
}

export interface NormalizedLine {
  lineNumber: number;
  id: string;
  kind: LineKind;
  grossCents: Cents;
  feeCostCents: Cents;
  netCents: Cents;
  currency: string;
  activityDate: string | null;
  payoutDate: string | null;
  payoutId: string | null;
  description: string;
  skippedDuplicate: boolean;
}

export interface Breakdown {
  grossSalesCents: Cents;
  feeCents: Cents;
  refundCents: Cents;
  chargebackCents: Cents;
  adjustmentCents: Cents;
  unclassifiedCents: Cents;
  computedNetCents: Cents;
  statedPayoutCents: Cents | null;
  /** Stated payout minus computed net. Null when the file has no payout row. */
  differenceCents: Cents | null;
}

export interface Reconciliation {
  processor: ProcessorId;
  sourceName: string;
  currency: string | null;
  payoutDate: string | null;
  payoutId: string | null;
  lines: NormalizedLine[];
  activityCount: number;
  payoutCount: number;
  breakdown: Breakdown;
  flags: Flag[];
  /** Amount the bank should show: stated payout when the file has one, otherwise computed net. */
  heroCents: Cents;
  status: "reconciled" | "needs-review";
}

export interface JournalLine {
  date: string;
  account: string;
  memo: string;
  debitCents: Cents | null;
  creditCents: Cents | null;
}

export interface Journal {
  lines: JournalLine[];
  debitCents: Cents;
  creditCents: Cents;
  filename: string;
}

export type ReconcileOutcome =
  | { ok: true; reconciliation: Reconciliation; journal: Journal }
  | { ok: false; message: string };
