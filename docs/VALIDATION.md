# Validation run, 18 November 2026

Machine-readable copy: `evidence/validation.yaml`. The submit gate reads the same fields from `gate/evidence/validation.yaml`.

Holdout files were not edited. `git hash-object` of `fixtures/holdout/*` was identical before `npm test` and after pytest. The bundle hash is `eeaa04628302fe4e6a1a14d9bed611771b7659df7c431e24d11d5b79618f9aa7`.

## Commands

| When (UTC) | Command | Exit | Result |
| --- | --- | --- | --- |
| 2026-11-18T15:07:58Z | `npm test` | 0 | Vitest 3.2.7, 30 passed, 6 files, 657ms |
| 2026-11-18T15:07:59Z | `python3 -m pytest tests/py -vv` | 1 | `No module named pytest` |
| 2026-11-18T15:08:43Z | `python3 -m pip install 'pytest>=8'` | 0 | pytest 9.2.0 |
| 2026-11-18T15:08:43Z | `python3 -m pytest tests/py -vv` | 0 | 4 passed in 0.77s |
| 2026-11-18T15:08:05Z | `npm run test:e2e` | 1 | 10 passed, 1 failed |
| 2026-11-18T15:08:44Z | `npm run test:e2e` | 0 | 11 passed in 4.8s |
| 2026-11-18T15:08:08.495Z | `npm run lighthouse` | 0 | performance 100 |

`pytest: pass` in the evidence file is the second pytest command. The first one did not pass.

## Vitest

```
Test Files  6 passed (6)
     Tests  30 passed (30)
  Duration  657ms
```

Files: `holdout.report.test.ts` 2, `dev-fixtures.test.ts` 8, `reconcile.test.ts` 12, `fixture-inventory.test.ts` 1, `kane-loop.test.ts` 5, `render.test.ts` 2.

## pytest

Python 3.12.3, pytest 9.2.0. Four tests in `tests/py/test_holdout_gold.py`:

- `SHA256SUMS` matches a fresh hash of the holdout CSVs and `expected.json`.
- That listing's sha256 matches `BUNDLE_SHA256.txt`.
- `expected.json` names the same eight CSV files, and each file contains `Synthetic`.
- `npx vitest run tests/holdout.report.test.ts --reporter=verbose` exits 0. On the `-s` rerun at 15:09:36Z that nested run passed 2 tests in 222ms.

The tests open the holdout for reading. They do not write it.

## Playwright, axe, screenshots

Playwright 1.65.1. `playwright.config.ts` starts `npm start`, which builds and serves http://127.0.0.1:4173.

The first `npm run test:e2e` failed in `tests/e2e/gallery.spec.ts` because the journal-preview locator matched two `<section>` elements. The Stripe hero, the mismatch sample, and the axe scan had already passed in that run. The locator was narrowed to `section.panel`. The app's hero text was not edited.

The rerun passed 11 tests in 4.8s:

- 2 hero tests: Stripe $320.19, Reconciled, Chargebacks $89.50; mismatch $335.19, Needs review, $15.00 flag.
- 1 axe-core 4.14.0 test. It expects the violations array to be empty. The test passed, so `axe_violations` is 0.
- 8 gallery screenshots. Captions are in `gallery/CAPTIONS.md`.

## Lighthouse

Lighthouse 12.8.2, mobile, fetched at 2026-11-18T15:08:08.495Z, URL `http://127.0.0.1:4173/?sample=stripe-balanced`.

| Category | Score |
| --- | --- |
| performance | 100 |
| accessibility | 100 |
| best-practices | 100 |
| seo | 100 |

`lighthouse_hero` is the performance score, 100. The summary is `gate/evidence/lighthouse-hero.json`.

An unauthenticated GET of https://payoutfit.vercel.app/health at 2026-11-18T15:12:03Z returned HTTP 200. The body was `{"status":"ok","service":"payoutfit"}`. The response header `server` was `Vercel`. Nothing was deployed from this run.

These diagnostic audits scored 0 and did not change the category scores: `render-blocking-resources`, `network-dependency-tree-insight`, `render-blocking-insight`.
