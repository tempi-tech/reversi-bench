const quantileOf = ({ sorted, percentile }) => {
  const index = (sorted.length - 1) * percentile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

export const reasoningStatsOf = (samples) => {
  const measured = samples.filter(({ moves, tokens }) => Number.isFinite(tokens) && tokens > 0 && moves > 0);
  if (measured.length === 0) {
    return null;
  }

  const perGame = measured.map(({ tokens }) => tokens).sort((a, b) => a - b);
  const total = perGame.reduce((sum, value) => sum + value, 0);
  const moves = measured.reduce((sum, sample) => sum + sample.moves, 0);
  const q1PerGame = quantileOf({ sorted: perGame, percentile: 0.25 });
  const medianPerGame = quantileOf({ sorted: perGame, percentile: 0.5 });
  const q3PerGame = quantileOf({ sorted: perGame, percentile: 0.75 });

  return {
    averagePerMove: total / moves,
    total,
    medianPerGame,
    q1PerGame,
    q3PerGame,
    iqrPerGame: q3PerGame - q1PerGame,
    games: measured.length,
    moves,
  };
};
