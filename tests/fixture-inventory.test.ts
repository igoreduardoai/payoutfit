import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function csvs(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".csv"))
    .sort();
}

describe("synthetic fixture inventory", () => {
  it("has 20 labeled payout files, split into a dev set and a holdout", () => {
    const original = csvs("fixtures");
    const dev = csvs("fixtures/dev");
    const holdout = csvs("fixtures/holdout");
    expect(original).toHaveLength(4);
    expect(dev).toHaveLength(8);
    expect(holdout).toHaveLength(8);
    const all = [
      ...original.map((name) => `fixtures/${name}`),
      ...dev.map((name) => `fixtures/dev/${name}`),
      ...holdout.map((name) => `fixtures/holdout/${name}`),
    ];
    expect(all).toHaveLength(20);
    for (const path of all) {
      expect(readFileSync(path, "utf8"), path).toMatch(/Synthetic/);
    }
  });
});
