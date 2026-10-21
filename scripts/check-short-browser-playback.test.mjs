import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';

const source = await readFile(new URL('./check-short-browser.mjs', import.meta.url), 'utf8');
const condition = source.match(/return (!v\.seeking[^?]+)\?\{requested:/)[1].replace('${point}', 'point');
const accepts = new Function('v', 'point', `return ${condition}`);

test('final seconds remain verified when command latency allows a natural end', () => {
  assert.equal(accepts({ seeking: false, paused: true, ended: true, currentTime: 38.74 }, 35.74), true);
});
test('paused, unadvanced or seeking playback is not accepted', () => {
  assert.equal(accepts({ seeking: false, paused: true, ended: false, currentTime: 36 }, 35), false);
  assert.equal(accepts({ seeking: false, paused: false, ended: false, currentTime: 35 }, 35), false);
  assert.equal(accepts({ seeking: true, paused: true, ended: true, currentTime: 38 }, 35), false);
});
