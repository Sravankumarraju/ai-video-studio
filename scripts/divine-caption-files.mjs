import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir = 'data/productions/divine-wisdom/gita-1-1';
const episode = JSON.parse(await readFile(`${dir}/episode.json`, 'utf8'));
const state = JSON.parse(await readFile(`${dir}/state.json`, 'utf8'));
const norm = text => text.normalize('NFC').replace(/[\p{P}\p{S}\u200c\u200d]/gu, '').trim();
const seconds = value => { const [h,m,s] = value.replace(',', '.').split(':').map(Number); return h*3600+m*60+s; };
const results = [];
for (const [language, config] of Object.entries(episode.languages)) {
  const prefix = state.languages[language].file.replace(/\.mp4$/, '');
  for (const format of ['srt', 'vtt']) {
    const text = await readFile(`${dir}/${prefix}.${format}`, 'utf8');
    const cues = text.trim().split(/\r?\n\r?\n/u).map(b => b.split(/\r?\n/u)).filter(lines => lines[1]?.includes(' --> '));
    const words = cues.flatMap(lines => lines.slice(2).join(' ').trim().split(/\s+/u));
    assert.deepEqual(words.map(norm), config.text.join('\n\n').trim().split(/\s+/u).map(norm));
    let lastEnd = 0;
    for (const lines of cues) {
      const [start,end] = lines[1].split(' --> ').map(seconds);
      assert(start >= lastEnd - 0.001 && end > start);
      assert(end <= state.languages[language].actualDuration + 0.1);
      assert(lines.slice(2).length <= 2);
      lastEnd = end;
    }
    results.push({language, format, file:`${prefix}.${format}`, cues:cues.length, words:words.length, scriptMatch:true, timing:'passed', twoLineLimit:true});
  }
}
await writeFile(`${dir}/caption-file-verification.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
