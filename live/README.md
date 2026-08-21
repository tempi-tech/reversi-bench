# Live streaming

Optional tooling that streams a running match to a Discord forum as one board screenshot per move. The referee CLI does not depend on any of it — this folder talks to the referee only through `reversi.mjs state --json`.

Requires [AGI Wings](https://agi-labo.com) for the credential-free Discord call; the Discord bot token lives in a Wings connection, so no credential ever reaches this code. Board images are drawn locally with [Pillow](https://python-pillow.org).

## Setup

Deploy the handler once, bound to a Discord connection:

```bash
wings handler deploy --name reversi-live-discord --file live/discord-handler.js \
  --connection discord=<your-discord-connection>
```

## Run

Serve the match, open the spectator page in a Cockpit browser tab, then start the stream:

```bash
python3 live/discord-stream.py \
  --arena ~/.agi-tools/reversi-arena/g006 \
  --handler <wings-handler-id> \
  --channel <discord-forum-channel-id> \
  --black "model · effort" --white "model · effort" \
  --title "Reversi — A vs B" \
  --marks /tmp/g006-live.json
```

The stream opens one forum post and writes every move into it, each with a 480px board image (~18KB).

`--render screenshot --tab <cockpit-browser-tab-id>` captures the spectator page through AGI Cockpit instead of drawing the board. It reproduces the spectator design exactly, but the capture pipeline contends with agent runtimes that share the same embedded browser, so local drawing is the default.

## Behaviour

- `--marks` holds the thread id and the last posted move, so a restarted stream resumes without gaps or duplicates
- Moves made while the stream was down are posted together on the next update
- Failed posts back off (20/40/60/80s), which keeps the stream inside the Wings per-minute run limit
- A failed board image falls back to a text board, with the reason logged
