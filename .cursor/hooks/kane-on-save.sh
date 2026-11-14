#!/usr/bin/env bash
# Cursor afterFileEdit hook. Runs the PayoutFit Kane flow when source, fixtures, or flows change,
# then scripts/kane-loop.mjs reads the NDJSON and writes kane/last-failure.md for the agent.
# Exits 0 when there is nothing to do, or when Kane cannot run (see kane/runs/last-status.txt).
# A real Kane failure is parsed and the parser's non-zero exit is kept.
# hooks.json leaves failClosed off, so the edit is not blocked.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
payload=""
if [ ! -t 0 ]; then
  payload="$(cat || true)"
fi

if [ -n "$payload" ]; then
  interesting="$(
    printf '%s' "$payload" | node -e '
      let raw = "";
      process.stdin.on("data", (chunk) => {
        raw += chunk;
      });
      process.stdin.on("end", () => {
        try {
          const body = JSON.parse(raw);
          const path = String(body.file_path || "");
          const yes = /(^|\/)(src\/|fixtures\/|kane\/flows\/|index\.html)/.test(path);
          process.stdout.write(yes ? "yes" : "no");
        } catch {
          process.stdout.write("yes");
        }
      });
    '
  )"
  if [ "$interesting" = "no" ]; then
    exit 0
  fi
fi

mkdir -p "$ROOT/kane/runs"
lock="$ROOT/kane/runs/.lock"
if [ -f "$lock" ]; then
  now="$(date +%s)"
  then="$(stat -c %Y "$lock" 2>/dev/null || stat -f %m "$lock")"
  if [ $((now - then)) -lt 20 ]; then
    exit 0
  fi
fi
touch "$lock"

exec bash "$ROOT/scripts/kane-run.sh" kane/flows/payout-reconcile_test.md
