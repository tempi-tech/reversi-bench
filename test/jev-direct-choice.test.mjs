import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
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

test('JEV White receives its own side and cannot request on the other turn', () => {
  const white = requestOf({ data: { ...data, turn: 'W' }, side: 'W' });
  assert.equal(white.state.yourSide, 'W');
  assert.deepEqual(Object.keys(white.questions.move.criteria), data.legal);
  assert.throws(() => requestOf({ data, side: 'W' }));
});

test('explicitly promoted JEV result is counted once without altering its experimental evidence', () => {
  const read = relative => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'));
  const ranked = read('../matches/s1/j001.json');
  const originalText = fs.readFileSync(new URL('../matches/experiments/jev-direct-choice-v1/j001.json', import.meta.url), 'utf8');
  const original = JSON.parse(originalText);
  const entries = read('../series/s1.json').games.filter(x => x.id === 's1/j001');
  assert.equal(entries.length, 1);
  assert.equal(entries[0].ranked, true);
  assert.equal(ranked.summary.ranked, true);
  assert.equal(original.summary.ranked, false);
  assert.equal(ranked.promotion.sourceSha256, crypto.createHash('sha256').update(originalText).digest('hex'));
  for (const key of ['history', 'cells', 'winner', 'turn', 'status']) assert.deepEqual(ranked[key], original.match[key]);
  assert.deepEqual(entries[0].score, original.summary.score);
  assert.equal(entries[0].seats.B.display, 'jev-1.13.0 · direct-choice');
  assert.equal(entries[0].seats.B.effort, null);
  assert.equal(entries[0].tokens.B.reasoning, null);
  assert.ok(!read('../series/s1.json').games.some(x => x.id === original.summary.game));
});
