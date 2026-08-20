#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const matchesDir = path.join(here, "matches");
const uiDir = path.join(here, "ui");
const defaultMatchId = "current";
const directions = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

const emptyCell = ".";
const black = "B";
const white = "W";

const fail = (message, code = 1) => {
  process.stderr.write(`${message}\n`);
  process.exit(code);
};

const argsOf = (argv) => {
  const rest = [];
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--") {
      rest.push(...argv.slice(index + 1));
      break;
    }
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[index + 1];
      if (next === undefined || next.startsWith("--")) {
        flags[key] = true;
        continue;
      }
      flags[key] = next;
      index += 1;
      continue;
    }
    rest.push(token);
  }
  return { rest, flags };
};

const parseSide = (value) => {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "B" || raw === "BLACK") {
    return black;
  }
  if (raw === "W" || raw === "WHITE") {
    return white;
  }
  return null;
};

const opponentOf = (color) => (color === black ? white : black);

const otherTurn = (turn) => (turn === black ? white : black);

const indexOf = ({ size, row, col }) => row * size + col;

const inBounds = ({ size, row, col }) => row >= 0 && col >= 0 && row < size && col < size;

const parseCoord = ({ text, size }) => {
  const raw = String(text).trim().toLowerCase();
  if (raw === "pass") {
    return { pass: true };
  }
  const match = raw.match(/^([a-z])(\d+)$/);
  if (!match) {
    return null;
  }
  const col = match[1].charCodeAt(0) - 97;
  const rank = Number(match[2]);
  const row = size - rank;
  if (col < 0 || col >= size || row < 0 || row >= size) {
    return null;
  }
  return { pass: false, row, col, coord: `${match[1]}${rank}` };
};

const formatCoord = ({ size, row, col }) => {
  return `${String.fromCharCode(97 + col)}${size - row}`;
};

const cellsOf = (size) => Array.from({ length: size * size }, () => emptyCell);

const placeCenter = ({ cells, size }) => {
  const mid = size / 2;
  const next = cells.slice();
  next[indexOf({ size, row: mid - 1, col: mid - 1 })] = white;
  next[indexOf({ size, row: mid, col: mid })] = white;
  next[indexOf({ size, row: mid - 1, col: mid })] = black;
  next[indexOf({ size, row: mid, col: mid - 1 })] = black;
  return next;
};

const flipsAt = ({ cells, size, color, row, col }) => {
  if (cells[indexOf({ size, row, col })] !== emptyCell) {
    return [];
  }
  const foe = opponentOf(color);
  const flipped = [];
  for (const [dRow, dCol] of directions) {
    const run = [];
    let cursorRow = row + dRow;
    let cursorCol = col + dCol;
    while (inBounds({ size, row: cursorRow, col: cursorCol })) {
      const value = cells[indexOf({ size, row: cursorRow, col: cursorCol })];
      if (value === foe) {
        run.push({ row: cursorRow, col: cursorCol });
        cursorRow += dRow;
        cursorCol += dCol;
        continue;
      }
      if (value === color && run.length > 0) {
        flipped.push(...run);
      }
      break;
    }
  }
  return flipped;
};

const legalMoves = ({ cells, size, color }) => {
  const moves = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const flips = flipsAt({ cells, size, color, row, col });
      if (flips.length === 0) {
        continue;
      }
      moves.push({
        coord: formatCoord({ size, row, col }),
        row,
        col,
        flips: flips.map((cell) => formatCoord({ size, row: cell.row, col: cell.col })),
      });
    }
  }
  return moves;
};

const countsOf = (cells) => {
  return cells.reduce(
    (counts, cell) => {
      if (cell === black) {
        counts.B += 1;
      }
      if (cell === white) {
        counts.W += 1;
      }
      return counts;
    },
    { B: 0, W: 0 },
  );
};

const boardRowsOf = ({ cells, size }) => {
  const rows = [];
  for (let row = 0; row < size; row += 1) {
    const rank = size - row;
    const line = cells.slice(row * size, row * size + size).join(" ");
    rows.push(`${rank} | ${line}`);
  }
  const files = Array.from({ length: size }, (_, col) => String.fromCharCode(97 + col)).join(" ");
  rows.push(`    ${files}`);
  return rows;
};

const applyStone = ({ cells, size, color, row, col, flips }) => {
  const next = cells.slice();
  next[indexOf({ size, row, col })] = color;
  for (const cell of flips) {
    next[indexOf({ size, row: cell.row, col: cell.col })] = color;
  }
  return next;
};

