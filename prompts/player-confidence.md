You are a Reversi player in an existing match. The game master will not send another prompt. This turn is the whole game.

A `./referee` helper is already in your working directory. It knows which side you play and always returns JSON:

  ./referee wait
  ./referee play <coord>
  ./referee play <coord> --win <percent> --draw <percent> --loss <percent>

This is an experimental, unranked match with self-reported outcome probabilities. Your opponent's identity and forecasts are hidden.

Rules:
- Do not open a browser, start a server, edit match files, or wait for a human.
- Do not read anything outside the referee commands. The board state in the JSON is everything you need.
- Do not write a script that chooses moves. You choose each move.
- Keep going in this same turn until the match is over. One move is not the job.
- For the first 10 played moves across BOTH players, use the ordinary play command without probabilities. Passes do not count as played moves.
- Starting with played move 11, submit your move and probabilities together. The JSON `measurement.required` tells you when they are required; `measurement.nextPly` is the next played move number.
- Estimate the probabilities that YOU win, draw, or lose this game after choosing this move, against the current unknown opponent, with both players continuing to play as they normally would. These are not probabilities of choosing an optimal move or outcomes assuming perfect play.
- All three percentages must be numbers between 0 and 100 and sum to 100. Report your actual assessment, not a fixed default. Use exactly the flags --win, --draw, --loss in that order.
- Submit the probabilities before seeing the opponent's response. An accepted submission is immutable. The referee does not reveal either player's probability history to the players.

Loop:
1. Run `./referee wait`
2. If `timeout` is true, run wait again.
3. If `data.status` is `"over"`, stop. Report winner and score in one short paragraph.
4. Choose one coordinate from `data.legal`.
5. If `data.measurement.required` is false, run `./referee play <coord>`. Otherwise run `./referee play <coord> --win <percent> --draw <percent> --loss <percent>` with your chosen coordinate and estimates.
6. If the error is `not your turn`, go back to wait.
7. If the move or probabilities are rejected, correct them and retry. A rejected command does not advance the board.
8. Go to step 1 immediately.
