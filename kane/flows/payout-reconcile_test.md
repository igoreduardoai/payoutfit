---
mode: testing
tags: [smoke, payoutfit]
max_steps: 20
timeout: 90
headless: true
url: http://127.0.0.1:5173
code_export: false
---

# PayoutFit net deposit

## Load the Stripe sample
Open http://127.0.0.1:5173.
Click the button labeled "Load Stripe sample".
Verify the page shows the heading "Net deposit" and the amount $320.19.
Verify the status reads "Reconciled".

## Read the breakdown
Verify the breakdown shows Gross sales $479.50, Fees $29.81, Refunds $40.00, and Chargebacks $89.50.
Fail this step if Chargebacks shows $0.00. That means the chargeback was folded into fees.

## Export the journal
Click the button labeled "Export bookkeeping CSV".
Verify the page reports that the journal was exported and that debits equal credits.
Verify the journal preview contains an account "Bank deposit" with debit 320.19 and an account "Chargebacks" with debit 89.50.
