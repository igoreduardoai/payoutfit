// Reads the committed Kane NDJSON in kane/traces/. These are the original runs, not copies.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseKaneNdjson } from "../scripts/kane-loop.mjs";

const RED = "kane/traces/2026-11-13T153241Z-payout-reconcile-red.ndjson";
const GREEN = "kane/traces/2026-11-13T153457Z-payout-reconcile-green-after-fix.ndjson";
const FIRST_GREEN = "kane/traces/2026-11-13T152752Z-payout-reconcile-green.ndjson";

const RED_ASSERTION =
  'the breakdown shows Gross sales $479.50, Fees $29.81, Refunds $40.00, and Chargebacks $89.50; Chargebacks does not show $0.00';

describe("parseKaneNdjson on committed traces", () => {
  it("extracts the failing breakdown step and assertion from the red trace", () => {
    const parsed = parseKaneNdjson(readFileSync(RED, "utf8"), RED);
    expect(parsed.ok).toBe(false);
    expect(parsed.overallStatus).toBe("failed");
    const breakdown = parsed.failures.filter((failure) => failure.heading === "Read the breakdown");
    expect(breakdown).toHaveLength(2);
    expect(breakdown[0]?.stepIndex).toBe(2);
    expect(breakdown[0]?.assertion).toBe(RED_ASSERTION);
    expect(breakdown[0]?.passed).toBe(false);
    expect(breakdown[1]?.assertion.startsWith(RED_ASSERTION)).toBe(true);
    expect(breakdown[1]?.passed).toBe(false);
    expect(parsed.bugTitle).toBe("Chargebacks folded into fees in payout breakdown");
    expect(parsed.failures.some((failure) => failure.heading === "Load the Stripe sample")).toBe(false);
  });

  it("reports no failing step for the green-after-fix trace", () => {
    const parsed = parseKaneNdjson(readFileSync(GREEN, "utf8"), GREEN);
    expect(parsed.ok).toBe(true);
    expect(parsed.overallStatus).toBe("passed");
    expect(parsed.failures).toEqual([]);
  });

  it("reports no failing step for the first green trace", () => {
    const parsed = parseKaneNdjson(readFileSync(FIRST_GREEN, "utf8"), FIRST_GREEN);
    expect(parsed.ok).toBe(true);
    expect(parsed.overallStatus).toBe("passed");
    expect(parsed.failures).toEqual([]);
  });
});

describe("kane-loop CLI", () => {
  it("writes the fix brief and exits non-zero for the red trace", () => {
    const dir = mkdtempSync(join(tmpdir(), "kane-loop-"));
    let code = 0;
    try {
      execFileSync(process.execPath, ["scripts/kane-loop.mjs", RED, "--out-dir", dir], { encoding: "utf8" });
    } catch (error) {
      code = (error as { status?: number }).status ?? 1;
    }
    expect(code).not.toBe(0);
    const markdown = readFileSync(join(dir, "last-failure.md"), "utf8");
    const body = JSON.parse(readFileSync(join(dir, "last-failure.json"), "utf8")) as {
      ok: boolean;
      source: string;
      failures: Array<{ heading: string; assertion: string }>;
    };
    expect(markdown).toContain("Read the breakdown");
    expect(markdown).toContain(RED_ASSERTION);
    expect(markdown).toContain("Chargebacks folded into fees in payout breakdown");
    expect(body.ok).toBe(false);
    expect(body.source).toBe(RED);
    expect(body.failures[0]?.heading).toBe("Read the breakdown");
    expect(body.failures[0]?.assertion).toBe(RED_ASSERTION);
  });

  it("exits zero and records no failure for the green-after-fix trace", () => {
    const dir = mkdtempSync(join(tmpdir(), "kane-loop-"));
    execFileSync(process.execPath, ["scripts/kane-loop.mjs", GREEN, "--out-dir", dir], { encoding: "utf8" });
    const body = JSON.parse(readFileSync(join(dir, "last-failure.json"), "utf8")) as {
      ok: boolean;
      failures: unknown[];
    };
    expect(body.ok).toBe(true);
    expect(body.failures).toEqual([]);
    expect(readFileSync(join(dir, "last-failure.md"), "utf8")).toContain("passed");
  });
});
