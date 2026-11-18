# Submit-gate runs, 18 November 2026

Command, from a read-only copy of `igoreduardoai/hackathon-lab` `main` at `dd6eb76a0eee10e705b0c5f79c0b53e1a707ff43`. That repo was not modified.

```bash
python3 -m judge_stack gate --stage submit --package gate
```

`judge_stack/gate.py` blob `7a32e028444e4a6613aa4a475832c603975670c6`. Spec `judge_stack/gates/winner_gap.yaml` blob `7129cfac22a1ebd4a2a9944266434082f1a33af7`, id `winner-gap-2026-11-09`.

| File | When (UTC) | Exit | Verdict |
| --- | --- | --- | --- |
| `before.txt` | 2026-11-18T15:07:33Z | 1 | FAIL. Blocking: B6-rules-submit. Advisory 1/8 (0.12). |
| `after.txt` | 2026-11-18T15:14:05Z | 0 | PASS_WITH_OVERRIDE. Blocking failed: none. Advisory 5/8 (0.62). |

The after file is the package in this branch, including the scorecard row for the live health GET. `--probe` was not passed. The gate still prints `HEALTH_UNPROBED`. A separate curl of https://payoutfit.vercel.app/health at 2026-11-18T15:12:03Z returned HTTP 200.

Owner overrides in `gate/OVERRIDE.yaml` were not edited. B1-five-second and B1-video-impact-20s stay overridden. B7-external-confirmation is ignored because that id is not in this spec.
