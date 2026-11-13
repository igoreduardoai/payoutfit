import type { ProcessorId } from "./types";

export const PROCESSOR_LABEL: Record<ProcessorId, string> = {
  stripe: "Stripe-style",
  paypal: "PayPal-style",
  shopify: "Shopify-style",
  generic: "Generic payout",
};

export const ACCOUNT = {
  bank: "Bank deposit",
  fees: "Processing fees",
  refunds: "Refunds",
  chargebacks: "Chargebacks",
  adjustments: "Payout adjustments",
  unclassified: "Unclassified payout items",
  sales: "Sales",
  suspense: "Suspense — payout difference",
} as const;
