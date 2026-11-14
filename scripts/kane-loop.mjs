#!/usr/bin/env node
// Read Kane CLI --agent NDJSON, write a fix brief, and exit non-zero when a step failed.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

function emptyReport(source) {
  return {
    ok: false,
    source,
    overallStatus: "unknown",
    bugTitle: null,
    bugOneLiner: null,
    failures: [],
  };
}

function observedValues(event) {
  const bag = event.variables_out || event.context?.variables || {};
  const observed = {};
  for (const [key, value] of Object.entries(bag)) {
    if (value && typeof value === "object" && "value" in value) {
      observed[key] = value.value;
    }
  }
  return observed;
}

export function parseKaneNdjson(text, source = "") {
  const report = emptyReport(source);
  let heading = "";
  let stepIndex = null;
  let pending = [];
  let sawDone = false;

  for (const line of String(text).split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let event;
    try {
      event = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (!event || typeof event !== "object") continue;

    if (event.type === "test_md_step_start") {
      heading = typeof event.heading === "string" ? event.heading : "";
      stepIndex = Number.isInteger(event.step_index) ? event.step_index : null;
      pending = [];
      continue;
    }

    if (event.type === "step_event" && event.event === "assertion" && event.passed === false) {
      pending.push({
        assertion: typeof event.detail === "string" ? event.detail : "",
        reason: "",
        observed: {},
      });
      continue;
    }

    if (event.type === "run_end" && event.status === "failed" && pending.length > 0) {
      const reason = typeof event.reason === "string" ? event.reason : "";
      const observed = observedValues(event);
      for (const item of pending) {
        if (!item.reason) item.reason = reason;
        if (Object.keys(observed).length > 0) item.observed = observed;
      }
      continue;
    }

    if (event.type === "test_md_step_end") {
      if (event.status === "failed") {
        const index = Number.isInteger(event.step_index) ? event.step_index : stepIndex;
        const rows = pending.length > 0 ? pending : [{ assertion: "", reason: "", observed: {} }];
        for (const item of rows) {
          report.failures.push({
            stepIndex: index,
            heading,
            assertion: item.assertion,
            passed: false,
            reason: item.reason,
            observed: item.observed,
          });
        }
      }
      pending = [];
      continue;
    }

    if (event.type === "test_md_bug_verdict") {
      const title = typeof event.bug_title === "string" ? event.bug_title : "";
      const oneLiner = typeof event.one_liner === "string" ? event.one_liner : "";
      if (event.confirmed === true || !report.bugTitle) {
        report.bugTitle = title || report.bugTitle;
        report.bugOneLiner = oneLiner || report.bugOneLiner;
      }
      continue;
    }

    if (event.type === "test_md_done" || (event.type === "test_md_summary" && !sawDone)) {
      if (typeof event.overall_status === "string") {
        report.overallStatus = event.overall_status;
      }
      if (event.type === "test_md_done") sawDone = true;
    }
  }

  report.ok = report.overallStatus === "passed" && report.failures.length === 0;
  return report;
}

export function renderFixBrief(report) {
  const lines = [
    "# Kane fix brief",
    "",
    `Source: ${report.source || "(stdin)"}`,
    `Overall: ${report.overallStatus}`,
    "",
  ];
  if (report.ok) {
    lines.push("No failing step. Nothing to fix.");
    lines.push("");
    return lines.join("\n");
  }
  if (report.bugTitle) {
    lines.push(`Bug: ${report.bugTitle}`);
    if (report.bugOneLiner) lines.push(`Kane: ${report.bugOneLiner}`);
    lines.push("");
  }
  report.failures.forEach((failure, index) => {
    lines.push(`## Failing step ${index + 1}`);
    lines.push("");
    lines.push(`Heading: ${failure.heading || "(no heading)"}`);
    lines.push(`Step index: ${failure.stepIndex ?? "(unknown)"}`);
    lines.push(`Assertion: ${failure.assertion || "(no assertion text)"}`);
    if (failure.reason) lines.push(`Reason: ${failure.reason}`);
    const observed = failure.observed || {};
    const keys = Object.keys(observed);
    if (keys.length > 0) {
      lines.push("Observed:");
      for (const key of keys) lines.push(`- ${key}: ${observed[key]}`);
    }
    lines.push("");
  });
  lines.push("Fix the failing assertion, then run the flow again.");
  lines.push("");
  return lines.join("\n");
}

function parseArgs(argv) {
  const args = { file: "", outDir: "kane" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--out-dir") {
      args.outDir = argv[i + 1] || "kane";
      i += 1;
    } else if (!arg.startsWith("-") && !args.file) {
      args.file = arg;
    }
  }
  return args;
}

export function writeFixBrief(report, outDir) {
  mkdirSync(outDir, { recursive: true });
  const markdownPath = join(outDir, "last-failure.md");
  const jsonPath = join(outDir, "last-failure.json");
  writeFileSync(markdownPath, renderFixBrief(report));
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  return { markdownPath, jsonPath };
}

function main(argv) {
  const args = parseArgs(argv);
  if (!args.file) {
    console.error("usage: node scripts/kane-loop.mjs <kane.ndjson> [--out-dir kane]");
    return 2;
  }
  let text;
  try {
    text = readFileSync(args.file, "utf8");
  } catch (error) {
    console.error(`kane-loop: cannot read ${args.file}: ${error.message}`);
    return 2;
  }
  const report = parseKaneNdjson(text, args.file);
  const written = writeFixBrief(report, resolve(args.outDir));
  if (report.ok) {
    console.log(`Kane loop: passed. Brief: ${written.markdownPath}`);
    return 0;
  }
  const first = report.failures[0];
  console.log(`Kane loop: ${report.overallStatus}`);
  if (first) {
    console.log(`Step: ${first.heading || "(no heading)"}`);
    console.log(`Assertion: ${first.assertion || "(no assertion text)"}`);
  }
  if (report.bugTitle) console.log(`Bug: ${report.bugTitle}`);
  console.log(`Brief: ${written.markdownPath}`);
  return 1;
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  process.exit(main(process.argv.slice(2)));
}
