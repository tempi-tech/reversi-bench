import test from 'node:test';
import assert from 'node:assert/strict';
import { requestOf, choiceOf, model } from '../experiments/jev-direct-choice.mjs';

const data = { status: 'playing', turn: 'B', board: ['........', '........', '........', '...BW...', '...WB...', '........', '........', '........'], legal: ['c4', 'd3', 'e6', 'f5'], counts: { B: 2, W: 2 }, lastMove: null, seats: { B: 'secret', W: 'opponent' } };
const request = requestOf({ data, side: 'B' });
const response = choice => ({ success: true, data: { ok: true, result: { status: 200, body: { model, answers: { move: { type: 'choice', choice, probabilities: { c4: 0.7, d3: 0.1, e6: 0.1, f5: 0.1 } } } } } } });

test('JEV receives only present state, all legal coordinates and no seat identities', () => {
  assert.equal(JSON.stringify(request).includes('secret'), false);
  assert.equal(JSON.stringify(request).includes('opponent"'), false);
  assert.deepEqual(Object.keys(request.questions.move.criteria), data.legal);
  assert.equal(choiceOf({ request, envelope: response('c4') }), 'c4');
});
test('JEV response cannot substitute illegal or non-selected moves', () => {
  assert.throws(() => choiceOf({ request, envelope: response('a1') }));
  assert.throws(() => choiceOf({ request, envelope: response('d3') }));
  const wrongModel = response('c4');
  wrongModel.data.result.body.model = 'other';
  assert.throws(() => choiceOf({ request, envelope: wrongModel }));
});
test('forced legal move remains a one-choice model request', () => {
  const forced = requestOf({ data: { ...data, legal: ['c4'] }, side: 'B' });
  assert.deepEqual(forced.questions.move.criteria, { c4: null });
});
