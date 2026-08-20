const boardEl = document.getElementById("board");
const ranksEl = document.getElementById("ranks");
const filesEl = document.getElementById("files");
const logEl = document.getElementById("log");
const liveEl = document.getElementById("live");
const titleEl = document.getElementById("title");
const captionEl = document.getElementById("caption");
const resultBannerEl = document.getElementById("result-banner");
const resultEl = document.getElementById("result");
const finalScoreEl = document.getElementById("final-score");

const previous = new Map();

const labelOf = (side) => (side === "B" ? "Black" : "White");

const seatLabelOf = (side, view) => {
  const seat = view.seats?.[side];
  if (seat) {
    return `${seat.model} · ${seat.effort}`;
  }
  return view.players[side].model || "";
};

const fillSeat = (side, view) => {
  const player = view.players[side];
  document.getElementById(`name-${side}`).textContent = player.name;
  document.getElementById(`model-${side}`).textContent = seatLabelOf(side, view);
  document.getElementById(`score-${side}`).textContent = String(view.counts[side]);
  document.getElementById(`say-${side}`).textContent = player.say || "";
  const seat = document.getElementById(`seat-${side}`);
  const thinking = view.status === "playing" && view.thinking === side;
  const toMove = view.status === "playing" && view.turn === side;
  const won = view.status === "over" && view.winner === side;
  seat.classList.toggle("active", toMove || thinking);
  seat.classList.toggle("won", won);
  const mood = document.getElementById(`mood-${side}`);
  if (view.status === "over") {
    mood.textContent = view.winner === "draw" ? "Drawn" : won ? "Wins" : "Falls";
    return;
  }
  if (thinking) {
    mood.textContent = "Reading the board";
    return;
  }
  if (toMove) {
    mood.textContent = "To move";
    return;
  }
  mood.textContent = "Waiting";
};

const renderBoard = (view) => {
  boardEl.style.setProperty("--size", String(view.size));
  boardEl.replaceChildren();
  ranksEl.replaceChildren();
  filesEl.replaceChildren();
  const legal = new Set(view.legal);
  const last = view.lastMove?.move;
  for (let row = 0; row < view.size; row += 1) {
    const rank = document.createElement("span");
    rank.textContent = String(view.size - row);
    ranksEl.append(rank);
    const file = document.createElement("span");
    file.textContent = String.fromCharCode(97 + row);
    filesEl.append(file);
    for (let col = 0; col < view.size; col += 1) {
      const coord = `${String.fromCharCode(97 + col)}${view.size - row}`;
      const value = view.board[row][col];
      const cell = document.createElement("div");
      cell.className = "cell";
      if (coord === last) {
        cell.classList.add("last");
      }
      if (value === "B" || value === "W") {
        const stone = document.createElement("div");
        stone.className = `stone ${value}`;
        const prior = previous.get(coord);
        if (prior && prior !== value) {
          stone.classList.add("flip");
        }
        cell.append(stone);
        previous.set(coord, value);
      } else {
        previous.set(coord, ".");
        if (legal.has(coord)) {
          const hint = document.createElement("div");
          hint.className = "hint";
          cell.append(hint);
        }
      }
      boardEl.append(cell);
    }
  }
};

const renderLog = (view) => {
  logEl.replaceChildren();
  view.history.filter((entry) => entry.move !== "pass" || view.history.length <= 4).forEach((entry, index) => {
    const item = document.createElement("li");
    const mark = document.createElement("em");
    mark.textContent = `${index + 1}.`;
    item.append(mark, `${labelOf(entry.side)} ${entry.move}`);
    logEl.append(item);
  });
};

const render = (view) => {
  if (!view || view.error) {
    return;
  }
  titleEl.textContent = view.title;
  document.body.classList.toggle("finished", view.status === "over");
  fillSeat("B", view);
  fillSeat("W", view);
  renderBoard(view);
  renderLog(view);
  if (view.status === "over") {
    liveEl.className = "live over";
    liveEl.lastChild.textContent = " Final position";
    captionEl.textContent = view.winner === "draw" ? "The table is even" : `${labelOf(view.winner)} takes the table`;
    resultBannerEl.classList.remove("hidden");
    resultEl.textContent = view.winner === "draw" ? "Draw" : `${view.players[view.winner].name} wins`;
    finalScoreEl.textContent = `${view.counts.B} — ${view.counts.W}`;
    return;
  }
  resultBannerEl.classList.add("hidden");
  liveEl.className = "live";
  const mover = view.turn === "B" ? view.players.B.name : view.players.W.name;
  liveEl.lastChild.textContent = ` ${mover} to move`;
  captionEl.textContent = view.lastMove
    ? `${labelOf(view.lastMove.side)} played ${view.lastMove.move}`
    : "Opening position";
};

const pull = async () => {
  const response = await fetch("/api/state", { cache: "no-store" });
  if (!response.ok) {
    return;
  }
  render(await response.json());
};

const listen = () => {
  const source = new EventSource("/api/events");
  source.onmessage = (event) => {
    render(JSON.parse(event.data));
  };
  source.onerror = () => {
    source.close();
    window.setTimeout(listen, 1200);
  };
};

pull();
listen();
window.setInterval(pull, 2000);
