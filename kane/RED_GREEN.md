# Red to green

On 13 November 2026, America/Chicago (CST), Kane CLI 0.10.4 ran the committed browser flows against a local `npm run dev` at http://127.0.0.1:5173, using the TestMu account `studentcnnbd` (OAuth profile `default`) and the Chrome already installed on this machine. No tunnel was used. The chargeback fault was introduced only in a scratch git worktree (`scratch/kane-chargeback-bug`). It was not committed to the PR branch.

## The fault

In `src/reconcile.ts`, the chargeback branch was temporarily changed so the whole chargeback net was added to fees:

```ts
case "chargeback":
  feeCents += -line.netCents;
  break;
```

The corrected branch, which stayed on the PR branch, keeps the principal on Chargebacks and only the fee column on Fees.

## What stayed green

The net deposit did not move. Stripe activity nets still summed to $320.19, the stated payout still matched, and the journal still balanced. The hero still read **$320.19** and the status still read **Reconciled**. Kane's first step, "Load the Stripe sample", passed on both the red and green runs. A check of the hero number alone would have passed.

## Kane red run

`kane-cli testmd run kane/flows/payout-reconcile_test.md --agent --headless --timeout 300`, 13 Nov 2026, 09:32:41–09:34:16 CST, against the worktree with the fault in place. Exit 1. Traces: `kane/traces/2026-11-13T153241Z-payout-reconcile-red.ndjson` and `kane/traces/2026-11-13T153241Z-payout-reconcile-red-Result.md`.

- "Load the Stripe sample" passed in 1.46s (replay). Net deposit $320.19, status Reconciled.
- "Read the breakdown" failed. `run_end` reason: assertion failed. Observed Fees **$119.31** (expected $29.81) and Chargebacks **$0.00** (expected $89.50). Kane confirmed a product bug: "Chargebacks folded into fees in payout breakdown", family `application_issue/ui_data_defect`, confidence 0.99. Adaptive heal retried the step and it failed again.
- "Export the journal" did not run after that failure.
- Overall: `test_md_done.overall_status=failed`, duration 92s.

Vitest on the same worktree, saved at `kane/traces/2026-11-13T153232CST-unit-red.txt`, failed 3 tests and passed 11, with the same amounts (Stripe fees 11931 cents vs 2981, Chargebacks $0.00 vs $89.50; PayPal fees 4814 cents vs 2314).

## Kane green runs

The PR branch kept the corrected chargeback branch. The same Kane command was run against that code before and after the red run.

- First green, payout-reconcile, 09:27:52–09:29:51 CST, exit 0, 98s. First-run authoring. `test_md_done.overall_status=passed`. Breakdown: Gross sales $479.50, Fees $29.81, Refunds $40.00, Chargebacks $89.50. Export: Bank deposit debit 320.19, Chargebacks debit 89.50, debits equal credits. Trace: `kane/traces/2026-11-13T152752Z-payout-reconcile-green.ndjson`.
- Green payout-mismatch, 09:30:10–09:31:58 CST, exit 0, 98s. Net deposit $335.19, status Needs review, mismatch flag $15.00, journal credit 15.00 to "Suspense — payout difference", export balanced. Trace: `kane/traces/2026-11-13T153010Z-payout-mismatch-green.ndjson`.
- Post-fix green, payout-reconcile, 09:34:57–09:36:18 CST, exit 0, 71s, after the worktree server was stopped and the PR-branch app was served again. All three steps passed. `run_end` for the breakdown confirmed Gross sales $479.50, Fees $29.81, Refunds $40.00, Chargebacks $89.50. Export confirmed Bank deposit debit 320.19 and Chargebacks debit 89.50. Trace: `kane/traces/2026-11-13T153457Z-payout-reconcile-green-after-fix.ndjson`. One analyze-step summary in that NDJSON says "Chargebacks shows $0.00"; the following assertion and the `run_end` summary both passed with $89.50. The official result is the pass.

Vitest on the PR branch then passed 14 tests (`kane/traces/2026-11-13T1534CST-unit-green.txt`).

## Credits

`kane-cli balance` reported 1200 credits before the first flow and 1037.9356 after the last. See `kane/traces/2026-11-13T0927CST-whoami-balance.txt`.

## How to reproduce the red run locally

1. Leave the PR branch unchanged. In a worktree, in `accumulate`, make the chargeback branch add `-line.netCents` to `feeCents` and do not add `chargebackCents`.
2. Serve that worktree with `npm run dev` on port 5173.
3. From the repo, run `npm run kane`. Expect exit 1 on the breakdown step.
4. Stop that server, serve the PR branch, and run `npm run kane` again. Expect exit 0.
