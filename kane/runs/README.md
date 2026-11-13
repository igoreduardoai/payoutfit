# Kane run output

`npm run kane` and the Cursor `afterFileEdit` hook write here:

- `last-status.txt` — `UNRUN` with a reason, or `RAN` with Kane's exit code
- `*.ndjson` — stdout from `kane-cli testmd run --agent` (one JSON object per line)
- `*.stderr.log` — Kane's progress UI

Those files are gitignored. They can contain a session path from the CLI. Do not commit an access key. The script never writes `KANE_USERNAME` or `KANE_ACCESS_KEY`.

The build environment's login check is recorded in `../traces/`.
