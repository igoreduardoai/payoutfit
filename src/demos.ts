import paypal from "../fixtures/paypal-payout-balanced.csv?raw";
import shopify from "../fixtures/shopify-payout-balanced.csv?raw";
import stripe from "../fixtures/stripe-payout-balanced.csv?raw";
import mismatch from "../fixtures/stripe-payout-mismatch.csv?raw";

export interface DemoSample {
  id: string;
  label: string;
  filename: string;
  csv: string;
}

export const DEMOS: DemoSample[] = [
  {
    id: "stripe-balanced",
    label: "Load Stripe sample",
    filename: "stripe-payout-balanced.csv",
    csv: stripe,
  },
  {
    id: "paypal-balanced",
    label: "Load PayPal sample",
    filename: "paypal-payout-balanced.csv",
    csv: paypal,
  },
  {
    id: "shopify-balanced",
    label: "Load Shopify sample",
    filename: "shopify-payout-balanced.csv",
    csv: shopify,
  },
  {
    id: "stripe-mismatch",
    label: "Load mismatch sample",
    filename: "stripe-payout-mismatch.csv",
    csv: mismatch,
  },
];

export function demoById(id: string): DemoSample | undefined {
  return DEMOS.find((demo) => demo.id === id);
}
