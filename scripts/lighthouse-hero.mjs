#!/usr/bin/env node
// Score the built hero. Writes a small summary from the Lighthouse result.
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { chromium } from "playwright";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const url = "http://127.0.0.1:4173/?sample=stripe-balanced";
const summaryPath = "gate/evidence/lighthouse-hero.json";

if (!existsSync("dist/index.html")) {
  console.error("dist/index.html is missing. Run npm run build first.");
  process.exit(1);
}

const preview = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", "4173", "--strictPort"],
  { stdio: "inherit", detached: true },
);
let previewExit = null;
preview.on("exit", (code) => {
  previewExit = code ?? 0;
});

function stopPreview() {
  if (!preview.pid) return;
  try {
    process.kill(-preview.pid, "SIGTERM");
  } catch {
    preview.kill("SIGTERM");
  }
}

async function waitFor(target) {
  const deadline = Date.now() + 20000;
  let lastError = "no response";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(target);
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`hero did not answer at ${target}: ${lastError}`);
}

try {
  await waitFor(url);
  if (previewExit !== null) {
    throw new Error(`preview exited ${previewExit} before Lighthouse started`);
  }
  const chrome = await chromeLauncher.launch({
    chromePath: process.env.CHROME_PATH || chromium.executablePath(),
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
  });
  try {
    const runner = await lighthouse(url, {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    });
    const lhr = runner?.lhr;
    if (!lhr) throw new Error("Lighthouse returned no result.");
    const categories = {};
    for (const [name, category] of Object.entries(lhr.categories)) {
      categories[name] = Math.round((category.score ?? 0) * 100);
    }
    const belowPerfect = [];
    for (const audit of Object.values(lhr.audits)) {
      if (audit.score === null || audit.score === 1 || audit.scoreDisplayMode === "informative" || audit.scoreDisplayMode === "manual" || audit.scoreDisplayMode === "notApplicable") {
        continue;
      }
      belowPerfect.push({ id: audit.id, title: audit.title, score: audit.score });
    }
    const summary = {
      url,
      fetchedAt: lhr.fetchTime,
      lighthouseVersion: lhr.lighthouseVersion,
      formFactor: lhr.configSettings?.formFactor ?? null,
      categories,
      requestedUrl: lhr.requestedUrl,
      finalUrl: lhr.finalDisplayedUrl,
      belowPerfect,
    };
    await mkdir("gate/evidence", { recursive: true });
    await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
    console.log(JSON.stringify(summary));
  } finally {
    await chrome.kill();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  stopPreview();
}
