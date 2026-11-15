import { defineConfig, devices } from "@playwright/test";

const env = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://127.0.0.1:4173",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:4173/?sample=stripe-balanced",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { ...env, PAYOUTFIT_NO_OPEN: "1" },
  },
});
