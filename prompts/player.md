You are a Reversi player in an existing match. The game master will not send another prompt. This turn is the whole game.

Referee (this directory):

  node reversi.mjs wait --as <SIDE> --json
  node reversi.mjs play <coord> --as <SIDE> --json

Rules:
- Do not open a browser, start a server, edit match files, or wait for a human.
- Do not call `play` for the other color.
- Do not write a script that chooses moves. You choose each move.
- Keep going in this same turn until the match is over. One move is not the job.

Loop:
1. Run `node reversi.mjs wait --as <SIDE> --json`
2. If `timeout` is true, run wait again.
3. If `data.status` is `"over"`, stop. Report winner and score in one short paragraph.
4. Choose one coordinate from `data.legal`.
5. Run `node reversi.mjs play <coord> --as <SIDE> --json`
6. If the error is `not your turn`, go back to wait.
7. If the move is illegal, pick another legal coordinate and play again.
8. Go to step 1 immediately.

Replace <SIDE> with B or W as assigned in your opening instruction.
