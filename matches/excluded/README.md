# Excluded games

These archives preserve actual board outcomes and audit evidence for games excluded from the ranked benchmark. They are neither ranked games nor confidence experiments. Do not add them to `series/s1.json`; `summary.ranked: false` makes the standings generator reject accidental inclusion.

| Game | Black | White | Actual board result | Exclusion |
| --- | --- | --- | --- | --- |
| [g189](g189.json) | Claude Opus 5 medium | GPT-6 Astra medium | 32–32 draw | Black wrote and executed external move-evaluation scripts, violating the referee-only player rules. The user approved exclusion, not a ranked forfeit. |
| [g275](g275.json) | GPT-6 Astra medium | Gemini 4 Argon medium | Black 40–24 | User excluded after Astra account migration and continuation (ask_ef0253b00f8f). Argon runtime remained Argon medium in recorded start/end events. Never entered ranked standings. |
| [g239](g239.json) | Claude Opus 5 medium | Claude Opus 5.5 high | Black 54–10 | Black wrote and executed Python move-analysis and continuation-enumeration scripts. White also read its own background referee output once. User approved exclusion, not a ranked forfeit (`ask_bfb61dce9af1`). |
| [g288](g288.json) | Gemini 4 Argon medium | GPT-6 Astra max | Unfinished: Black 9–11, 16 played moves | Argon continuation timed out; user discarded and requested a fresh game (`ask_5735ca461b44`). Replaced by g294. |
| [g289](g289.json) | GPT-6 Astra max | Gemini 4 Argon medium | Unfinished: Black 10–9, 15 played moves | Argon continuation timed out; Astra also encountered credit exhaustion and Auto account migration. User discarded and requested a fresh game (`ask_5735ca461b44`). Replaced by g295. |

g288 and g289 are abandoned unfinished attempts, not wins, losses, draws or forfeits. Their partial boards and complete accepted histories independently replay correctly. Archives preserve actual sessions, native usage, provider errors, account history and player tool I/O without asserting full protocol compliance. Both old completion supervisors were stopped and the remaining running player was cancelled. Neither game enters official standings or timing statistics; the six-game Argon medium queue continues with fresh sessions as g294, g295, g290, g291, g292 and g293.

g239's independent replay matches the actual board result and complete history. Its archive preserves native usage, actual session identifiers, tool I/O, and the four Python helper files. It does not change official standings. The separately approved reverse-color game g238 is not interrupted or disposed of by this exclusion; no replacement game is authorized.

g189 independently replays correctly (60 played moves and 3 passes), but legal moves do not establish compliance with the player protocol. The archive retains accepted moves, both actual sessions, deduplicated native usage and Black's non-referee command evidence. It has no effect on official ratings, win/loss/draw totals or timing statistics.

The two-game confirmation queue is complete: g188 is a valid Opus win (White 47–17), while g189 is excluded. Across the three valid direct games g136, g157 and g188, Opus leads Astra 2–1, with aggregate stones 119–73. This small sample does not establish a definitive strength ordering. No replacement game was authorized.
