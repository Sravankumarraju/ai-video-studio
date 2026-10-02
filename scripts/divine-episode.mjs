// Divine Wisdom episode pipeline (Episode 002 onward). One project per episode.
// Usage: node scripts/divine-episode.mjs <episode-dir> <prepare|generate|assemble|drafts|fulls|status|download> [te|hi|en]
// Paid calls happen only in `generate`; every job ID is saved in state.json before waiting,
// so a rerun resumes instead of paying again.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { readFile, writeFile, stat, access, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';

const [dir, mode = 'status', only] = process.argv.slice(2);
if (!dir) throw Error('Usage: divine-episode.mjs <episode-dir> <mode> [language]');
if (only && !['te', 'hi', 'en'].includes(only)) throw Error('Unknown language');
const profileId = '7e994f10-1088-464c-91fb-79297b8fd6cb'; // encrypted ElevenLabs profile
const ep = JSON.parse(await readFile(`${dir}/episode.json`, 'utf8'));
const statePath = `${dir}/state.json`;
const state = await readFile(statePath, 'utf8').then(JSON.parse).catch(e => { if (e.code !== 'ENOENT') throw e; return { languages: {}, images: {} }; });
const save = () => writeFile(statePath, JSON.stringify(state, null, 2));
const token = process.env.STORY_STUDIO_MCP_TOKEN;
if (!token) throw Error('Set STORY_STUDIO_MCP_TOKEN in this shell');
const client = new Client({ name: `divine-${ep.slug}`, version: '1.0' });
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'), { requestInit: { headers: { Authorization: `Bearer ${token}`, Connection: 'close' } } }));
async function call(name, args) { const r = await client.callTool({ name, arguments: args }); const t = r.content.find(c => c.type === 'text')?.text; if (r.isError) throw Error(`${name}: ${t}`); return JSON.parse(t); }
const ff = (args) => execFileSync(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-v', 'error', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
const probeDuration = (file) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).trim());
const exists = (f) => access(f).then(() => true, () => false);
const languages = Object.keys(ep.languages).filter(l => !only || l === only);
const ref = `${ep.chapter}.${ep.verse}`;

// Same chunking as Episode 001: whole sections, at most 1,000 characters per narration request.
function packs(texts) {
  const out = [];
  texts.forEach((t, i) => { assert(t.length <= 1000, `Section ${i} exceeds 1,000 characters`); const last = out.at(-1); if (last && (last.text + '\n\n' + t).length <= 1000) { last.text += '\n\n' + t; last.sections.push(i); } else out.push({ text: t, sections: [i] }); });
  return out;
}
// At most two lines and four words per cue, whole words, grapheme-aware line limits.
function readableCaptions(words, language, duration) {
  const seg = new Intl.Segmenter(language, { granularity: 'grapheme' }), limit = { te: 18, hi: 20, en: 28 }[language];
  const length = t => Array.from(seg.segment(t)).length, out = [];
  let group = [], lines = [''];
  const flush = () => { if (!group.length) return; out.push({ id: crypto.randomUUID(), start: group[0].start, end: group.at(-1).end, text: lines.join('\n'), accuracy: 'aligned', words: group }); group = []; lines = ['']; };
  for (const word of words) {
    const next = [...lines], i = next.length - 1, t = next[i] ? `${next[i]} ${word.text}` : word.text;
    if (length(t) > limit && next[i]) next.push(word.text); else next[i] = t;
    if (next.length > 2 || group.length >= 4) { flush(); lines = [word.text]; } else lines = next;
    group.push(word);
    if (/[.!?।]$/u.test(word.text)) flush();
  }
  flush();
  for (let i = 0; i < out.length; i++) { out[i].end = Math.min(duration, out[i + 1]?.start ?? duration, out[i].end + 0.2); assert(out[i].end > out[i].start); }
  assert.deepEqual(out.flatMap(c => c.words.map(w => w.text)), words.map(w => w.text));
  return out;
}
const normalize = t => t.normalize('NFC').replace(/[\p{P}\p{S}‌‍]/gu, '').trim();