const winnerOf = (counts) => {
  if (counts.B === counts.W) {
    return "draw";
  }
  return counts.B > counts.W ? black : white;
};

const settleTurn = ({ cells, size, intended }) => {
  const first = legalMoves({ cells, size, color: intended });
  if (first.length > 0) {
    return { turn: intended, passed: [], legal: first };
  }
  const secondColor = otherTurn(intended);
  const second = legalMoves({ cells, size, color: secondColor });
  if (second.length > 0) {
    return { turn: secondColor, passed: [intended], legal: second };
  }
  return { turn: intended, passed: [intended, secondColor], legal: [] };
};

const nowIso = () => new Date().toISOString();

const createMatch = ({
  id,
  size,
  blackName,
  whiteName,
  blackModel,
  whiteModel,
}) => {
  if (!Number.isInteger(size) || size < 4 || size > 8 || size % 2 !== 0) {
    throw new Error("size must be an even integer from 4 to 8");
  }
  const cells = placeCenter({ cells: cellsOf(size), size });
  const settled = settleTurn({ cells, size, intended: black });
  return {
    id,
    size,
    title: `Reversi ${size}×${size}`,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    cells,
    turn: settled.turn,
    status: "playing",
    winner: null,
    thinking: settled.turn,
    lastMove: null,
    history: settled.passed.map((side) => ({
      side,
      move: "pass",
      flips: [],
      at: nowIso(),
    })),
    players: {
      B: { name: blackName, model: blackModel, say: "" },
      W: { name: whiteName, model: whiteModel, say: "" },
    },
  };
};

const matchPath = (id) => path.join(matchesDir, `${id}.json`);

