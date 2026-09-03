import assert from "node:assert/strict";
import test from "node:test";

import { moveDurationsOf, timeStatsOf } from "../time-stats.mjs";

test("attributes elapsed time to each played move after the opener", () => {
  const history = [
    { side: "B", move: "c4", at: "2026-09-03T00:00:10.000Z" },
    { side: "W", move: "c3", at: "2026-09-03T00:00:13.000Z" },
    { side: "B", move: "d3", at: "2026-09-03T00:00:18.000Z" },
  ];

  assert.deepEqual(moveDurationsOf({ history, side: "B" }), [5000]);
  assert.deepEqual(moveDurationsOf({ history, side: "W" }), [3000]);
});

test("uses an automatic pass as the next turn's start without counting it", () => {
  const history = [
    { side: "B", move: "c4", at: "2026-09-03T00:00:10.000Z" },
    { side: "W", move: "pass", at: "2026-09-03T00:00:11.000Z" },
    { side: "B", move: "d3", at: "2026-09-03T00:00:15.000Z" },
  ];

  assert.deepEqual(moveDurationsOf({ history, side: "B" }), [4000]);
  assert.deepEqual(moveDurationsOf({ history, side: "W" }), []);
});

test("excludes moves with missing or backward timestamps", () => {
  const history = [
    { side: "B", move: "c4", at: "2026-09-03T00:00:10.000Z" },
    { side: "W", move: "c3" },
    { side: "B", move: "d3", at: "2026-09-03T00:00:09.000Z" },
    { side: "W", move: "e3", at: "2026-09-03T00:00:12.000Z" },
  ];

  assert.deepEqual(moveDurationsOf({ history, side: "B" }), []);
  assert.deepEqual(moveDurationsOf({ history, side: "W" }), [3000]);
});

test("aggregates per-move time distribution and coverage", () => {
  assert.deepEqual(
    timeStatsOf([
      { durations: [1000, 3000], moves: 3 },
      { durations: [5000], moves: 2 },
    ]),
    {
      averagePerMoveMs: 3000,
      totalMs: 9000,
      medianPerMoveMs: 3000,
      q1PerMoveMs: 2000,
      q3PerMoveMs: 4000,
      iqrPerMoveMs: 2000,
      standardDeviationPerMoveMs: Math.sqrt(8000000 / 3),
      games: 2,
      moves: 3,
      decisions: 5,
    },
  );
});

test("reports a one-move sample and ignores games without measurable intervals", () => {
  assert.deepEqual(timeStatsOf([{ durations: [2400], moves: 1 }, { durations: [], moves: 1 }]), {
    averagePerMoveMs: 2400,
    totalMs: 2400,
    medianPerMoveMs: 2400,
    q1PerMoveMs: 2400,
    q3PerMoveMs: 2400,
    iqrPerMoveMs: 0,
    standardDeviationPerMoveMs: 0,
    games: 1,
    moves: 1,
    decisions: 2,
  });
  assert.equal(timeStatsOf([{ durations: [], moves: 1 }]), null);
});