try {
  if (mode === 'prepare') {
    if (!state.projectId) {
      const te = ep.languages.te;
      const document = {
        title: `Divine Wisdom · Bhagavad Gita ${ref}`, topic: `Bhagavad Gita chapter ${ep.chapter}, verse ${ep.verse}`,
        category: 'Spiritual education', language: 'te', subtitleLanguage: 'te', mode: 'manual', reviewCheckpoints: true,
        targetDuration: ep.targetSeconds, style: 'Respectful devotional Indian painting; gold and indigo; cinematic compositions',
        audience: 'Telugu, Hindi and English general audience', sourceClassification: 'traditional',
        sources: `Divine Wisdom playlist episode ${String(ep.episode).padStart(3, '0')} = BG ${ref}; next BG ${ep.nextReference}. ${ep.sources.join(' ; ')}\n${ep.interpretationNote}`,
        pronunciation: 'భగవద్గీత; దుర్యోధనుడు; ద్రోణాచార్యుడు; సంజయుడు; వ్యూఢం; పాండవానీకం',
        script: te.text.join('\n\n'), providers: { voice: profileId },
        budget: 10, generationLimit: 50, unknownCostPolicy: 'block',
      };
      const p = await call('create_project', { document });
      state.projectId = p.id; await save();
      console.log(JSON.stringify({ created: p.id }));
    }
    let p = await call('get_project', { projectId: state.projectId });
    for (const [language, config] of Object.entries(ep.languages)) {
      state.languages[language] ??= { batches: packs(config.text).map((b, i) => ({ ...b, id: `${ep.slug}-${language}-source-${i + 1}` })), jobs: {} };
      for (const batch of state.languages[language].batches) {
        if (p.document.scenes.some(s => s.id === batch.id)) continue;
        p.document.scenes.push({ id: batch.id, title: `${config.channel} · source narration ${batch.sections.join('+')}`, narration: batch.text, duration: 150, voiceId: config.voiceId, providers: { voice: profileId }, modes: { voice: 'api' }, status: 'Prepared narration batch' });
      }
      await writeFile(`${dir}/script-${language}.md`, `# ${config.channel} · Bhagavad Gita ${ref}\n\nSame eight sections and visuals in Telugu, Hindi and English. Verse in local script or transliteration; meanings, commentary notes and the modern example are explanations, not quotations.\n\nSources: ${ep.sources.join(' ; ')}\n\n` + config.text.map((t, i) => `## ${i}. ${config.titles[i]}\n\n${t}`).join('\n\n') + '\n');
    }
    await call('update_project', { projectId: state.projectId, expectedRevision: p.revision, document: p.document }); await save();
    console.log(JSON.stringify({ prepared: true, projectId: state.projectId, batches: Object.fromEntries(Object.entries(state.languages).map(([l, s]) => [l, s.batches.map(b => b.text.length)])) }));
  }

  if (mode === 'generate') {
    const projectId = state.projectId, initial = await call('get_project', { projectId });
    const original = { language: initial.document.language, subtitleLanguage: initial.document.subtitleLanguage };
    try {
      for (const language of languages) {
        const s = state.languages[language];
        let p = await call('get_project', { projectId });
        // The voice adapter validates the project language; switch it per edition and restore afterward.
        if (p.document.language !== language) { p.document.language = language; p.document.subtitleLanguage = language; await call('update_project', { projectId, expectedRevision: p.revision, document: p.document }); }
        for (const batch of s.batches) {
          p = await call('get_project', { projectId });
          if (p.document.scenes.find(x => x.id === batch.id).audioId) continue;
          let jobId = s.jobs[batch.id];
          if (!jobId) { jobId = (await call('queue_generation', { projectId, kind: 'voice', sceneId: batch.id, profileId, paidConfirmed: true })).id; s.jobs[batch.id] = jobId; await save(); }
          for (;;) { const j = await call('get_job', { jobId }); if (j.state === 'completed') break; if (['failed', 'cancelled', 'waiting-for-input'].includes(j.state)) throw Error(`${language} ${batch.id}: ${j.state}: ${j.error}`); await new Promise(r => setTimeout(r, 4000)); }
          console.log(JSON.stringify({ language, batch: batch.id, recorded: true }));
        }
      }
    } finally {
      const p = await call('get_project', { projectId });
      if (p.document.language !== original.language) { Object.assign(p.document, original); await call('update_project', { projectId, expectedRevision: p.revision, document: p.document }); }
    }
  }

  if (mode === 'assemble') {
    const projectId = state.projectId, work = path.join(dir, 'work');
    await mkdir(work, { recursive: true });
    let p = await call('get_project', { projectId });
    // 1. Visuals per shot: <name>.mp4 (video clip) wins over <name>.png; the vertical one is required.
    // Landscape is <name>-16x9.mp4/.png, otherwise a blurred-fill 16:9 composite of the vertical file.
    const pick = async (base) => (await exists(`${base}.mp4`)) ? `${base}.mp4` : (await exists(`${base}.png`)) ? `${base}.png` : undefined;
    const sources = {};
    for (const name of ep.shots.flat()) { const f = ep.reusedImages[name] ? path.join(dir, ep.reusedImages[name]) : await pick(`${dir}/${name}`); if (f && await exists(f)) sources[name] = f; }
    // The first visual of each section is required; missing optional visuals are dropped.
    const missing = ep.shots.map(sec => sec[0]).filter(n => !sources[n]);
    if (missing.length) throw Error(`Missing required visuals in ${dir}: ${missing.join(', ')} (.png or .mp4). See IMAGE-PROMPTS.md`);
    const plan = ep.shots.map(sec => sec.filter(n => sources[n]));
    const names = [...new Set(plan.flat())];
    console.log(JSON.stringify({ shots: names.length, skippedOptional: ep.shots.flat().filter(n => !sources[n]) }));
    const isVideo = f => f.endsWith('.mp4');
    // MCP imports are capped near 8 MiB: large stills become JPEG, large clips are re-encoded silent H.264.
    const upload = async (file, name) => {
      const existing = p.assets.find(a => a.name === name); if (existing) return existing.id;
      let send = file;
      if ((await stat(file)).size > 7 * 1024 * 1024) {
        send = path.join(work, `${path.parse(name).name}-upload.${isVideo(file) ? 'mp4' : 'jpg'}`);
        ff(isVideo(file) ? ['-y', '-i', file, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', send] : ['-y', '-i', file, '-q:v', '2', send]);
        if ((await stat(send)).size > 7.5 * 1024 * 1024) throw Error(`${path.basename(file)} is still too large after compression; trim it or lower its resolution`);
      }
      return (await call('import_asset', { projectId, name, base64: (await readFile(send)).toString('base64') })).id;
    };
    for (const name of names) {
      const vertical = sources[name];
      let landscape = await pick(`${dir}/${name}-16x9`), derived = false;
      if (!landscape) {
        derived = true;
        landscape = path.join(work, `${name}-16x9-fill.${isVideo(vertical) ? 'mp4' : 'jpg'}`);
        const fill = '[0]scale=2560:1440:force_original_aspect_ratio=increase,crop=2560:1440,boxblur=40:3,eq=brightness=-0.18:saturation=0.85[bg];[0]scale=-2:1440[fg];[bg][fg]overlay=(W-w)/2:0';
        ff(isVideo(vertical) ? ['-y', '-i', vertical, '-filter_complex', fill.replace(/2560:1440/g, '1920:1080').replace('-2:1440', '-2:1080'), '-an', '-c:v', 'libx264', '-crf', '22', '-pix_fmt', 'yuv420p', landscape] : ['-y', '-i', vertical, '-filter_complex', fill, '-q:v', '2', landscape]);
      }
      state.images[name] = { vertical: await upload(vertical, `${name}${path.extname(vertical)}`), verticalKind: isVideo(vertical) ? 'video' : 'image',
        landscape: await upload(landscape, path.basename(landscape)), landscapeKind: isVideo(landscape) ? 'video' : 'image', derivedLandscape: derived };
      p = await call('get_project', { projectId });
    }
    await save();
    // 2. Cut each recorded batch into sections and shots at word boundaries, with the Episode 001 voice finishing.
    const scenes = [], variants = [], motions = ['zoom-in', 'pan-left', 'zoom-out', 'pan-right'];
    let shotIndex = 0;
    for (const language of languages) {
      const s = state.languages[language], config = ep.languages[language];
      if (p.document.variants.some(v => v.id === `${ep.slug}-${language}`)) { console.log(JSON.stringify({ language, assembled: 'already' })); continue; }
      const sections = new Map();
      for (const batch of s.batches) {
        const recorded = p.document.scenes.find(x => x.id === batch.id); assert(recorded?.audioId, `${batch.id} has no recording; run generate`);
        const asset = p.assets.find(a => a.id === recorded.audioId); assert(asset?.duration);
        const raw = path.join(work, `${batch.id}.mp3`);
        if (!(await exists(raw))) { const r = await fetch(`http://localhost:3000/api/mcp/files/assets/${asset.id}`, { headers: { Authorization: `Bearer ${token}`, Connection: 'close' } }); assert(r.ok, 'Cannot download narration'); await writeFile(raw, Buffer.from(await r.arrayBuffer())); }
        const words = recorded.captions.flatMap(c => c.words || []);
        let offset = 0;
        const ranges = batch.sections.map(section => { const expected = config.text[section].trim().split(/\s+/u), chosen = words.slice(offset, offset + expected.length); assert.deepEqual(chosen.map(w => normalize(w.text)), expected.map(normalize), `${language} section ${section}: aligned words differ from the script`); offset += expected.length; return { section, words: chosen }; });
        assert.equal(offset, words.length, `${batch.id}: recording has extra words`);
        const bounds = ranges.map((r, i) => i ? (ranges[i - 1].words.at(-1).end + r.words[0].start) / 2 : 0); bounds.push(asset.duration);
        ranges.forEach((r, i) => sections.set(r.section, { words: r.words, start: bounds[i], end: bounds[i + 1], raw, sourceAssetId: asset.id }));
      }
      assert.equal(sections.size, ep.sections.length);
      const ordered = [];
      for (let section = 0; section < ep.sections.length; section++) {
        const sec = sections.get(section), images = plan[section];
        // Split a section into equal-time shots, cutting in the pause between two words.
        const cuts = [sec.start];
        for (let k = 1; k < images.length; k++) {
          const target = sec.start + (sec.end - sec.start) * k / images.length;
          let best = 1; for (let w = 1; w < sec.words.length; w++) if (Math.abs(sec.words[w].start - target) < Math.abs(sec.words[best].start - target)) best = w;
          cuts.push((sec.words[best - 1].end + sec.words[best].start) / 2);
        }
        cuts.push(sec.end);
        for (let k = 0; k < images.length; k++) {
          const start = cuts[k], end = cuts[k + 1], duration = end - start, id = `${ep.slug}-${language}-s${section}-${k + 1}`;
          assert(duration >= 1, `${id} is too short`);
          const wav = path.join(work, `${id}.wav`);
          ff(['-y', '-i', sec.raw, '-af', `atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS,rubberband=tempo=1:pitch=1.0293022366:formant=preserved:pitchq=quality,bass=g=3:f=120:w=0.7,apad,atrim=duration=${duration},asetpts=PTS-STARTPTS`, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
          assert(Math.abs(probeDuration(wav) - duration) < 0.03, `${id}: sliced audio length mismatch`);
          const audioId = p.assets.find(a => a.name === `${id}.wav`)?.id || (await call('import_asset', { projectId, name: `${id}.wav`, base64: (await readFile(wav)).toString('base64') })).id;
          const words = sec.words.filter(w => w.start >= start - 0.01 && w.end <= end + 0.01).map(w => ({ ...w, start: Math.max(0, w.start - start), end: Math.min(duration, w.end - start) }));
          const image = images[k];
          ordered.push({ id, title: `${config.titles[section]}${images.length > 1 ? ` · ${k + 1}/${images.length}` : ''}`, narration: words.map(w => w.text).join(' '),
            audioId, assetId: state.images[image].vertical, mediaType: state.images[image].verticalKind, shortClipPolicy: 'freeze', duration, captions: readableCaptions(words, language, duration), volume: 1.25,
            voiceId: config.voiceId, providers: { voice: profileId }, motion: motions[shotIndex++ % motions.length], strength: 0.06, transition: 'cut', overlap: 0,
            status: 'Assembled from reviewed narration', narrationStale: false, captionsStale: false,
            promptOverrides: { section: ep.sections[section], image, audioFinishing: JSON.stringify({ sourceAssetId: sec.sourceAssetId, trimStart: start, trimEnd: end, bassDb: 3, pitchSemitones: 0.5, tempo: 1, volume: 1.25 }) } });
        }
      }
      assert.deepEqual(ordered.flatMap(x => x.captions.flatMap(c => c.words.map(w => w.text))).map(normalize), config.text.join(' ').trim().split(/\s+/u).map(normalize), `${language}: captions differ from script`);
      scenes.push(...ordered);
      const seconds = ordered.reduce((n, x) => n + x.duration, 0);
      const base = { fps: 30, crf: 18, bitrate: '12M', captions: true, color: '#ffffff', outline: 3, background: true, position: 'bottom', wordHighlight: false, font: config.font, titleOverlay: config.channel, targetDuration: ep.targetSeconds, maxDuration: 600, framing: {} };
      variants.push({ ...base, id: `${ep.slug}-${language}`, name: `${config.channel} · Bhagavad Gita ${ref} · 9:16`, aspect: 'vertical', sceneIds: ordered.map(x => x.id), sceneOverrides: {}, fontSize: language === 'en' ? 37 : 42 });
      // 16:9 shares recordings and captions; only the picture changes, via per-version scene overrides.
      variants.push({ ...base, id: `${ep.slug}-${language}-16x9`, name: `${config.channel} · Bhagavad Gita ${ref} · 16:9`, aspect: 'landscape', sceneIds: ordered.map(x => x.id),
        sceneOverrides: Object.fromEntries(ordered.map(x => [x.id, { ...x, assetId: state.images[x.promptOverrides.image].landscape, mediaType: state.images[x.promptOverrides.image].landscapeKind }])), fontSize: language === 'en' ? 44 : 48 });
      s.actualSeconds = seconds;
      console.log(JSON.stringify({ language, seconds: Math.round(seconds * 10) / 10, shots: ordered.length }));
    }
    if (scenes.length) {
      p = await call('get_project', { projectId });
      p.document.scenes.push(...scenes); p.document.variants.push(...variants);
      await call('update_project', { projectId, expectedRevision: p.revision, document: p.document });
    }
    await save();
  }

  if (mode === 'drafts' || mode === 'fulls') {
    const key = mode === 'drafts' ? 'draftJobs' : 'fullJobs';
    const p = await call('get_project', { projectId: state.projectId });
    for (const language of languages) for (const suffix of ['', '-16x9']) {
      const variantId = `${ep.slug}-${language}${suffix}`; if (!p.document.variants.some(v => v.id === variantId)) throw Error(`${variantId} not assembled`);
      const s = state.languages[language]; s[key] ??= {};
      if (!s[key][variantId]) { s[key][variantId] = (await call('queue_render', { projectId: state.projectId, variantId, draft: mode === 'drafts' })).id; await save(); }
      console.log(JSON.stringify({ variantId, job: s[key][variantId] }));
    }
  }

  if (mode === 'status') {
    console.log(JSON.stringify({ projectId: state.projectId }));
    for (const language of languages) { const s = state.languages[language]; if (!s) continue;
      for (const [batch, jobId] of Object.entries(s.jobs || {})) { const j = await call('get_job', { jobId }); console.log(JSON.stringify({ language, batch, voice: j.state, error: j.error })); }
      for (const key of ['draftJobs', 'fullJobs']) for (const [variantId, jobId] of Object.entries(s[key] || {})) { const j = await call('get_job', { jobId }); console.log(JSON.stringify({ variantId, [key]: j.state, stage: j.stage, error: j.error })); } }
  }

  if (mode === 'download') {
    for (const language of languages) { const s = state.languages[language];
      for (const [variantId, jobId] of Object.entries({ ...(s.draftJobs || {}), ...(s.fullJobs || {}) })) {
        const draft = !s.fullJobs?.[variantId], j = await call('get_job', { jobId });
        if (!['completed', 'stale'].includes(j.state) || !j.result?.mp4Key) { console.log(JSON.stringify({ variantId, notReady: j.state })); continue; }
        const name = `${variantId}${draft ? '-draft' : ''}`;
        for (const format of ['mp4', 'srt', 'vtt']) { const r = await fetch(`http://localhost:3000/api/mcp/files/jobs/${jobId}/download?format=${format}`, { headers: { Authorization: `Bearer ${token}`, Connection: 'close' } }); if (!r.ok) throw Error(`Download HTTP ${r.status}`); await writeFile(`${dir}/${name}.${format}`, Buffer.from(await r.arrayBuffer())); }
        console.log(JSON.stringify({ variantId, file: `${name}.mp4`, seconds: j.result.duration, size: `${j.result.width}x${j.result.height}` }));
      } }
  }
} finally { await client.close(); }
