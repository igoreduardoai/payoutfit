import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const viewports = [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
];
const states = [
  { name: "Stripe sample", path: "/?sample=stripe-balanced", ready: "$320.19" },
  { name: "mismatch sample", path: "/?sample=stripe-mismatch", ready: "$335.19" },
  { name: "empty state", path: "/", ready: null },
];

for (const viewport of viewports) {
  for (const state of states) {
    test(`axe-core: ${state.name} at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(state.path);
      if (state.ready) await expect(page.getByTestId("net-deposit")).toHaveText(state.ready);
      else await expect(page.getByText("No payout loaded")).toBeVisible();
      await page.waitForTimeout(400);
      const results = await new AxeBuilder({ page }).analyze();
      const summary = results.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.length,
        help: violation.help,
      }));
      expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
}
