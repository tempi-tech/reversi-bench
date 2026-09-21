import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';
import { requestOf, choiceOf } from './jev-direct-choice.mjs';

const exec = promisify(execFile);
const arena = path.resolve(process.argv[2]);
const metadata = JSON.parse(fs.readFileSync(path.join(arena, 'run-metadata.json'), 'utf8'));
const side = metadata.jevSide ?? 'B';
assert.ok(['B', 'W'].includes(side));
const directory = side === 'B' ? metadata.blackDirectory : metadata.whiteDirectory;
const log = path.join(arena, 'jev-turns.jsonl');
const lock = fs.openSync(path.join(arena, 'jev-player.lock'), 'wx');
fs.writeSync(lock, String(process.pid));
const records = fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim() : '';
assert.equal(records, '', 'Refuse automatic resume; reconcile accepted moves and pending requests first.');
const append = record => fs.appendFileSync(log, JSON.stringify({ at: new Date().toISOString(), ...record }) + '\n');
const referee = async args => {
  const result = await exec('./referee', args, { cwd: directory, timeout: 150000, maxBuffer: 1024 * 1024 });
  const response = JSON.parse(result.stdout);
  append({ kind: 'referee', args, response });
  assert.equal(response.ok, true);
  return response;
};

try {
  for (const decision of Array.from({ length: 61 }, (_, i) => i + 1)) {
    const waitForTurn = async () => {
      const result = await referee(['wait']);
      return result.timeout ? waitForTurn() : result;
    };
    const state = await waitForTurn();
    if (state.data.status === 'over') break;
    assert.ok(decision <= 60);
    const request = requestOf({ data: state.data, side });
    append({ kind: 'request', decision, request });
    const started = Date.now();
    const result = await exec('/Users/yoishika/.agi-tools/bin/wings', [
      'run', '--file', metadata.jevHandlerPath,
      '--connection', 'jev=jev-main', '--event', JSON.stringify(request),
    ], { timeout: 180000, maxBuffer: 2 * 1024 * 1024 });
    const envelope = JSON.parse(result.stdout);
    append({ kind: 'response', decision, elapsedMs: Date.now() - started, envelope });
    const choice = choiceOf({ request, envelope });
    const played = await referee(['play', choice]);
    append({ kind: 'accepted', decision, choice });
    if (played.data.status === 'over') break;
  }
  append({ kind: 'complete' });
} catch (error) {
  append({ kind: 'error', message: error.message });
  await exec('/Users/yoishika/.agi-tools/bin/cockpit', ['task', 'send', '3049af90', '--text',
    'JEV pilot ' + metadata.game + ' stopped. Inspect jev-turns.jsonl and run-metadata.json. Do not silently retry a request or substitute a move/model. Do not start another game.']);
  process.exitCode = 1;
} finally {
  fs.closeSync(lock);
}
