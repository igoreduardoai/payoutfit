# Kane fix brief

Source: kane/traces/2026-11-13T153241Z-payout-reconcile-red.ndjson
Overall: failed

Bug: Chargebacks folded into fees in payout breakdown
Kane: The payout breakdown reports the chargeback as zero and adds it to fees instead.

## Failing step 1

Heading: Read the breakdown
Step index: 2
Assertion: the breakdown shows Gross sales $479.50, Fees $29.81, Refunds $40.00, and Chargebacks $89.50; Chargebacks does not show $0.00
Reason: assertion_failed: @ step 6
Observed:
- gross_sales_amount_check: $479.50
- fees_amount_check: $119.31
- refunds_amount_check: $40.00
- chargebacks_amount_check: $0.00
- chargebacks_not_zero_check: $0.00

## Failing step 2

Heading: Read the breakdown
Step index: 2
Assertion: the breakdown shows Gross sales $479.50, Fees $29.81, Refunds $40.00, and Chargebacks $89.50; Chargebacks does not show $0.00.
Reason: Final verification failed: "the breakdown shows Gross sales $479.50, Fees $29.81, Refunds $40.00, and Chargebacks $89.50; Chargebacks does not show $0.00."
Observed:
- gross_sales_amount_check: $479.50
- refunds_amount_check: $40.00
- fees_amount_check: $119.31
- chargebacks_amount_check: $0.00
- chargebacks_zero_amount_absent: true

Fix the failing assertion, then run the flow again.
