import { expect, test } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";

mkdirSync("gallery", { recursive: true });

test.use({ viewport: { width: 1280, height: 800 } });

test("screenshots the Stripe hero", async ({ page }) => {
  await page.goto("/?sample=stripe-balanced");
  await expect(page.getByTestId("net-deposit")).toHaveText("$320.19");
  await expect(page.getByTestId("status")).toHaveText("Reconciled");
  await expect(page.getByTestId("chargebacks")).toHaveText("$89.50");
  await page.locator('section[aria-label="Net deposit"]').screenshot({ path: "gallery/01-hero.png" });
});

test("screenshots the mismatch failure case", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("No payout loaded")).toBeVisible();
  await page.getByRole("button", { name: "Load mismatch sample" }).click();
  await expect(page.getByTestId("net-deposit")).toHaveText("$335.19");
  await expect(page.getByTestId("status")).toHaveText("Needs review");
  await expect(page.getByTestId("flags")).toContainText("$15.00");
  await page.screenshot({ path: "gallery/02-failure-case.png", fullPage: true });
});

test("screenshots the committed Kane fix brief", async ({ page }) => {
  const text = readFileSync("kane/last-failure.md", "utf8");
  expect(text).toContain("Chargebacks folded into fees in payout breakdown");
  expect(text).toContain("Chargebacks $89.50");
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  await page.setContent(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Kane fix brief</title>
<style>body{margin:24px;font:16px/1.45 Georgia,serif;color:#1c2430;background:#fffdf8}pre{white-space:pre-wrap}</style></head>
<body><p>Source file: kane/last-failure.md. This page is the committed brief, not a PayoutFit route.</p><pre>${escaped}</pre></body></html>`,
    { waitUntil: "load" },
  );
  await page.screenshot({ path: "gallery/03-fix-brief.png", fullPage: true });
});

test("screenshots the green Stripe run", async ({ page }) => {
  await page.goto("/?sample=stripe-balanced");
  await expect(page.getByTestId("status")).toHaveText("Reconciled");
  await expect(page.getByTestId("fees")).toHaveText("$29.81");
  await expect(page.getByTestId("chargebacks")).toHaveText("$89.50");
  await expect(page.getByTestId("journal-balance")).toContainText("equal credits");
  await page.screenshot({ path: "gallery/04-green-run.png", fullPage: true });
});

test("screenshots the journal judge preview", async ({ page }) => {
  await page.goto("/?sample=stripe-balanced");
  const preview = page.locator("section.panel").filter({
    has: page.getByRole("heading", { name: "Journal preview" }),
  });
  await expect(preview).toContainText("Bank deposit");
  await expect(preview).toContainText("Chargebacks");
  await expect(preview.getByRole("button", { name: "Export bookkeeping CSV" })).toBeVisible();
  await preview.screenshot({ path: "gallery/05-judge-preview.png" });
});

test("screenshots /health", async ({ page }) => {
  await page.goto("/health");
  await expect(page.locator("body")).toContainText('"status"');
  await expect(page.locator("body")).toContainText('"ok"');
  await expect(page.locator("body")).toContainText('"service"');
  await expect(page.locator("body")).toContainText('"payoutfit"');
  await page.screenshot({ path: "gallery/06-health.png", fullPage: true });
});

test("screenshots the empty state", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("No payout loaded")).toBeVisible();
  await page.screenshot({ path: "gallery/07-empty.png", fullPage: true });
});

test("screenshots the PayPal sample", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Load PayPal sample" }).click();
  await expect(page.getByTestId("net-deposit")).toHaveText("$151.86");
  await expect(page.getByTestId("status")).toHaveText("Reconciled");
  await page.screenshot({ path: "gallery/08-paypal.png", fullPage: true });
});
