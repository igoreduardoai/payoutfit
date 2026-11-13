---
mode: testing
tags: [payoutfit, mismatch]
max_steps: 20
timeout: 90
headless: true
url: http://127.0.0.1:5173
code_export: false
---

# PayoutFit mismatch flag

## Load the mismatch sample
Open http://127.0.0.1:5173.
Click the button labeled "Load mismatch sample".
Verify the net deposit shows $335.19.
Verify the status reads "Needs review".

## Read the flag
Verify a mismatch flag says the stated payout does not match the computed net and mentions $15.00.
Verify the journal preview contains the account "Suspense — payout difference" with credit 15.00.

## Export the journal
Click "Export bookkeeping CSV".
Verify the page reports that the journal was exported and that debits equal credits.
