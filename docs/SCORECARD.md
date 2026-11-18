# Scorecard, 18 November 2026

Numbers below are from the commands in `docs/VALIDATION.md`. The gate copy is `gate/evidence/scorecard.yaml`.

## What was measured

| Check | Result |
| --- | --- |
| Vitest 3.2.7 | 30 passed, 6 files, exit 0, 2026-11-18T15:07:58Z |
| pytest 9.2.0 | 4 passed in 0.77s, exit 0, 2026-11-18T15:08:43Z |
| Playwright 1.65.1 | 11 passed in 4.8s, exit 0, 2026-11-18T15:08:44Z |
| axe-core 4.14.0 on the Stripe hero | 0 violations |
| Lighthouse 12.8.2 performance | 100 |
| Lighthouse accessibility, best-practices, seo | 100, 100, 100 |
| Holdout bundle | `eeaa04628302fe4e6a1a14d9bed611771b7659df7c431e24d11d5b79618f9aa7`, files unchanged |
| GitHub GET, no token | HTTP 200, `logged_in=no`, 2026-11-18T15:05:50Z |
| YouTube oEmbed for https://youtu.be/wJssr9YzPeo | HTTP 200, 2026-11-18T15:05:50Z |
| License API, no token | HTTP 200, SPDX `MIT` |
| GET https://payoutfit.vercel.app/health | HTTP 200, 2026-11-18T15:12:03Z, body `{"status":"ok","service":"payoutfit"}` |

The Stripe hero on that Playwright run was still net deposit $320.19, Reconciled, Chargebacks $89.50.

## What did not work / limits

- pytest was not installed at 15:07:59Z. `python3 -m pytest` exited 1 with `No module named pytest`. The pass is the run after `pip install`.
- The first `npm run test:e2e` exited 1. Ten tests passed. The new journal-preview locator matched two sections. The second run, after that locator was narrowed, passed 11. The hero was not changed to make the screenshot.
- Three Lighthouse diagnostic audits scored 0 (`render-blocking-resources`, `network-dependency-tree-insight`, `render-blocking-insight`). The four category scores stayed 100.
- `fixtures/dev/reversed-sign-charge.csv` still does not balance. The Vitest case expects debits 12.00, credits 36.00, and `journalBalances` false. That case passed in the 30-test run, so the limit is unchanged.
- `kane-cli` was not on PATH. This environment did not add a Kane trace. The 13 November traces remain the Kane record.
- No outside person did the five-second test. `gate/evidence/five-second.yaml` is unchanged. The 15 November owner override still covers it.
- `evidence/video.yaml` is still missing, so the first-20-seconds check is still open. The same override covers it. This run did not watch https://youtu.be/wJssr9YzPeo. The oEmbed check only shows that the URL returns a public video document.
- No person answered what the video does, for whom, and what stood out. R-video-viewer stays failed.
- No teammate search was recorded, and nothing was posted.
- The iteration log is still the Kane traces. The submit gate counts zero real-signal rounds.
- No third party confirmed the journal CSV. `OVERRIDE.yaml` still names B7. The spec used on 18 November has no B7 item, so that override line is unused.
- Samples are synthetic. There is no count of bookkeepers, merchants, or customers.
- Slash dates stay MM/DD/YYYY. A zero-decimal currency is still stored with two decimal places. Mixed currencies are flagged and not converted. The journal is one summary entry.
