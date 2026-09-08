import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixture = (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "reversi-confidence-test-"));
  fs.copyFileSync(path.join(root, "reversi.mjs"), path.join(directory, "reversi.mjs"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const run = (...args) => {
    const result = spawnSync(process.execPath, [path.join(directory, "reversi.mjs"), ...args, "--json"], { encoding: "utf8" });
    return { status: result.status, ...JSON.parse(result.stdout) };
  };
  const read = () => JSON.parse(fs.readFileSync(path.join(directory, "matches/current.json"), "utf8"));
  const raw = () => fs.readFileSync(path.join(directory, "matches/current.json"), "utf8");
  return { directory, run, read, raw };
};

const forecast = ["--win", "67.5", "--draw", "12.5", "--loss", "20"];
const advance = (f) => {
  const view = f.run("state").data;
  return f.run("play", view.legal[0], "--as", view.turn, ...(view.measurement?.required ? forecast : []));
};

test("legacy matches still play without confidence or protocol changes", (t) => {
  const f = fixture(t);
  assert.equal(f.run("new", "--size", "8").ok, true);
  assert.equal(f.read().protocol, undefined);
  assert.equal(advance(f).ok, true);
  const before = f.raw();
  const view = f.run("state").data;
  assert.equal(f.run("play", view.legal[0], "--as", view.turn, ...forecast).ok, false);
  assert.equal(f.raw(), before);
});

test("confidence starts exactly on played move 11 and never leaks through player I/O", (t) => {
  const f = fixture(t);
  assert.equal(f.run("new", "--size", "8", "--confidence-after", "10").ok, true);
  assert.equal(f.read().protocol.ranked, false);
  for (const index of Array.from({ length: 10 }, (_, i) => i)) {
    const view = f.run("state").data;
    assert.equal(view.measurement.nextPly, index + 1);
    assert.equal(view.measurement.required, false);
    assert.equal(advance(f).ok, true);
  }
  const view = f.run("state").data;
  assert.equal(view.measurement.nextPly, 11);
  assert.equal(view.measurement.required, true);
  const before = f.raw();
  assert.equal(f.run("play", view.legal[0], "--as", view.turn).ok, false);
  assert.equal(f.raw(), before);
  const response = advance(f);
  assert.equal(response.ok, true);
  assert.equal(JSON.stringify(response).includes('"confidence"'), false);
  assert.deepEqual(f.read().history.find((entry) => entry.ply === 11).confidence, { win: 67.5, draw: 12.5, loss: 20 });
  assert.equal(JSON.stringify(f.run("state")).includes('"confidence"'), false);
  assert.equal(JSON.stringify(f.run("wait", "--as", f.read().turn, "--timeout", "1")).includes('"confidence"'), false);
  const spectator = f.run("state", "--spectator").data;
  assert.deepEqual(spectator.history.find((entry) => entry.ply === 11).confidence, { win: 67.5, draw: 12.5, loss: 20 });
});

test("invalid, incomplete or premature confidence cannot mutate the match", (t) => {
  const f = fixture(t);
  assert.equal(f.run("new", "--size", "8", "--confidence-after", "0").ok, true);
  const view = f.run("state").data;
  const before = f.raw();
  for (const args of [
    [], ["--win", "70"], ["--win", "70", "--draw", "10", "--loss"],
    ["--win", "70", "--draw", "10", "--loss", "10"],
    ["--win", "NaN", "--draw", "0", "--loss", "100"],
    ["--win", "Infinity", "--draw", "0", "--loss", "0"],
    ["--win", "101", "--draw", "0", "--loss", "-1"],
    ["--win", "", "--draw", "0", "--loss", "100"],
  ]) {
    assert.equal(f.run("play", view.legal[0], "--as", view.turn, ...args).ok, false);
    assert.equal(f.raw(), before);
  }
  assert.equal(f.run("play", "a1", "--as", view.turn, ...forecast).ok, false);
  assert.equal(f.run("play", view.legal[0], "--as", "W", ...forecast).ok, false);
  assert.equal(f.raw(), before);
  assert.equal(f.run("new", "--size", "8", "--confidence-after", "10").ok, true);
  const opening = f.raw();
  assert.equal(f.run("play", "e3", "--as", "B", ...forecast).ok, false);
  assert.equal(f.raw(), opening);
});

test("full match, passes, retries and independent legacy replay preserve board and confidence", (t) => {
  const f = fixture(t);
  const replay = fixture(t);
  f.run("new", "--size", "8", "--confidence-after", "10");
  replay.run("new", "--size", "8");
  for (const step of Array.from({ length: 60 }, (_, i) => i)) {
    const view = f.run("state").data;
    if (view.status === "over") break;
    assert.equal(view.measurement.nextPly, step + 1);
    const move = view.legal[0];
    const args = ["play", move, "--as", view.turn, ...(view.measurement.required ? forecast : [])];
    assert.equal(f.run(...args).ok, true);
    assert.equal(replay.run("play", move, "--as", view.turn).ok, true);
    const accepted = f.raw();
    assert.equal(f.run(...args).ok, false);
    assert.equal(f.raw(), accepted);
  }
  const match = f.read();
  assert.equal(match.status, "over");
  assert.equal(f.run("state").data.measurement.required, false);
  assert.deepEqual(match.cells, replay.read().cells);
  assert.equal(match.winner, replay.read().winner);
  const projection = (value) => value.history.map(({ side, move, flips }) => ({ side, move, flips }));
  assert.deepEqual(projection(match), projection(replay.read()));
  assert.ok(match.history.some((entry) => entry.move === "pass"));
  const played = match.history.filter((entry) => entry.move !== "pass");
  assert.equal(match.history.filter((entry) => entry.confidence).length, played.length - 10);
  for (const [index, entry] of played.entries()) {
    assert.equal(Boolean(entry.confidence), index >= 10);
    if (entry.confidence) assert.equal(entry.ply, index + 1);
  }
  assert.ok(match.history.filter((entry) => entry.move === "pass").every((entry) => !entry.confidence));
});

test("invalid experimental setup is rejected", (t) => {
  const f = fixture(t);
  for (const value of ["-1", "1.5", "60", "NaN", ""]) {
    assert.equal(f.run("new", "--size", "8", "--confidence-after", value).ok, false);
  }
  assert.equal(f.run("new", "--size", "8", "--confidence-after").ok, false);
});

test("standings rejects experimental matches even if accidentally added to the ranked series", (t) => {
  const f = fixture(t);
  f.run("new", "--size", "8", "--confidence-after", "10");
  for (const file of ["standings.mjs", "reasoning-stats.mjs", "time-stats.mjs"]) {
    fs.copyFileSync(path.join(root, file), path.join(f.directory, file));
  }
  fs.mkdirSync(path.join(f.directory, "series"));
  fs.writeFileSync(path.join(f.directory, "series/s1.json"), JSON.stringify({ games: [{ id: "current" }] }));
  const result = spawnSync(process.execPath, [path.join(f.directory, "standings.mjs")], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Experimental unranked match must not enter/);
  assert.equal(fs.existsSync(path.join(f.directory, "standings.json")), false);
});

test("side-bound wrapper accepts forecasts but blocks side, ID and spectator overrides", (t) => {
  const f = fixture(t);
  f.run("new", "--size", "8", "--confidence-after", "0");
  const helper = path.join(f.directory, "referee");
  const template = fs.readFileSync(path.join(root, "prompts/referee-confidence.sh"), "utf8");
  fs.writeFileSync(helper, template.replace("__ARENA__", JSON.stringify(f.directory)).replace("__SIDE__", "B"));
  const run = (...args) => {
    const result = spawnSync("sh", [helper, ...args], { encoding: "utf8" });
    return JSON.parse(result.stdout);
  };
  const before = f.raw();
  for (const args of [
    ["state", "--spectator"], ["wait", "--spectator"],
    ["play", "e3", "--as", "W"], ["play", "e3", "--id", "other"],
    ["play", "e3", "--win", "50", "--draw", "20", "--spectator", "30"],
  ]) {
    assert.equal(run(...args).ok, false);
    assert.equal(f.raw(), before);
  }
  assert.equal(run("wait").data.measurement.required, true);
  assert.equal(run("play", "e3", ...forecast).ok, true);
  assert.equal(f.read().history[0].side, "B");
  assert.deepEqual(f.read().history[0].confidence, { win: 67.5, draw: 12.5, loss: 20 });
});
