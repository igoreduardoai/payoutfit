#!/usr/bin/env bash
# Run one PayoutFit Kane CLI flow and store its NDJSON.
# Missing CLI, Chrome, login, or dev server is UNRUN: the script says why and exits 0.
# A real Kane result keeps Kane's exit code (0 pass, 1 fail, 2 error, 3 timeout).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FLOW="${1:-kane/flows/payout-reconcile_test.md}"
RUN_DIR="$ROOT/kane/runs"
mkdir -p "$RUN_DIR"
STATUS="$RUN_DIR/last-status.txt"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BASE="$(basename "$FLOW" _test.md)"

export PATH="${HOME}/.local/bin:${PATH}"

write_status() {
  printf '%s\n' "$@" >"$STATUS"
}

if ! command -v kane-cli >/dev/null 2>&1; then
  write_status "UNRUN" "reason: kane-cli is not on PATH. Install with: npm install -g @testmuai/kane-cli" "flow: $FLOW" "at: $STAMP"
  echo "UNRUN: kane-cli is not on PATH"
  exit 0
fi

authed=0
if [ -n "${KANE_USERNAME:-}" ] && [ -n "${KANE_ACCESS_KEY:-}" ]; then
  authed=1
elif kane-cli whoami >/dev/null 2>&1; then
  authed=1
fi

if [ "$authed" -ne 1 ]; then
  write_status \
    "UNRUN" \
    "reason: kane-cli is not logged in. Run: kane-cli login" \
    "or set KANE_USERNAME and KANE_ACCESS_KEY in the environment. Do not put them in the repo." \
    "flow: $FLOW" \
    "at: $STAMP" \
    "checked: kane-cli whoami"
  echo "UNRUN: kane-cli is not logged in"
  exit 0
fi

if ! curl -fsS -o /dev/null --max-time 3 http://127.0.0.1:5173/; then
  write_status "UNRUN" "reason: PayoutFit is not answering at http://127.0.0.1:5173. Start it with npm run dev." "flow: $FLOW" "at: $STAMP"
  echo "UNRUN: app is not running at http://127.0.0.1:5173"
  exit 0
fi

ndjson="$RUN_DIR/${STAMP}-${BASE}.ndjson"
stderr_log="$RUN_DIR/${STAMP}-${BASE}.stderr.log"
args=(testmd run "$FLOW" --agent --headless --timeout 300)
if [ -n "${KANE_USERNAME:-}" ] && [ -n "${KANE_ACCESS_KEY:-}" ]; then
  args+=(--username "$KANE_USERNAME" --access-key "$KANE_ACCESS_KEY")
fi

set +e
kane-cli "${args[@]}" >"$ndjson" 2>"$stderr_log"
code=$?
set -e

last="no run_end line"
if [ -s "$ndjson" ]; then
  last="$(tail -n 1 "$ndjson")"
fi
write_status "RAN" "exit: $code" "flow: $FLOW" "ndjson: $ndjson" "stderr: $stderr_log" "at: $STAMP" "last: $last"
echo "Kane exit ${code}"
echo "NDJSON: ${ndjson}"

if [ -s "$ndjson" ]; then
  set +e
  node "$ROOT/scripts/kane-loop.mjs" "$ndjson" --out-dir "$ROOT/kane"
  parse_code=$?
  set -e
  if [ "$parse_code" -ne 0 ]; then
    exit "$parse_code"
  fi
fi
exit "$code"
