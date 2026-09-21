import assert from 'node:assert/strict';

export const model = 'jev-1.13.0';

export function requestOf({ data, side }) {
  assert.ok(['B', 'W'].includes(side));
  assert.equal(data.turn, side);
  assert.equal(data.status, 'playing');
  assert.equal(data.board.length, 8);
  assert.ok(data.board.every(row => /^[BW.]{8}$/.test(row)));
  assert.ok(data.legal.length > 0);
  assert.ok(data.legal.every(move => /^[a-h][1-8]$/.test(move)));
  assert.equal(new Set(data.legal).size, data.legal.length);
  return {
    model,
    state: {
      game: 'Reversi on an 8 by 8 board',
      yourSide: side,
      coordinates: 'Columns a through h left to right; board rows are 8 through 1 top to bottom. B is Black, W is White, dot is empty.',
      rules: 'Place a disc on a legal empty square. Every straight line of opponent discs bracketed by your discs is flipped. Turns alternate; a player without a legal move passes. The game ends when neither can move. More discs wins; equal discs is a draw.',
      board: data.board,
      counts: data.counts,
      legal: data.legal,
      lastMove: data.lastMove,
    },
    questions: {
      move: {
        type: 'choice',
        instructions: 'It is your turn. Select the legal move you judge best for winning the game at the end. Choose exactly one coordinate.',
        criteria: Object.fromEntries(data.legal.map(move => [move, null])),
      },
    },
  };
}

export function choiceOf({ request, envelope }) {
  assert.equal(envelope.success, true);
  assert.equal(envelope.data.ok, true);
  assert.equal(envelope.data.result.status, 200);
  const response = envelope.data.result.body;
  assert.equal(response.model, model);
  const answer = response.answers.move;
  assert.equal(answer.type, 'choice');
  const legal = Object.keys(request.questions.move.criteria);
  assert.ok(legal.includes(answer.choice));
  assert.deepEqual(Object.keys(answer.probabilities).sort(), [...legal].sort());
  const probabilities = Object.values(answer.probabilities);
  assert.ok(probabilities.every(p => Number.isFinite(p) && p >= 0 && p <= 1));
  assert.ok(Math.abs(probabilities.reduce((a, b) => a + b, 0) - 1) < 0.0001);
  assert.ok(answer.probabilities[answer.choice] >= Math.max(...probabilities) - 0.000001);
  return answer.choice;
}
