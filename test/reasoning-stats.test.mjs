import assert from "node:assert/strict";
import test from "node:test";

import { reasoningStatsOf } from "../reasoning-stats.mjs";

test("aggregates exact reasoning usage across games", () => {
  assert.deepEqual(
    reasoningStatsOf([
      { tokens: 100, moves: 10 },
      { tokens: 300, moves: 20 },
      { tokens: 500, moves: 20 },
    ]),
    {
      averagePerMove: 18,
      total: 900,
      medianPerGame: 300,
      q1PerGame: 200,
      q3PerGame: 400,
      iqrPerGame: 200,
      games: 3,
      moves: 50,
    },
  );
});

test("reports a one-game sample without hiding its distribution", () => {
  assert.deepEqual(reasoningStatsOf([{ tokens: 240, moves: 12 }]), {
    averagePerMove: 20,
    total: 240,
    medianPerGame: 240,
    q1PerGame: 240,
    q3PerGame: 240,
    iqrPerGame: 0,
    games: 1,
    moves: 12,
  });
});

test("excludes unavailable legacy zeroes and missing provider usage", () => {
  assert.equal(reasoningStatsOf([{ tokens: 0, moves: 20 }, { tokens: null, moves: 20 }]), null);
});
