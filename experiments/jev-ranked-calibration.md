# Ranked JEV calibration: j002–j012

Approved on 2026-09-21: eleven additional ranked games, strictly sequential. Together with the already ranked j001, each of six opposing seats plays JEV once with each color. This is a separate batch after the completed one-game pilot, not an extension of its original unranked authorization.

| Game | Black | White |
|---|---|---|
| j002 | GPT-5.6 Sol medium | JEV 1.13.0 direct-choice |
| j003 | JEV 1.13.0 direct-choice | Gemini 3.8 Flash high |
| j004 | Gemini 3.8 Flash high | JEV 1.13.0 direct-choice |
| j005 | JEV 1.13.0 direct-choice | Grok 4.6 xhigh |
| j006 | Grok 4.6 xhigh | JEV 1.13.0 direct-choice |
| j007 | JEV 1.13.0 direct-choice | GPT-6 Astra medium |
| j008 | GPT-6 Astra medium | JEV 1.13.0 direct-choice |
| j009 | JEV 1.13.0 direct-choice | Claude Opus 5 medium |
| j010 | Claude Opus 5 medium | JEV 1.13.0 direct-choice |
| j011 | JEV 1.13.0 direct-choice | GPT-6 Astra max |
| j012 | GPT-6 Astra max | JEV 1.13.0 direct-choice |

Use pinned `jev-1.13.0` and the same state-only Choice request as j001. Exactly one API call per played JEV move; no tactical adapter, filtering, search, retries, fallback, win-confidence interpretation or model substitution. Only the JEV side/directory changes for reversed colors. Preserve the pilot's immutable adapter snapshots and archives.

Opponents use unchanged `prompts/player.md`, normal Cockpit visual tasks, Auto accounts, and standard tier for Codex. Confirm native model and effort before each launch, particularly Antigravity `gemini-3.8-flash-high`. Do not add a custom system prompt. No Ultra, no terminal tasks. Discord remains disabled; only a completion supervisor runs from the parent shell.

Before each next game: independently replay the finished game, audit both players' full referee-only blind I/O and actual sessions, verify JEV request/response/run-ID correspondence, preserve raw usage and null missing fields, record once under `matches/s1/jNNN.json` and `series/s1.json`, regenerate standings, commit and push. Runtime failures or protocol violations stop the queue for review; do not silently retry, replace or rank them. Excluded g189 and discarded g142 remain excluded.

Stop after j012. Summarize each reverse-color pair and all twelve games including j001. Publish uncertainty: two games per opponent do not establish a definitive model ordering, and direct-choice and conversational-agent interfaces remain different.
