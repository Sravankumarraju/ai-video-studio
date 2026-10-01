import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const root = 'data/productions/divine-wisdom';
const episode = JSON.parse(await readFile(`${root}/gita-1-1/episode.json`, 'utf8'));
const state = JSON.parse(await readFile(`${root}/gita-1-1/state.json`, 'utf8'));
const catalogue = JSON.parse(await readFile('data/productions/bhagavad-gita-telugu/gita-verse-catalogue.json', 'utf8'));
const counts = catalogue.chapters.map(c => c.verses);
const references = counts.flatMap((count, i) => Array.from({ length: count }, (_, j) => `${i + 1}.${j + 1}`));
assert.equal(references.length, 701);
assert.equal(references[0], '1.1');
assert.equal(references[1], '1.2');
const playlists = Object.entries(episode.languages).map(([language, config]) => {
  const production = state.languages[language];
  const completed = Boolean(production.fullJobId && production.file === `gita-1-1-${language}.mp4`);
  return {
    channel: config.channel, language, name: 'Bhagavad Gita', projectId: state.projectId,
    numbering: catalogue.edition, targetSeconds: [180, 240], sections: episode.sections,
    scope: 'Ordered local production playlist. Not uploaded to a video platform. Remaining verses are planned references, not reviewed scripts or generated videos.',
    episodes: references.map((reference, index) => ({
      episode: index + 1, reference, status: index === 0 ? (completed ? 'exported' : 'script-prepared') : 'planned',
      ...(index === 0 ? { variantId: production.variantId, voiceId: config.voiceId, sources: episode.sources,
        actualSeconds: production.actualDuration, script: `gita-1-1/script-${language}.md`,
        ...(completed ? { video: `gita-1-1/${production.file}`, captions: `gita-1-1/gita-1-1-${language}.srt` } : {}) } : {}),
      nextReference: references[index + 1] ?? null,
    })),
  };
});
await writeFile(`${root}/playlists.json`, JSON.stringify({ created: '2026-10-01', playlists }, null, 2));
const first = catalogue.verses.find(v => v.reference === '1.1');
assert(first);
first.status = playlists.every(p => p.episodes[0].video) ? 'exported' : 'script-reviewed';
first.script = `${root}/gita-1-1/episode.json`;
first.languageEditions = Object.fromEntries(playlists.map(p => [p.language, p.episodes[0]]));
await writeFile('data/productions/bhagavad-gita-telugu/gita-verse-catalogue.json', JSON.stringify(catalogue, null, 2));
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
await writeFile(`${root}/playlist.html`, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Divine Wisdom — Bhagavad Gita</title><style>body{max-width:1080px;margin:auto;padding:28px;background:#111827;color:#f9fafb;font:18px/1.6 system-ui}section{border:1px solid #64748b;border-radius:16px;padding:24px;margin:24px 0}a{color:#93c5fd}video{width:100%;max-width:340px}summary{cursor:pointer}li{margin:6px 0}</style><h1>Divine Wisdom</h1><p>Bhagavad Gita, beginning at 1.1. Three language editions share the same visuals. Each episode includes welcome, overview, context, verse and meaning, explanation, example, conclusion and the next verse.</p><p>Target: 3–4 minutes with natural narration. This local playlist follows a 701-verse edition. Remaining episodes are planned; no platform publishing has occurred.</p>${playlists.map(p => `<section><h2>${escape(p.channel)}</h2><h3>001 · Bhagavad Gita 1.1</h3><p>${escape(p.episodes[0].status)}${p.episodes[0].actualSeconds ? ` · ${Math.round(p.episodes[0].actualSeconds)} seconds` : ''}</p><p><a href="${p.episodes[0].script}">Review script</a> · <a href="gita-1-1/image-prompts.json">Review shared image prompts</a></p>${p.episodes[0].video ? `<video controls preload="metadata" src="${p.episodes[0].video}"></video><p><a href="${p.episodes[0].video}" download>Download MP4</a> · <a href="${p.episodes[0].captions}" download>Download captions</a></p>` : ''}<p>Next: 002 · Bhagavad Gita 1.2</p><details><summary>Ordered production queue (701 references)</summary><ol>${p.episodes.map(e => `<li>Bhagavad Gita ${e.reference} — ${e.status}</li>`).join('')}</ol></details></section>`).join('')}<p><a href="playlists.json">Machine-readable playlist</a></p></html>`);
for (const p of playlists) {
  const finished = p.episodes.filter(e => e.video);
  await writeFile(`${root}/playlist-${p.language}.m3u8`, '#EXTM3U\n' + finished.map(e => `#EXTINF:${Math.round(e.actualSeconds)},${p.channel} — Bhagavad Gita ${e.reference}\n${e.video}\n`).join(''));
}
console.log(JSON.stringify({ channels: playlists.map(p => p.channel), references: references.length, exported: playlists.map(p => p.episodes.filter(e => e.video).length) }));
