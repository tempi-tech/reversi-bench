# Outcome-confidence pilot

Protocol: `win-confidence-v1`. All matches using this protocol are **unranked**. This is a measurement pilot, not a change to the historical head-to-head benchmark.

## Separation and provenance

- Register games in `experiments/win-confidence-v1.json`, never `series/s1.json`.
- Finished match records belong in `matches/experiments/win-confidence-v1/<id>.json`.
- Every match stores `protocol.id`, `protocol.ranked: false`, its measurement threshold, probability units, perspective and prediction target.
- Completion summaries must also set `ranked: false` and reference the referee commit, player prompt, native model/effort and actual sessions collected from the arena's `run-metadata.json`.
- `standings.mjs` rejects an experimental match if it is accidentally inserted into the ranked series. Do not rename or relabel old games, and do not backfill invented forecasts.
- c001 is one approved game: Black Fable 5.1 xhigh (rank 10) versus White Sol high (rank 11), selected from standings at `2c1310c`. Previous ordinary encounters g164/g177 are context, not matched causal controls for the added measurement task.
- The separately approved follow-up is c002–c007: a reverse-color round robin among Opus 5 high, Astra high and Sol high. Fable is excluded from this batch because its quota is exhausted; c001 and all its accepted forecasts remain unchanged. Ordinary games, including g074, are context rather than matched causal controls.

## Approved follow-up queue

Run strictly sequentially with Auto accounts and the same player prompt, referee rules and measurement threshold as c001. The local operational queue is `/Users/yoishika/.agi-tools/reversi-arena/confidence-six-queue.json`; the public game registry remains `experiments/win-confidence-v1.json`.

| Game | Black | White |
| --- | --- | --- |
| c002 | GPT-5.6 Sol high | Claude Opus 5 high |
| c003 | Claude Opus 5 high | GPT-5.6 Sol high |
| c004 | GPT-6 Astra high | GPT-5.6 Sol high |
| c005 | GPT-5.6 Sol high | GPT-6 Astra high |
| c006 | GPT-6 Astra high | Claude Opus 5 high |
| c007 | Claude Opus 5 high | GPT-6 Astra high |

Finish recording, independent replay, forecast validation, commit and push for each game before starting only its listed successor. Stop after c007 and summarize the six-game batch separately from c001. Six games still do not establish calibrated probabilities or a definitive metacognition ranking. Ultra remains prohibited and discarded g142 remains excluded.

Discord streaming was paused by the user during c003 on 2026-09-08. Keep it disabled for subsequent games until explicitly resumed. Continue a parent-shell completion-only supervisor and the sequential recording workflow; do not require or claim a final Discord delivery while streaming is paused.

## Protocol

The referee is initialized with `--confidence-after 10`. Count both players' played moves together, excluding automatic passes. The first ten played moves accept no forecast; from played move 11 onward, each legal move requires `--win P --draw P --loss P`, in percentages from 0 to 100 summing to 100. Players estimate their own eventual outcome against the current unknown opponent after choosing the submitted move, with both players continuing normally.

The referee saves a measured history entry with the normal side, coordinate, flips and timestamp plus `ply` and `confidence: {win, draw, loss}`. The board and forecast are persisted together. Invalid forecasts, illegal moves and wrong-side requests do not change the file. An accepted forecast has no revision command. Passes carry no forecasts. The automatic final passes are also unmeasured.

Default CLI state, wait and play responses never return forecast values. `measurement.nextPly` and `measurement.required` tell the player when to submit them. `state --spectator --json`, the spectator server and the Discord relay can see the recorded values. These are observer paths, not player commands. Side-bound wrappers expose only wait and play, validate their argument shapes and prevent forwarding arbitrary flags such as `--as` or `--spectator`. This follows the existing rule-based blind protocol; it is not an OS sandbox against a player deliberately reading files or using unauthorized commands.

Players use `prompts/player-confidence.md`, with no extra custom system prompt. An additional forecasting task can affect move choice and thinking time, so its results and latency must not be silently pooled with the historical protocol.

## Replay and completion

1. Independently replay the played coordinates in a fresh **ordinary** referee match, letting the engine reproduce passes. Compare side, move, flips, final board and winner. This verifies the game without relying on the submitted forecasts.
2. Separately validate the forecast coverage: none on the first ten played moves or passes; exactly one on every later played move; correct `ply`; finite percentages in range summing to 100.
3. Preserve every accepted forecast and timestamp, including confident mistakes. Check that player I/O did not expose opponent forecasts.
4. Collect the actual sessions and usage from `run-metadata.json`. Missing usage stays null, not zero or an estimate.
5. Save the finished experimental match and update the experimental manifest. Do not append to the ranked series or change standings. Verify the experimental marker before committing the result.
6. When streaming is enabled, verify Discord final delivery and let the parent-shell relay supervisor exit. While streaming is paused by the user, record that state instead and verify completion-only supervisor exit; do not restart streaming. Never create a Cockpit terminal relay task. The original c001-only approval is complete; further launches require the separately approved queue above. Stop after c007, and never duplicate an existing game or player task.

Report the result, forecast coverage and each side's trajectory. Optional descriptive scoring uses the multiclass Brier loss `((p_win-y_win)^2 + (p_draw-y_draw)^2 + (p_loss-y_loss)^2) / 2`, with probabilities divided by 100 and the actual side-relative result as a one-hot target. This convention ranges from 0 to 1. Break down played moves 11–20, 21–40 and 41 onward instead of only pooling easy terminal forecasts. A single game's repeated forecasts share one final outcome: do not claim calibrated probabilities, statistical superiority or independent samples from those turns. No automated ranking of calibration is produced by this pilot.
