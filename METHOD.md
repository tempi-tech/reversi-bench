# Methodology

How match series measure the playing strength and reliability of model × effort seats.

## Terms

| Term | Meaning |
|---|---|
| Seat | A `model · effort` pair named by the concrete model id, e.g. `claude-opus-5 · high` — never by vendor or agent family alone. Effort is never fixed across models — each model has its own best tier |
| Game | One game. Measurement uses 8×8 only (4×4 is a known second-player win, and 6×6 also favors the second player) |
| Card | Four games of the same pairing, two with each color. The smallest unit of a series |
| Ladder | Adjacent-effort matches within one model. Phase A |
| Finals | Round-robin between each model's representative seat. Phase B |

## Metrics

- Primary: game wins within a card
- Secondary: total stone margin
- Standings rating: a regularized Bradley-Terry fit over every recorded game
- Incident rate, recorded per game and per side:
  - Illegal-move attempts: `play` calls rejected as `illegal move` (`not your turn` is a race against `wait`, not counted)
  - Forfeit: a side that stalls on its own turn for 15 minutes loses the game
  - Task death: abnormal termination of a player process; the game closes as a forfeit

The incident rate measures reliability — whether an agent runs the referee protocol without breaking — not playing strength. Read it independently.

## Standings rating

Seats play unequal numbers of games against opponents of unequal strength, so ranking by raw win count is misleading: a seat that beat one weak opponent would outrank a seat that beat the field. Standings are therefore ordered by a Bradley-Terry rating fitted over every recorded game, where beating a strong opponent moves a seat further than beating a weak one.

The fit is regularized with one pseudo-win and one pseudo-loss against a fictitious average opponent, which keeps an undefeated seat from diverging to infinity and pulls thin records toward the middle. Ratings are reported on the familiar 1500-centred, 400-per-decade scale, and ties break on stone margin. Wins, losses, games, and stone margin stay in the table as raw evidence.

Ratings move sharply while the sample is small — a seat with one game is a hypothesis, not a measurement.

## Card rules

1. More game wins takes the card
2. At 2–2, total stone margin decides
3. Still tied:
   - Phase A (ladder): the lower effort wins the card (when tiers are even, the cheaper one is canonical)
   - Phase B (finals): the card is a draw

## Phase A — effort ladder

There is no full round-robin across every (model × effort): the combinations are too many and effort tier names are not aligned across vendors. Instead, each model settles its representative tier internally.

1. Fix the model's accepted effort tiers in ascending order
2. Open with the central adjacent pair (e.g. medium vs high)
3. The card winner then plays its untested neighbor
4. The tier that beats both neighbors (or its only neighbor, at the ends) becomes the model's representative

This converges in 2–3 cards per model.

## Phase B — finals

Round-robin between representatives, one card per pairing. Points: win 2 / draw 1 / loss 0. Ties break by head-to-head result, then total stone margin.

## Blinding

Players are fully blind: a player never learns which model or effort it is, nor who the opponent is.

- A player's instruction carries only its color and an opaque game id. Game ids and filenames never encode models, efforts, or pairings
- While a game is running, `wait` / `play` responses and the spectator state show both sides as plain Black / White
- Players run in isolated temporary working directories, never inside the records checkout. The referee and the live match file live in a separate arena directory; finished records are copied into the archive afterwards
- The runner holds the seat assignment outside anything players can reach, and writes `seats` and display names into the record only after the game ends
- The live spectator board may still show seats through a keyed overlay: `serve --seats <file> --key <token>` merges the assignment only into responses carrying that unguessable key. Keyless requests — the only ones a player could make — stay neutral
- Records that predate this rule carry `blind: false` and are read with that caveat

## Record format

```
matches/<seriesId>/g<nnn>.json
```

Game ids are opaque (e.g. `s1/g002`); the card ↔ game mapping lives in the series index (`series/<seriesId>.json`). Beyond the current fields (`history` / `players` / `winner`, …), series play extends records with (written after the game ends):

- `summary` (first key): `{ game, card, winner, score, seats, moves, blind, tokens }` — the record is readable at a glance before the bulky board and history fields
- `seats.B` / `seats.W`: `{ agentType, model, effort }`
- `tokens.B` / `tokens.W`: per-seat session usage `{ input, cacheRead, cacheCreation, output, apiCalls }` — auxiliary cost data, not a ranking metric
- `incidents`: `[{ side, kind: "illegal" | "forfeit" | "task-death", at, detail }]`
- `blind`: whether the blinding protocol above was in force

The full move sequence stays in `history`, so anyone can replay a record and verify its legality.

## Season 1 (planned)

- One model per agent family (Claude / Codex / Grok) is laddered. The concrete model id is fixed when the family's first card is created and recorded in `seats` — a family name is never a seat
- Scale: 6–8 ladder cards + 3 finals cards
- The existing exhibition (8×8, Grok 4.6 vs 4.5) is a cross-model game and stays outside season standings
