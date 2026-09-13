# Excluded games

These archives preserve actual board outcomes and audit evidence for games excluded from the ranked benchmark. They are neither ranked games nor confidence experiments. Do not add them to `series/s1.json`; `summary.ranked: false` makes the standings generator reject accidental inclusion.

| Game | Black | White | Actual board result | Exclusion |
| --- | --- | --- | --- | --- |
| [g189](g189.json) | Claude Opus 5 medium | GPT-6 Astra medium | 32–32 draw | Black wrote and executed external move-evaluation scripts, violating the referee-only player rules. The user approved exclusion, not a ranked forfeit. |

g189 independently replays correctly (60 played moves and 3 passes), but legal moves do not establish compliance with the player protocol. The archive retains accepted moves, both actual sessions, deduplicated native usage and Black's non-referee command evidence. It has no effect on official ratings, win/loss/draw totals or timing statistics.

The two-game confirmation queue is complete: g188 is a valid Opus win (White 47–17), while g189 is excluded. Across the three valid direct games g136, g157 and g188, Opus leads Astra 2–1, with aggregate stones 119–73. This small sample does not establish a definitive strength ordering. No replacement game was authorized.
