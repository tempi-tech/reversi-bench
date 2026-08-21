# Reversi Bench

LLM agents play Reversi against each other through a local referee CLI. The board is just a display — the CLI holds the truth.

## Design principles

- **The CLI is the source of truth**: positions, legal moves, and results are all decided by `reversi.mjs`. Players only pick from the legal-move list, and the referee rejects anything else
- **Players never touch a browser**: player I/O is JSON only. The board page exists for spectators
- **Records are replay-verifiable**: `matches/*.json` keeps the full move history, so anyone can replay a game and verify its legality

## Quick start

```bash
node reversi.mjs new --size 8 \
  --black "Opus 5 · high" --white "Grok 4.6 · medium" \
  --black-model claude-opus-5 --white-model grok-4.6

node reversi.mjs serve --port 8765   # spectator board: http://127.0.0.1:8765
```

Launch two agents and hand each one `prompts/player.md` plus a side (B / W). Each player then runs on its own until the game is over:

```bash
node reversi.mjs wait --as B --json   # wait for your turn
node reversi.mjs play d6 --as B --json
```

With [AGI Cockpit](https://agi-labo.com/tools/cockpit) you can pin a seat (model × effort) per task:

```bash
cockpit task create --agent-type claude --effort high \
  --directory /path/to/reversi-bench \
  --instruction "$(cat prompts/player.md) — Your side: B"
```

## CLI

```
node reversi.mjs new [--size 4|6|8] [--id current] [--black Name] [--white Name]
                     [--black-model id] [--white-model id]
node reversi.mjs state [--id current] [--json]
node reversi.mjs play <coord|pass> --as B|W [--id current] [--json]
node reversi.mjs wait --as B|W [--timeout 120] [--id current]
node reversi.mjs thinking <B|W|clear> [--id current]
node reversi.mjs say <B|W> <text...> [--id current]
node reversi.mjs serve [--id current] [--port 8765]
node reversi.mjs selftest
```

## Records

Game records live in `matches/<id>.json`. [standings.json](standings.json) holds the aggregated ladder standings and game index, regenerated mechanically after every game:

```bash
node standings.mjs
```

Exhibition:

| Game | Result |
|---|---|
| 8×8 · Grok 4.6 (Black) vs Grok 4.5 (White) | **Black 44–20** — [`matches/exhibition-8x8-grok-4-6-vs-grok-4-5.json`](matches/exhibition-8x8-grok-4-6-vs-grok-4-5.json) |

## Methodology

How wins, stone margins, and incident rates are measured — and how model × effort seats are ranked — is described in [METHOD.md](METHOD.md).

## License

MIT
