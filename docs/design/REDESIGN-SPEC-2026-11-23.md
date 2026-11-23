# PayoutFit redesign spec (2026-11-23)

Standard: Hackathon Design Standard v1 (tokens below). Author: Igor Eduardo. Data: the synthetic samples in `fixtures/` only.
Before: https://payoutfit.vercel.app (`docs/design/screens/before-*.png`).

## What is wrong now
1. Cream paper with ruled lines, a serif display headline and an ALL-CAPS eyebrow ("PAYOUTFIT", "NET DEPOSIT"): the warm-cream-plus-serif generated look the standard bans.
2. Five same-weight outline buttons wrap onto two rows; on 390px they stack into a 300px-tall wall before any result.
3. The result is a 72px serif number with a middle-dot meta string under it ("Stripe-style · USD · 2026-11-03 · …").
4. The one real action (Export bookkeeping CSV) is at the very bottom, under the journal table, below the fold at 1280×800.
5. Mobile overflows horizontally: the meta string and the breakdown formula are cut off at the right edge.
6. Status is a small dark-green chip with no icon.

## Direction
Tool for a freelance bookkeeper: calm, precise, like a finance dashboard. Cool near-white page, white cards, navy ink, deep-teal primary. Inter Variable for UI; tabular numbers. Mono only for the raw CSV in "Show source".

## Desktop 1280×800, first viewport
- Top bar: receipt icon + "PayoutFit" (h1, 18px) + one plain sentence "Turn a processor payout CSV into the net deposit and a balanced journal." One quiet info line: "Samples are synthetic. Files stay in this browser and are not uploaded."
- Left rail (300px card "Choose a payout"): "Import payout CSV" (outline, upload icon), four sample buttons with the existing labels ("Load Stripe sample", …, "Load mismatch sample") as a vertical list, drop hint.
- Right column, result card: status badge with icon + word (CheckCircle2 "Reconciled" green / AlertTriangle "Needs review" amber), heading "Net deposit", the amount at 40px/700 tabular, one sentence ("Stripe-style payout po_synth_stripe_001, USD, paid 2026-11-03, 5 activity lines."), mismatch flags as an amber alert inside the card, primary button "Export bookkeeping CSV" + the export status line. Right half of the card: the breakdown list (gross, fees, refunds, chargebacks, computed net, stated payout, difference) with the formula as a muted footnote.
- Below the fold: "Journal preview" card (table, balance line), then "Show source" disclosure with the raw input CSV in mono.

## Mobile 390×844
Top bar, info line, compact "Choose a payout" card (import + 2×2 sample grid, 44px targets), then the result card: badge, amount, sentence, primary button, breakdown. No horizontal overflow; table scrolls inside its own region.

## Must not change
- All `data-testid`s (net-deposit, status, meta, gross-sales, fees, refunds, chargebacks, computed-net, stated-payout, difference, flags, journal-balance, export-status, parse-error) and the status text ("Reconciled" / "Needs review").
- Button names used by Kane flows and e2e: "Load Stripe sample", "Load PayPal sample", "Load Shopify sample", "Load mismatch sample", "Import payout CSV", "Export bookkeeping CSV"; the heading "Net deposit"; "No payout loaded".
- `?sample=` deep links, drag-and-drop, reconciliation logic.

## Acceptance
vitest + Playwright green, axe 0 at 1280×800 and 390×844 (result and empty states), no horizontal overflow at 390, Lighthouse run recorded, before/after screenshots reviewed.
