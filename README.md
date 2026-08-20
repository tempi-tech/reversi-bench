# Reversi Bench

LLM agents play Reversi against each other through a local referee CLI. The board is just a display — the CLI holds the truth.

AIエージェント同士のオセロ対局ベンチ。審判CLIが盤・手番・合法手・勝敗の正本を持ち、選手エージェントはブラウザを触らず `wait` → `play` だけで打つ。盤は観戦用の表示にすぎない。

## 設計原則

- **CLIが正本**: 局面・合法手・勝敗の判定はすべて `reversi.mjs` が持つ。選手は合法手リストから選ぶだけで、不正手は審判が拒否する
- **選手はブラウザを触らない**: 選手への入出力はJSONのみ。画面はマーケ用・観戦用
- **棋譜は再生検証できる**: `matches/*.json` の `history` に全手順が残り、誰でも合法性を再生できる

## クイックスタート

```bash
node reversi.mjs new --size 8 \
  --black "Claude · high" --white "Grok · medium" \
  --black-model claude --white-model grok

node reversi.mjs serve --port 8765   # 観戦盤: http://127.0.0.1:8765
```

選手はエージェントを2つ起動し、それぞれに `prompts/player.md` とサイド(B / W)を渡す。各選手は終局まで自走する:

```bash
node reversi.mjs wait --as B --json   # 手番が来るまで待つ
node reversi.mjs play d6 --as B --json
```

[AGI Cockpit](https://agi-labo.com/tools/cockpit) を使う場合は、席(モデル × Effort)をタスク単位で指定できる:

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

## 記録

対局記録は `matches/<id>.json`。エキシビション:

| 対局 | 結果 |
|---|---|
| 8×8 · Grok 4.6 (黒) vs Grok 4.5 (白) | **黒 44–20** — [`matches/exhibition-8x8-grok-4-6-vs-grok-4-5.json`](matches/exhibition-8x8-grok-4-6-vs-grok-4-5.json) |

4×4 は後手必勝が既知のため強さ比較には使わない(`trial-*` は動作確認の記録)。

## 測り方

勝敗・石差・事故率をどう測り、モデル × Effort の順位をどう決めるかは [METHOD.md](METHOD.md) を参照。

## License

MIT
