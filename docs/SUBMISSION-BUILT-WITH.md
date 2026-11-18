# Built With

These are the tags for submission. Each one is used by a file in this repo. The gate copy is `gate/evidence/built-with.yaml` (sponsor `Kane CLI`, flagship `Kane CLI test.md`).

| Tag | Where it is used |
| --- | --- |
| TypeScript | `package.json` devDependency `typescript`. Sources under `src/` and `tests/`. |
| Vite | `package.json` devDependency `vite`. `vite.config.ts`. `npm start` runs `vite build` and `vite preview`. |
| Vitest | `package.json` devDependency `vitest`. `npm test` is `vitest run`. `vite.config.ts` imports `vitest/config`. |
| Playwright | `package.json` devDependency `@playwright/test`. `playwright.config.ts`. `tests/e2e/`. `scripts/lighthouse-hero.mjs` imports `playwright`. |
| axe-core | `package.json` devDependency `@axe-core/playwright`. `tests/e2e/axe.spec.ts` imports `@axe-core/playwright`. |
| Lighthouse | `package.json` devDependency `lighthouse`. `scripts/lighthouse-hero.mjs` imports `lighthouse`. |
| happy-dom | `package.json` devDependency `happy-dom`. `tests/render.test.ts` sets `@vitest-environment happy-dom`. |
| Node.js | `package.json` `"type": "module"`. `scripts/judge-start.mjs`, `scripts/kane-loop.mjs`, and `scripts/lighthouse-hero.mjs` run on Node. |
| chrome-launcher | `scripts/lighthouse-hero.mjs` imports `chrome-launcher`. It is installed with Lighthouse, not listed as a direct dependency. |
| Kane CLI | `scripts/kane-run.sh` calls `kane-cli`. |
| Kane CLI test.md | `kane/flows/payout-reconcile_test.md` and `kane/flows/payout-mismatch_test.md`. `scripts/kane-run.sh` passes the flow to `kane-cli testmd run`. |
| Chromium | `playwright.config.ts` uses `devices["Desktop Chrome"]`. Lighthouse launches `chromium.executablePath()` from Playwright. |
| GitHub Actions | `.github/workflows/test.yml` and `.github/workflows/health.yml`. |

## Left off on purpose

- Vercel is the host in `gate/evidence/demo-health.yaml`. The application source does not import it.
- Stripe, PayPal, and Shopify are names of the synthetic CSV shapes. There is no processor SDK.
- pytest 9.2.0 runs `tests/py/`. It is the gold check from 18 November 2026, not a library the app imports.
- Cursor is the editor hook in `.cursor/hooks.json`. The app does not import it.
