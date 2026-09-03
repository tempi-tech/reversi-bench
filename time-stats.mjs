const quantileOf = ({ sorted, percentile }) => {
  const index = (sorted.length - 1) * percentile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

export const moveDurationsOf = ({ history, side }) => history.flatMap((entry, index) => {
  if (index === 0 || entry.side !== side || entry.move === "pass") {
    return [];
  }

  const previousAt = Date.parse(history[index - 1]?.at);
  const playedAt = Date.parse(entry.at);
  const duration = playedAt - previousAt;
  return Number.isFinite(duration) && duration >= 0 ? [duration] : [];
});

export const timeStatsOf = (samples) => {
  const measured = samples.filter(({ durations }) => durations.length > 0);
  if (measured.length === 0) {
    return null;
  }

  const durations = measured.flatMap((sample) => sample.durations).sort((a, b) => a - b);
  const totalMs = durations.reduce((sum, value) => sum + value, 0);
  const averagePerMoveMs = totalMs / durations.length;
  const q1PerMoveMs = quantileOf({ sorted: durations, percentile: 0.25 });
  const medianPerMoveMs = quantileOf({ sorted: durations, percentile: 0.5 });
  const q3PerMoveMs = quantileOf({ sorted: durations, percentile: 0.75 });
  const variancePerMoveMs = durations.reduce(
    (sum, value) => sum + (value - averagePerMoveMs) ** 2,
    0,
  ) / durations.length;

  return {
    averagePerMoveMs,
    totalMs,
    medianPerMoveMs,
    q1PerMoveMs,
    q3PerMoveMs,
    iqrPerMoveMs: q3PerMoveMs - q1PerMoveMs,
    standardDeviationPerMoveMs: Math.sqrt(variancePerMoveMs),
    games: measured.length,
    moves: durations.length,
    decisions: samples.reduce((sum, sample) => sum + sample.moves, 0),
  };
};
