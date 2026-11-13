---
test: ../payout-reconcile_test.md
status: passed
started: 2026-11-13T15:34:59.185Z
duration_s: 71
session_id: 9970be31-d035-4d05-ad1a-ff385a376939
---

# PayoutFit net deposit — Result

## Load the Stripe sample ✓ passed (1.51s)
md5: 92ce87e016c14771e3519591a8587b25
Open http://127.0.0.1:5173.
Click the button labeled "Load Stripe sample".
Verify the page shows the heading "Net deposit" and the amount $320.19.
Verify the status reads "Reconciled".

## Read the breakdown ✓ passed (28.6s)
md5: a99d65f1c0110640974f9a09581a6eb6
Verify the breakdown shows Gross sales $479.50, Fees $29.81, Refunds $40.00, and Chargebacks $89.50.
Fail this step if Chargebacks shows $0.00. That means the chargeback was folded into fees.

## Export the journal ✓ passed (36.9s)
md5: d66b78aad2017182963aa9adf18206ef
Click the button labeled "Export bookkeeping CSV".
Verify the page reports that the journal was exported and that debits equal credits.
Verify the journal preview contains an account "Bank deposit" with debit 320.19 and an account "Chargebacks" with debit 89.50.
