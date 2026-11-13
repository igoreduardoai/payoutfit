# Red to green

Kane CLI did not execute these flows in the environment that built this repo. `kane-cli whoami` reported that the CLI was not logged in, and no access key is stored here. The trace below is the unit-test run that caught the fault, the same fault the Kane flow is written to catch.

## The fault

In `src/reconcile.ts`, the chargeback branch was temporarily changed so the whole chargeback net was added to fees:

```ts
case "chargeback":
  feeCents += -line.netCents;
  break;
```

The corrected branch keeps the principal on Chargebacks and only the fee column on Fees.

## What stayed green

The net deposit did not move. Stripe activity nets still summed to $320.19, the stated payout still matched, and the journal still balanced. The hero still read **$320.19** and the status still read **Reconciled**. A check of the hero number alone would have passed.

## What went red

Vitest, 13 Nov 2026, with the fault in place (`kane/traces/unit-red.txt`):

- Stripe fees were $119.31 (11931 cents). The fixture expects $29.81 (2981 cents).
- The hero screen showed Chargebacks **$0.00**. The fixture expects **$89.50**.
- PayPal fees were $48.14 (4814 cents). The fixture expects $23.14 (2314 cents), because the $25.00 chargeback principal had been folded into fees on top of the $15.00 chargeback fee.

3 tests failed. 11 passed.

## What went green

The chargeback principal was put back on the Chargebacks account. The same command then passed 14 tests (`kane/traces/unit-green.txt`).

The Kane flow `kane/flows/payout-reconcile_test.md` tells the browser agent to fail the breakdown step if Chargebacks shows $0.00. That is the browser version of the red assertion. It has not been run here.

## How to reproduce the red run locally

1. In `accumulate`, make the chargeback branch add `-line.netCents` to `feeCents` and do not add `chargebackCents`.
2. Run `npm test`.
3. Put the original branch back. The committed code is the green version.
