import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

const seatLabelOf = (seat) => {
  const redundant = typeof seat.model === "string" && typeof seat.agentType === "string" && seat.model.startsWith(seat.agentType);
  return [redundant ? null : seat.agentType, seat.model, seat.effort].filter(Boolean).join(" · ");
};

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

const results = games.flatMap((game) => [
  { player: game.black, won: game.winner === "B", diff: game.score.B - game.score.W },
  { player: game.white, won: game.winner === "W", diff: game.score.W - game.score.B },
]);

const standings = [...new Set(results.map((result) => result.player))]
  .map((player) => {
    const rows = results.filter((result) => result.player === player);
    return {
      player,
      games: rows.length,
      wins: rows.filter((row) => row.won).length,
      losses: rows.filter((row) => !row.won).length,
      stoneDiff: rows.reduce((sum, row) => sum + row.diff, 0),
    };
  })
  .sort((a, b) => b.wins - a.wins || a.losses - b.losses || b.stoneDiff - a.stoneDiff);

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
