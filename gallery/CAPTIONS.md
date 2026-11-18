# Gallery captions

Playwright 1.65.1 took these on 18 November 2026 from `npm start` at http://127.0.0.1:4173. Viewport 1280×800. The passing run is `npm run test:e2e` at 2026-11-18T15:08:44Z, 11 passed. The same bytes are in `gate/evidence/screenshots/`.

1. `01-hero.png` — Stripe sample hero, `/?sample=stripe-balanced`. Net deposit $320.19. Status Reconciled. Chargebacks on that page are $89.50.
2. `02-failure-case.png` — Mismatch sample. Net deposit $335.19. Status Needs review. Stated payout is $15.00 above the computed net.
3. `03-fix-brief.png` — The text of `kane/last-failure.md` opened in the Playwright browser. The image says it is not a PayoutFit route. The brief is the 13 November red run: Chargebacks folded into fees, observed Chargebacks $0.00 and Fees $119.31.
4. `04-green-run.png` — The same Stripe sample on the running app after that fix. Fees $29.81, Chargebacks $89.50, difference $0.00, debits equal credits $479.50.
5. `05-judge-preview.png` — The Journal preview section on the Stripe sample, with Export bookkeeping CSV.
6. `06-health.png` — `GET /health` on that preview. The body is `{"status":"ok","service":"payoutfit"}`.
7. `07-empty.png` — `/` before a sample is loaded. The page says No payout loaded.
8. `08-paypal.png` — PayPal sample. Net deposit $151.86. Status Reconciled.
