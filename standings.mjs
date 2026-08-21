import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

const seatLabelOf = (seat) => (typeof seat.display === "string"
  ? seat.display
  : [seat.model, seat.effort].filter(Boolean).join(" · "));

const series = JSON.parse(fs.readFileSync(path.join(here, "series", "s1.json"), "utf8"));

const seriesGames = series.games.map((game) => ({
  id: game.id,
  card: game.card,
  blind: game.blind,
  playedAt: game.finishedAt ?? null,
  black: seatLabelOf(game.seats.B),
  white: seatLabelOf(game.seats.W),
  winner: game.winner,
  score: game.score,
  moves: game.moves,
  outputTokens: {
    B: game.tokens?.B?.output ?? null,
    W: game.tokens?.W?.output ?? null,
  },
  incidents: game.incidents ?? [],
}));

const exhibitionGames = fs.readdirSync(path.join(here, "matches"))
  .filter((name) => name.startsWith("exhibition-") && name.endsWith(".json"))
  .sort()
  .map((name) => {
    const match = JSON.parse(fs.readFileSync(path.join(here, "matches", name), "utf8"));
    return {
      id: match.id,
      card: "exhibition",
      blind: false,
      playedAt: match.updatedAt ?? null,
      black: match.players.B.model,
      white: match.players.W.model,
      winner: match.winner,
      score: {
        B: match.cells.filter((cell) => cell === "B").length,
        W: match.cells.filter((cell) => cell === "W").length,
      },
      moves: match.history.length,
      outputTokens: { B: null, W: null },
      incidents: [],
    };
  });

const games = [...exhibitionGames, ...seriesGames]
  .sort((a, b) => String(a.playedAt).localeCompare(String(b.playedAt)));

const outcomeOf = (winner, side) => (winner === side ? "win" : winner === "B" || winner === "W" ? "loss" : "draw");

const results = games.flatMap((game) => [
  { player: game.black, outcome: outcomeOf(game.winner, "B"), diff: game.score.B - game.score.W },
  { player: game.white, outcome: outcomeOf(game.winner, "W"), diff: game.score.W - game.score.B },
]);

const players = [...new Set(results.map((result) => result.player))];

const meetings = games.map((game) => ({ home: game.black, away: game.white }));

const creditsOf = (player) => games.reduce((sum, game) => {
  const side = game.black === player ? "B" : game.white === player ? "W" : null;
  if (!side) {
    return sum;
  }
  return sum + (game.winner === side ? 1 : game.winner === "B" || game.winner === "W" ? 0 : 0.5);
}, 0);

const PRIOR_GAMES = 1;
const FITTING_ROUNDS = 3000;

const strengthsOf = () => {
  const step = (theta) => {
    const next = Object.fromEntries(players.map((player) => {
      const wins = creditsOf(player) + PRIOR_GAMES;
      const played = meetings.filter((meeting) => meeting.home === player || meeting.away === player);
      const pairs = played.reduce((sum, meeting) => {
        const other = meeting.home === player ? meeting.away : meeting.home;
        return sum + 1 / (Math.exp(theta[player]) + Math.exp(theta[other]));
      }, 0);
      const prior = (2 * PRIOR_GAMES) / (Math.exp(theta[player]) + 1);
      return [player, Math.log(wins) - Math.log(pairs + prior)];
    }));
    const mean = Object.values(next).reduce((sum, value) => sum + value, 0) / players.length;
    return Object.fromEntries(Object.entries(next).map(([player, value]) => [player, value - mean]));
  };
  return Array.from({ length: FITTING_ROUNDS }).reduce(
    (theta) => step(theta),
    Object.fromEntries(players.map((player) => [player, 0])),
  );
};

const strengths = strengthsOf();

const standings = players
  .map((player) => {
    const rows = results.filter((result) => result.player === player);
    return {
      player,
      rating: Math.round(1500 + (400 * strengths[player]) / Math.LN10),
      games: rows.length,
      wins: rows.filter((row) => row.outcome === "win").length,
      losses: rows.filter((row) => row.outcome === "loss").length,
      draws: rows.filter((row) => row.outcome === "draw").length,
      stoneDiff: rows.reduce((sum, row) => sum + row.diff, 0),
    };
  })
  .sort((a, b) => b.rating - a.rating || b.stoneDiff - a.stoneDiff);

const doc = {
  bench: "Reversi Bench",
  series: series.series,
  tagline: "Does more thinking make a stronger player?",
  source: "https://github.com/tempi-tech/reversi-bench",
  generatedAt: new Date().toISOString(),
  standings,
  games,
};

fs.writeFileSync(path.join(here, "standings.json"), `${JSON.stringify(doc, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ ok: true, games: games.length, players: standings.length })}\n`);
