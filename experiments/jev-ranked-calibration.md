# Ranked JEV calibration: j002–j012

Approved on 2026-09-21: eleven additional ranked games, strictly sequential. Together with the already ranked j001, each of six opposing seats plays JEV once with each color. This is a separate batch after the completed one-game pilot, not an extension of its original unranked authorization.

Revised by explicit user approval (ask_5630c67419d8): finish the already running j006, then replace the six unstarted Astra/Opus games with Luna medium, Luna max and Terra low, once with each color. These are provisional lower-rated calibration seats, not established weaker models. The total remains eleven additional games; no parallel games or additional games are authorized.

| Game | Black | White |
|---|---|---|
| j002 | GPT-5.6 Sol medium | JEV 1.13.0 direct-choice |
| j003 | JEV 1.13.0 direct-choice | Gemini 3.8 Flash high |
| j004 | Gemini 3.8 Flash high | JEV 1.13.0 direct-choice |
| j005 | JEV 1.13.0 direct-choice | Grok 4.6 xhigh |
| j006 | Grok 4.6 xhigh | JEV 1.13.0 direct-choice |
| j007 | JEV 1.13.0 direct-choice | GPT-5.6 Luna medium |
| j008 | GPT-5.6 Luna medium | JEV 1.13.0 direct-choice |
| j009 | JEV 1.13.0 direct-choice | GPT-5.6 Luna max |
| j010 | GPT-5.6 Luna max | JEV 1.13.0 direct-choice |
| j011 | JEV 1.13.0 direct-choice | GPT-5.6 Terra low |
| j012 | GPT-5.6 Terra low | JEV 1.13.0 direct-choice |

Use pinned `jev-1.13.0` and the same state-only Choice request as j001. Exactly one API call per played JEV move; no tactical adapter, filtering, search, retries, fallback, win-confidence interpretation or model substitution. Only the JEV side/directory changes for reversed colors. Preserve the pilot's immutable adapter snapshots and archives.

Opponents use unchanged `prompts/player.md`, normal Cockpit visual tasks, Auto accounts, and standard tier for Codex. Confirm native model and effort before each launch, particularly Antigravity `gemini-3.8-flash-high`. Do not add a custom system prompt. No Ultra, no terminal tasks. Discord remains disabled; only a completion supervisor runs from the parent shell.

Before each next game: independently replay the finished game, audit both players' full referee-only blind I/O and actual sessions, verify JEV request/response/run-ID correspondence, preserve raw usage and null missing fields, record once under `matches/s1/jNNN.json` and `series/s1.json`, regenerate standings, commit and push. Runtime failures or protocol violations stop the queue for review; do not silently retry, replace or rank them. Excluded g189 and discarded g142 remain excluded.

Stop after j012. Summarize each reverse-color pair and all twelve games including j001. Publish uncertainty: two games per opponent do not establish a definitive model ordering, and direct-choice and conversational-agent interfaces remain different.

## Authorized j005 recovery

On 2026-09-21, decision 8 returned HTTP 200 and legal maximum-probability choice b7, but the original strict sum check rejected probabilities totaling 0.99. The user approved reusing that exact saved response without another API call (ask_36173a21f90c). Preserve the original request, response, error, code snapshots and usage; do not normalize probabilities or change the selected move.

For probabilities all reported to hundredth precision (allowing floating-point representation noise), the validator now permits the maximum aggregate rounding difference of 0.005 per option. Other precision retains the original 0.0001 tolerance. All range, legal-option, pinned-model and maximum-choice checks remain. This accommodates a possible rounded distribution; it does not establish that provider rounding was the cause.

Record the interruption and validator revision explicitly. j005 is not uninterrupted latency evidence and must use timing.eligible false. Subsequent games copy the revised validator, with its exact hash recorded. No additional game or API retry is authorized by this recovery.

At decision 26, a second HTTP 200 response selected legal h2 (0.19), while b4 had the largest reported probability (0.20). The sum was 1.00. The user approved ask_6106a3e7e0a5: reuse the saved h2 response without another API call and remove only the maximum-probability consistency requirement. The returned Choice is authoritative; the adapter must not replace it with its own argmax. Preserve the mismatch, both recovery histories, original responses and all validator versions. The pinned model, legal options, probability range and rounded-sum checks remain unchanged.
