import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("axe-core scans the hero after the Stripe sample reconciles", async ({ page }) => {
  await page.goto("/?sample=stripe-balanced");
  await expect(page.getByTestId("net-deposit")).toHaveText("$320.19");
  const results = await new AxeBuilder({ page }).analyze();
  const summary = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.length,
    help: violation.help,
  }));
  expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
});
