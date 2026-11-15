#!/usr/bin/env node
// One command for a judge: build PayoutFit and serve the hero screen.
import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";

const started = performance.now();
const url = "http://127.0.0.1:4173/?sample=stripe-balanced";

function elapsed() {
  return ((performance.now() - started) / 1000).toFixed(2);
}

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}`));
    });
  });
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
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  throw new Error(`hero screen did not answer at ${target}: ${lastError}`);
}

await run("npx", ["tsc", "--noEmit"]);
await run("npx", ["vite", "build"]);

const previewArgs = ["vite", "preview", "--host", "127.0.0.1", "--port", "4173", "--strictPort"];
if (!process.env.CI && !process.env.PAYOUTFIT_NO_OPEN) {
  previewArgs.push("--open", "/?sample=stripe-balanced");
}
const preview = spawn("npx", previewArgs, { stdio: "inherit" });

try {
  await waitFor(url);
} catch (error) {
  preview.kill("SIGTERM");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

console.log(`Hero screen: ${url}`);
console.log(`Ready in ${elapsed()}s (build + first HTTP 200).`);

preview.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => preview.kill(signal));
}