const readMatch = (id) => {
  const file = matchPath(id);
  if (!fs.existsSync(file)) {
    throw new Error(`match not found: ${id}`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
};

const writeMatch = (match) => {
  fs.mkdirSync(matchesDir, { recursive: true });
  const file = matchPath(match.id);
  const tmp = `${file}.tmp`;
  const next = { ...match, updatedAt: nowIso() };
  fs.writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`);
  fs.renameSync(tmp, file);
  return next;
};

const isReadyFor = ({ match, side }) => match.status === "over" || match.turn === side;

const waitForTurn = ({ id, side, timeoutSec }) => new Promise((resolve) => {
  const deadline = Date.now() + timeoutSec * 1000;
  let settled = false;
  let watcher = null;
  let timer = null;
  const finish = (payload) => {
    if (settled) {
      return;
    }
    settled = true;
    if (timer) {
      clearInterval(timer);
    }
    if (watcher) {
      watcher.close();
    }
    resolve(payload);
  };
  const check = () => {
    if (settled) {
      return;
    }
    try {
      const match = readMatch(id);
      if (isReadyFor({ match, side })) {
        if (match.status === "playing" && match.thinking !== side) {
          writeMatch({ ...match, thinking: side });
        }
        finish({ ok: true, timeout: false, data: viewOf(readMatch(id)) });
        return;
      }
      if (Date.now() >= deadline) {
        finish({ ok: true, timeout: true, data: viewOf(match) });
      }
    } catch (error) {
      finish({ ok: false, error: error.message });
    }
  };
  fs.mkdirSync(matchesDir, { recursive: true });
  watcher = fs.watch(matchesDir, check);
  timer = setInterval(check, 250);
  check();
});

const viewOf = (match) => {
  const legal = match.status === "playing"
    ? legalMoves({ cells: match.cells, size: match.size, color: match.turn })
    : [];
  const counts = countsOf(match.cells);
  return {
    id: match.id,
    title: match.title,
    size: match.size,
    status: match.status,
    winner: match.winner,
    turn: match.turn,
    thinking: match.thinking,
    counts,
    legal: legal.map((move) => move.coord),
    board: Array.from({ length: match.size }, (_, row) => (
      match.cells.slice(row * match.size, row * match.size + match.size).join("")
    )),
    boardRows: boardRowsOf({ cells: match.cells, size: match.size }),
    lastMove: match.lastMove,
    history: match.history,
    players: match.players,
    seats: match.seats ?? null,
    updatedAt: match.updatedAt,
  };
};

const printView = (view) => {
  const lines = [
    `${view.title} · ${view.status === "over" ? "final" : `${view.turn} to move`}`,
    `Black ${view.counts.B}  White ${view.counts.W}`,
    "",
    ...view.boardRows,
    "",
  ];
  if (view.status === "over") {
    const result = view.winner === "draw" ? "draw" : `${view.winner} wins`;
    lines.push(`result: ${result}`);
  } else {
    lines.push(`legal: ${view.legal.join(" ") || "(none)"}`);
  }
  process.stdout.write(`${lines.join("\n")}\n`);
};

const playMatch = ({ match, text }) => {
  if (match.status !== "playing") {
    throw new Error("match is over");
  }
  const parsed = parseCoord({ text, size: match.size });
  if (!parsed) {
    throw new Error(`invalid move: ${text}`);
  }
  const legal = legalMoves({ cells: match.cells, size: match.size, color: match.turn });
  if (parsed.pass) {
    if (legal.length > 0) {
      throw new Error("pass is not allowed while a legal move exists");
    }
    const nextTurn = otherTurn(match.turn);
    const settled = settleTurn({ cells: match.cells, size: match.size, intended: nextTurn });
    const history = [
      ...match.history,
      { side: match.turn, move: "pass", flips: [], at: nowIso() },
    ];
    if (settled.legal.length === 0) {
      const counts = countsOf(match.cells);
      return {
        ...match,
        status: "over",
        winner: winnerOf(counts),
        thinking: null,
        lastMove: { side: match.turn, move: "pass", flips: [] },
        history,
      };
    }
    return {
      ...match,
      turn: settled.turn,
      thinking: settled.turn,
      lastMove: { side: match.turn, move: "pass", flips: [] },
      history,
    };
  }
  const chosen = legal.find((move) => move.coord === parsed.coord);
  if (!chosen) {
    throw new Error(`illegal move: ${parsed.coord}`);
  }
  const flips = chosen.flips.map((coord) => parseCoord({ text: coord, size: match.size }));
  const cells = applyStone({
    cells: match.cells,
    size: match.size,
    color: match.turn,
    row: chosen.row,
    col: chosen.col,
    flips,
  });
  const history = [
    ...match.history,
    { side: match.turn, move: chosen.coord, flips: chosen.flips, at: nowIso() },
  ];
  const nextIntended = otherTurn(match.turn);
  const settled = settleTurn({ cells, size: match.size, intended: nextIntended });
  const lastMove = { side: match.turn, move: chosen.coord, flips: chosen.flips };
  if (settled.legal.length === 0) {
    const counts = countsOf(cells);
    return {
      ...match,
      cells,
      status: "over",
      winner: winnerOf(counts),
      thinking: null,
      lastMove,
      history: [
        ...history,
        ...settled.passed.map((side) => ({ side, move: "pass", flips: [], at: nowIso() })),
      ],
    };
  }
  return {
    ...match,
    cells,
    turn: settled.turn,
    thinking: settled.turn,
    lastMove,
    history: [
      ...history,
      ...settled.passed.map((side) => ({ side, move: "pass", flips: [], at: nowIso() })),
    ],
  };
};

const mimeOf = (file) => {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".css")) return "text/css; charset=utf-8";
  if (file.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
};

const sendJson = ({ response, status, body }) => {
  const payload = `${JSON.stringify(body)}\n`;
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(payload),
  });
  response.end(payload);
};

const serveFile = ({ response, file }) => {
  const absolute = path.resolve(file);
  if (!absolute.startsWith(path.resolve(uiDir))) {
    response.writeHead(403);
    response.end("forbidden");
    return;
  }
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    response.writeHead(404);
    response.end("not found");
    return;
  }
  const body = fs.readFileSync(absolute);
  response.writeHead(200, {
    "Content-Type": mimeOf(absolute),
    "Cache-Control": "no-store",
    "Content-Length": body.length,
  });
  response.end(body);
};

const startServer = ({ matchId, port, seatsFile, seatsKey }) => {
  const overlayFor = (search) => {
    if (!seatsFile || !seatsKey || search.get("key") !== seatsKey) {
      return null;
    }
    try {
      return JSON.parse(fs.readFileSync(seatsFile, "utf8"));
    } catch {
      return null;
    }
  };
  const viewFor = (overlay) => {
    const view = viewOf(readMatch(matchId));
    if (overlay?.seats) {
      return { ...view, seats: overlay.seats };
    }
    return view;
  };
  const clients = new Set();
  const broadcast = () => {
    for (const client of clients) {
      client.response.write(`data: ${JSON.stringify(viewFor(client.overlay))}\n\n`);
    }
  };
  let debounce = null;
  fs.watch(matchesDir, () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      try {
        broadcast();
      } catch {
        return;
      }
    }, 40);
  });
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      serveFile({ response, file: path.join(uiDir, "index.html") });
      return;
    }
    if (request.method === "GET" && url.pathname.startsWith("/ui/")) {
      serveFile({ response, file: path.join(uiDir, url.pathname.slice(4)) });
      return;
    }
    if (request.method === "GET" && (url.pathname === "/styles.css" || url.pathname === "/app.js")) {
      serveFile({ response, file: path.join(uiDir, url.pathname.slice(1)) });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/state") {
      try {
        sendJson({ response, status: 200, body: viewFor(overlayFor(url.searchParams)) });
      } catch (error) {
        sendJson({ response, status: 404, body: { error: error.message } });
      }
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/events") {
      response.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
      });
      const client = { response, overlay: overlayFor(url.searchParams) };
      clients.add(client);
      try {
        response.write(`data: ${JSON.stringify(viewFor(client.overlay))}\n\n`);
      } catch {
        response.write(`data: ${JSON.stringify({ error: "match not found" })}\n\n`);
      }
      request.on("close", () => {
        clients.delete(client);
      });
      return;
    }
    response.writeHead(404);
    response.end("not found");
  });
  server.listen(port, "127.0.0.1", () => {
    process.stdout.write(`${JSON.stringify({
      ok: true,
      url: `http://127.0.0.1:${port}`,
      match: matchId,
    })}\n`);
  });
};

const assertEqual = (actual, expected, label) => {
  const left = JSON.stringify(actual);
  const right = JSON.stringify(expected);
  if (left !== right) {
    throw new Error(`${label}: expected ${right}, got ${left}`);
  }
};

const runSelftest = () => {
  const match = createMatch({
    id: "selftest",
    size: 4,
    blackName: "Black",
    whiteName: "White",
    blackModel: "test-black",
    whiteModel: "test-white",
  });
  const opening = viewOf(match);
  assertEqual(opening.legal.sort(), ["a3", "b4", "c1", "d2"], "opening legal");
  assertEqual(opening.board, ["....", ".WB.", ".BW.", "...."], "opening board");
  const afterBlack = playMatch({ match, text: "b4" });
  const blackView = viewOf(afterBlack);
  assertEqual(blackView.board, [".B..", ".BB.", ".BW.", "...."], "after b4");
  assertEqual(blackView.counts, { B: 4, W: 1 }, "after b4 counts");
  assertEqual(blackView.turn, white, "white to move");
  let caught = false;
  try {
    playMatch({ match: afterBlack, text: "a1" });
  } catch {
    caught = true;
  }
  if (!caught) {
    throw new Error("illegal move was accepted");
  }
  const afterWhite = playMatch({ match: afterBlack, text: "a2" });
  assertEqual(viewOf(afterWhite).board, [".B..", ".BB.", "WWW.", "...."], "after a2");
  assertEqual(viewOf(afterWhite).counts, { B: 3, W: 3 }, "after a2 counts");
  writeMatch(match);
  let rejected = false;
  try {
    if (!parseSide("W")) {
      throw new Error("parseSide W failed");
    }
    const live = readMatch(match.id);
    if (live.turn === black && parseSide("W") === white) {
      rejected = true;
    }
  } catch {
    rejected = true;
  }
  assertEqual(rejected, true, "white cannot claim black's opening");
  process.stdout.write("selftest ok\n");
};

const helpText = `reversi — local match referee

  node reversi.mjs new [--size 4] [--id current]
                       [--black Name] [--white Name]
                       [--black-model id] [--white-model id]
  node reversi.mjs state [--id current] [--json]
  node reversi.mjs play <coord|pass> --as B|W [--id current] [--json]
  node reversi.mjs wait --as B|W [--timeout 120] [--id current]
  node reversi.mjs thinking <B|W|clear> [--id current]
  node reversi.mjs say <B|W> <text...> [--id current]
  node reversi.mjs prompt [--id current]
  node reversi.mjs serve [--id current] [--port 8765] [--seats file --key token]
  node reversi.mjs selftest
`;

const command = process.argv[2] ?? "help";
const { rest, flags } = argsOf(process.argv.slice(3));
const matchId = typeof flags.id === "string" ? flags.id : defaultMatchId;

try {
  if (command === "help" || command === "-h" || command === "--help") {
    process.stdout.write(helpText);
    process.exit(0);
  }

  if (command === "selftest") {
    runSelftest();
    process.exit(0);
  }

  if (command === "new") {
    const size = flags.size === undefined ? 4 : Number(flags.size);
    const match = createMatch({
      id: matchId,
      size,
      blackName: typeof flags.black === "string" ? flags.black : "Black",
      whiteName: typeof flags.white === "string" ? flags.white : "White",
      blackModel: typeof flags["black-model"] === "string" ? flags["black-model"] : "",
      whiteModel: typeof flags["white-model"] === "string" ? flags["white-model"] : "",
    });
    writeMatch(match);
    const view = viewOf(match);
    if (flags.json) {
      process.stdout.write(`${JSON.stringify({ ok: true, data: view })}\n`);
    } else {
      printView(view);
    }
    process.exit(0);
  }

  if (command === "state") {
    const view = viewOf(readMatch(matchId));
    if (flags.json) {
      process.stdout.write(`${JSON.stringify({ ok: true, data: view })}\n`);
    } else {
      printView(view);
    }
    process.exit(0);
  }

  if (command === "play") {
    const text = rest[0];
    const side = parseSide(flags.as);
    if (!text || !side) {
      fail("usage: reversi play <coord|pass> --as B|W");
    }
    const match = readMatch(matchId);
    if (match.status === "over") {
      throw new Error("match is over");
    }
    if (match.turn !== side) {
      throw new Error(`not your turn (you=${side}, turn=${match.turn})`);
    }
    const next = writeMatch(playMatch({ match, text }));
    const view = viewOf(next);
    if (flags.json) {
      process.stdout.write(`${JSON.stringify({ ok: true, data: view })}\n`);
    } else {
      printView(view);
    }
    process.exit(0);
  }

  if (command === "wait") {
    const side = parseSide(flags.as);
    if (!side) {
      fail("usage: reversi wait --as B|W [--timeout 120]");
    }
    const timeout = flags.timeout === undefined ? 120 : Number(flags.timeout);
    if (!Number.isFinite(timeout) || timeout < 1) {
      fail("invalid timeout");
    }
    waitForTurn({ id: matchId, side, timeoutSec: timeout }).then((payload) => {
      process.stdout.write(`${JSON.stringify(payload)}\n`);
      process.exit(payload.ok ? 0 : 1);
    });
  } else if (command === "thinking") {
    const value = (rest[0] ?? "").toUpperCase();
    const match = readMatch(matchId);
    if (value === "CLEAR" || value === "NONE" || value === "") {
      writeMatch({ ...match, thinking: null });
    } else if (value === black || value === white) {
      writeMatch({ ...match, thinking: value });
    } else {
      fail("usage: reversi thinking <B|W|clear>");
    }
    process.stdout.write(`${JSON.stringify({ ok: true, thinking: readMatch(matchId).thinking })}\n`);
    process.exit(0);
  } else if (command === "say") {
    const side = (rest[0] ?? "").toUpperCase();
    if (side !== black && side !== white) {
      fail("usage: reversi say <B|W> <text>");
    }
    const text = rest.slice(1).join(" ").trim();
    const match = readMatch(matchId);
    writeMatch({
      ...match,
      players: {
        ...match.players,
        [side]: { ...match.players[side], say: text },
      },
    });
    process.stdout.write(`${JSON.stringify({ ok: true })}\n`);
    process.exit(0);
  } else if (command === "prompt") {
    const view = viewOf(readMatch(matchId));
    const sideName = view.turn === black ? view.players.B.name : view.players.W.name;
    const lines = [
      `You are ${sideName} (${view.turn === black ? "Black" : "White"}).`,
      `${view.title}. Status: ${view.status}.`,
      `Black ${view.counts.B} — White ${view.counts.W}.`,
      "",
      ...view.boardRows,
      "",
      `Legal moves: ${view.legal.join(", ") || "(none)"}`,
      "Reply with exactly one line: MOVE <coord>",
    ];
    process.stdout.write(`${lines.join("\n")}\n`);
    process.exit(0);
  } else if (command === "serve") {
    const port = flags.port === undefined ? 8765 : Number(flags.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      fail("invalid port");
    }
    readMatch(matchId);
    startServer({
      matchId,
      port,
      seatsFile: typeof flags.seats === "string" ? flags.seats : null,
      seatsKey: typeof flags.key === "string" ? flags.key : null,
    });
  } else {
    fail(`unknown command: ${command}`);
  }
} catch (error) {
  if (flags.json) {
    process.stdout.write(`${JSON.stringify({ ok: false, error: error.message })}\n`);
    process.exit(1);
  }
  fail(error.message);
}
