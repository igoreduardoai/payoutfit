"""Read-only checks for the synthetic gold file and holdout bundle.

These tests do not write under fixtures/holdout. The hash must match the
bundle recorded before the app reconciled those files.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HOLDOUT = ROOT / "fixtures" / "holdout"


def bundle_listing() -> str:
    names = sorted(
        path.name
        for path in HOLDOUT.iterdir()
        if path.name.endswith(".csv") or path.name == "expected.json"
    )
    lines = []
    for name in names:
        digest = hashlib.sha256((HOLDOUT / name).read_bytes()).hexdigest()
        lines.append(f"{digest}  ./{name}")
    return "\n".join(lines) + "\n"


def test_holdout_sha256sums_match_the_files():
    listing = bundle_listing()
    assert (HOLDOUT / "SHA256SUMS").read_text(encoding="utf-8") == listing


def test_bundle_hash_matches_the_recorded_gold():
    listing = bundle_listing()
    bundle = hashlib.sha256(listing.encode("utf-8")).hexdigest()
    recorded = (HOLDOUT / "BUNDLE_SHA256.txt").read_text(encoding="utf-8").strip()
    assert bundle == recorded


def test_gold_lists_eight_synthetic_holdout_files():
    gold = json.loads((HOLDOUT / "expected.json").read_text(encoding="utf-8"))
    cases = gold["cases"]
    assert len(cases) == 8
    files = sorted(item["file"] for item in cases)
    csvs = sorted(path.name for path in HOLDOUT.glob("*.csv"))
    assert files == csvs
    for name in csvs:
        assert "Synthetic" in (HOLDOUT / name).read_text(encoding="utf-8")


def test_vitest_holdout_agrees_with_the_hand_totals():
    proc = subprocess.run(
        ["npx", "vitest", "run", "tests/holdout.report.test.ts", "--reporter=verbose"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    output = proc.stdout + proc.stderr
    print(output)
    assert proc.returncode == 0, output
    assert "2 passed" in output
