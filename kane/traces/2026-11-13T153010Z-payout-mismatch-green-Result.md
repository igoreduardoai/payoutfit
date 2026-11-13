---
test: ../payout-mismatch_test.md
status: passed
started: 2026-11-13T15:30:12.395Z
duration_s: 98
session_id: 74bd54d9-0035-4a22-a627-d4d9fb755287
---

# PayoutFit mismatch flag — Result

## Load the mismatch sample ✓ passed (23.7s)
md5: 1632a5dc92c4ac4c1f6a5ecf1ab13049
Open http://127.0.0.1:5173.
Click the button labeled "Load mismatch sample".
Verify the net deposit shows $335.19.
Verify the status reads "Needs review".

## Read the flag ✓ passed (32.5s)
md5: 50e6b75f485ebcf38c5602d49b8d120f
Verify a mismatch flag says the stated payout does not match the computed net and mentions $15.00.
Verify the journal preview contains the account "Suspense — payout difference" with credit 15.00.

## Export the journal ✓ passed (37.7s)
md5: 1066e23ceec6c983d38725a4213cc351
Click "Export bookkeeping CSV".
Verify the page reports that the journal was exported and that debits equal credits.
