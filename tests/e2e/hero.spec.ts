import { expect, test } from "@playwright/test";

test("loads the built hero and shows the Stripe reconciliation", async ({ page }) => {
  await page.goto("/?sample=stripe-balanced");
  await expect(page.getByTestId("net-deposit")).toHaveText("$320.19");
  await expect(page.getByTestId("status")).toHaveText("Reconciled");
  await expect(page.getByTestId("chargebacks")).toHaveText("$89.50");
});

test("runs the mismatch sample and shows the review result", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("No payout loaded")).toBeVisible();
  await page.getByRole("button", { name: "Load mismatch sample" }).click();
  await expect(page.getByTestId("net-deposit")).toHaveText("$335.19");
  await expect(page.getByTestId("status")).toHaveText("Needs review");
  await expect(page.getByTestId("flags")).toContainText("$15.00");
});
