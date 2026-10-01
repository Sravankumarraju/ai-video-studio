import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const dir = 'data/productions/divine-wisdom/gita-1-1';
const episode = JSON.parse(await readFile(`${dir}/episode.json`, 'utf8'));
const state = JSON.parse(await readFile(`${dir}/state.json`, 'utf8'));
const only = process.argv[2];
const client = new Client({ name: 'divine-export-verification', version: '1' });
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'), { requestInit: { headers: { Authorization: `Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`, Connection: 'close' } } }));
function docker(...args) {
  const r = spawnSync('docker', ['compose', ...args], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  assert.equal(r.status, 0, r.stderr);
  return { output: r.stdout, diagnostics: r.stderr };
}
const norm = text => text.normalize('NFC').replace(/[\p{P}\p{S}\u200c\u200d]/gu, '').trim();
try {
  const response = await client.callTool({ name: 'get_project', arguments: { projectId: state.projectId } });
  assert(!response.isError);
  const project = JSON.parse(response.content.find(c => c.type === 'text').text);
  const reports = await readFile(`${dir}/verification.json`, 'utf8').then(JSON.parse).catch(e => { if (e.code !== 'ENOENT') throw e; return {}; });
  for (const [language, production] of Object.entries(state.languages)) {
    if (only && language !== only) continue;
    const file = `gita-1-1-${language}.mp4`;
    assert.equal(production.file, file, 'Full export must be downloaded first');
    const v = project.document.variants.find(v => v.id === production.variantId);
    assert.equal(v.titleOverlay, episode.languages[language].channel);
    assert.equal(v.sceneIds.length, 8);
    const scenes = v.sceneIds.map(id => v.sceneOverrides[id] || project.document.scenes.find(s => s.id === id));
    assert(scenes.every(s => !s.narrationStale && !s.captionsStale && s.audioId && s.assetId));
    assert.deepEqual(scenes.map(s => s.assetId), episode.sharedImages.map(name => state.images[name].assetId));
    assert.equal(scenes.map(s => s.narration).join('\n\n'), episode.languages[language].text.join('\n\n'));
    for (const s of scenes) {
      assert(s.captions.every(c => c.end > c.start && c.end <= s.duration + 0.001 && c.text.split('\n').length <= 2 && c.words.length <= 4));
      assert.deepEqual(s.captions.flatMap(c => c.words.map(w => norm(w.text))), s.narration.trim().split(/\s+/u).map(norm));
    }
    const container = `/app/test-output/${file}`;
    docker('cp', `${dir}/${file}`, `app:${container}`);
    const probe = JSON.parse(docker('exec', '-T', 'app', 'ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', container).output);
    const video = probe.streams.find(s => s.codec_type === 'video'), audio = probe.streams.find(s => s.codec_type === 'audio');
    assert.equal(video.width, 1080); assert.equal(video.height, 1920); assert.equal(video.codec_name, 'h264'); assert.equal(audio.codec_name, 'aac');
    assert(Math.abs(Number(probe.format.duration) - production.actualDuration) < 0.1);
    // Decode every frame and the full audio track; successful probing alone is insufficient.
    const decode = docker('exec', '-T', 'app', 'ffmpeg', '-hide_banner', '-threads', '2', '-i', container, '-af', 'volumedetect', '-f', 'null', '-');
    let start = 0;
    for (let section = 0; section < scenes.length; section++) {
      const s = scenes[section];
      if ([0, 3, 5].includes(section)) {
        const cue = s.captions[Math.floor(s.captions.length / 2)];
        const time = start + (cue.start + cue.end) / 2;
        const image = `gita-1-1-${language}-full-section-${section}.png`;
        docker('exec', '-T', 'app', 'ffmpeg', '-v', 'error', '-ss', String(time), '-i', container, '-frames:v', '1', '-y', `/app/test-output/${image}`);
        docker('cp', `app:/app/test-output/${image}`, `${dir}/${image}`);
      }
      start += s.duration;
    }
    reports[language] = { file, seconds: Number(probe.format.duration), bytes: Number(probe.format.size), width: video.width, height: video.height, videoCodec: video.codec_name, audioCodec: audio.codec_name, fullDecode: 'passed', sections: 8, sharedVisuals: true, captionWordsMatchReviewedScript: true, meanDb: Number(decode.diagnostics.match(/mean_volume: ([-\d.]+)/)?.[1]), peakDb: Number(decode.diagnostics.match(/max_volume: ([-\d.]+)/)?.[1]), pronunciationReview: 'not independently verified' };
    await writeFile(`${dir}/verification.json`, JSON.stringify(reports, null, 2));
    console.log(JSON.stringify({ language, ...reports[language] }));
  }
} finally { await client.close(); }
