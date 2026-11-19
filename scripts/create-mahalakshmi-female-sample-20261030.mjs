import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { credential, db } from './anjaneya-dandakam-audio.mjs';

const root = 'data/productions/divine-wisdom/mahalakshmi-mala-sample-2026-10-30';
const save = (name, value) => writeFile(`${root}/${name}.json`, JSON.stringify(value, null, 2));
const chunks = [
  'నమస్తేఽస్తు మహామాయే శ్రీపీఠే సురపూజితే\nశంఖచక్రగదాహస్తే మహాలక్ష్మి నమోఽస్తు తే',
  'నమస్తే గరుడారూఢే కోలాసురభయంకరి\nసర్వపాపహరే దేవి మహాలక్ష్మి నమోఽస్తు తే',
];
const positive = [
  'Original South Indian devotional musical setting of Sri Mahalakshmi Ashtakam, graceful auspicious female sung stotram, gentle lilting 72 BPM',
  'Exactly ONE natural warm adult FEMALE solo singer, clear sweet middle register, intimate reverent delivery consistent throughout',
  'Precise Sanskrit diction sung from Telugu script, every supplied syllable fully audible in exact order; namastestu mahaamaaye, shreepeethe surapoojite, shankha chakra gadaahaste, mahaalakshmi namostute',
  'Prominent clean solo vocal, soft tanpura drone, delicate veena, restrained bamboo flute and very gentle mridangam',
  'Begin first lyric within one second, flowing devotional melody, natural brief breaths between phrases, restrained ornamentation and gentle resolution after final supplied syllable',
];
const request = {
  model_id: 'music_v2_5', with_timestamps: true, store_for_inpainting: true,
  composition_plan: { chunks: chunks.map(text => ({
    text, duration_ms: 20000, positive_styles: positive,
    negative_styles: ['male voice', 'choir', 'group vocals', 'vocal doubling', 'backing vocals', 'long gaps between lines', 'instrumental interludes', 'long introduction', 'long held final syllables', 'spoken narration', 'English lyrics', 'extra lyrics', 'rushed diction', 'heavy reverb', 'loud percussion', 'EDM', 'artist imitation'],
    context_adherence: 'high',
  })) },
};

async function parseAudio(record) {
  assert.equal(record.state, 'completed', 'Prior generation incomplete; inspect before retrying');
  const bytes = await readFile(`${root}/sample-response.bin`);
  const boundary = /boundary="?([^";\s]+)/i.exec(record.contentType || '')?.[1];
  if (!boundary && /audio\//i.test(record.contentType || '')) {
    await writeFile(`${root}/mahalakshmi-female-sample.mp3`, bytes); return;
  }
  assert(boundary, 'Missing multipart boundary');
  const marker = Buffer.from('--' + boundary); let position = bytes.indexOf(marker), found = false;
  while (position >= 0) {
    const next = bytes.indexOf(marker, position + marker.length); if (next < 0) break;
    const part = bytes.subarray(position + marker.length, next);
    const split = part.indexOf(Buffer.from('\r\n\r\n'));
    if (split >= 0) {
      const header = part.subarray(0, split).toString(); let body = part.subarray(split + 4);
      if (body.subarray(-2).toString() === '\r\n') body = body.subarray(0, -2);
      if (/application\/json/i.test(header)) await save('sample-metadata', JSON.parse(body.toString()));
      else if (/audio\//i.test(header)) { await writeFile(`${root}/mahalakshmi-female-sample.mp3`, body); found = true; }
    }
    position = next;
  }
  assert(found, 'Missing audio part');
}

async function main() {
  await mkdir(root, { recursive: true });
  const previous = await readFile(`${root}/sample-attempt.json`, 'utf8').then(JSON.parse).catch(error => {
    if (error.code === 'ENOENT') return null; throw error;
  });
  if (previous) { await parseAudio(previous); console.log('Recovered existing sample; no new generation'); return; }
  await save('request', request);
  await save('source', {url:'https://stotranidhi.com/mahalakshmi-ashtakam-in-telugu/', scope:'Traditional Mahalakshmi Ashtakam verses 1 and 2 only. Opening sample for the proposed Mahalakshmi stotra mala; Kanakadhara and Ashtalakshmi not included in sample.', musicalArrangement:'New original female sung generation; no source audio supplied'});
  await writeFile(`${root}/lyrics-te.txt`, chunks.join('\n\n') + '\n');
  const key = await credential();
  const headers = { 'xi-api-key': key };
  const subscription = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers, signal: AbortSignal.timeout(30000) });
  assert(subscription.ok, `Credential/subscription check failed (${subscription.status})`);
  const info = await subscription.json();
  const remaining = Number(info.character_limit) - Number(info.character_count);
  await save('credit-check', { tier: info.tier, remainingCredits: remaining, checkedAt: new Date().toISOString() });
  assert(info.tier !== 'free' && remaining >= 1500, 'Insufficient included credits for sample; stopped before generation');
  console.log(JSON.stringify({ stage: 'generating', seconds: 40, model: request.model_id, tier: info.tier, remainingCredits: remaining }));
  const record = { state: 'submitted', submittedAt: new Date().toISOString(), maximumCalls: 1,
    authorization: 'User requested a sample of Sri Mahalakshmi Stotra Mala and specified female sung generation with ElevenLabs Music music_v2_5. One 40-second original generation using included credits; no automatic retries, topups, full production or publishing.',
    externalAudioReferenceUsed: false, requestedSeconds: 40, actualCharge: null };
  await save('sample-attempt', record);
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/music/detailed?output_format=mp3_48000_192', {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(request), signal: AbortSignal.timeout(900000),
    });
    record.httpStatus = response.status; record.contentType = response.headers.get('content-type');
    record.songId = response.headers.get('song-id');
    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      await save('provider-error', problem); record.state = 'rejected';
      record.reason = problem.detail?.status || 'provider_rejected';
      await save('sample-attempt', record);
      throw new Error(`Provider rejected sample (${response.status}, ${record.reason}); no automatic retry`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(`${root}/sample-response.bin`, bytes);
    record.state = 'completed'; record.bytes = bytes.length; record.completedAt = new Date().toISOString();
    await save('sample-attempt', record); await parseAudio(record);
    const after = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers, signal: AbortSignal.timeout(30000) });
    if (after.ok) {
      const balance = await after.json();
      await save('credit-after', { remainingCredits: Number(balance.character_limit) - Number(balance.character_count),
        accountCreditDifference: Number(balance.character_count) - Number(info.character_count),
        note: 'Account balance difference may include other concurrent usage.' });
    }
    console.log(JSON.stringify({ state: 'completed', audio: `${root}/mahalakshmi-female-sample.mp3`, bytes: bytes.length }));
  } catch (error) {
    if (record.state === 'submitted') { record.state = 'unknown'; await save('sample-attempt', record); }
    throw error;
  }
}
main().catch(error => {
  console.error(error instanceof assert.AssertionError || error.message?.startsWith('Provider rejected')
    ? error.message : 'Sample stopped; inspect saved attempt. Credentials suppressed.');
  process.exitCode = 1;
}).finally(() => db.$disconnect());
