import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { credential, db } from './anjaneya-dandakam-audio.mjs';

const root = 'data/productions/divine-wisdom/govinda-namalu-sample-2026-10-20';
const save = (name, value) => writeFile(`${root}/${name}.json`, JSON.stringify(value, null, 2));
const chunks = [
  'శ్రీనివాసా గోవిందా\nశ్రీ వేంకటేశా గోవిందా\nభక్తవత్సలా గోవిందా\nభాగవతప్రియా గోవిందా',
  'నిత్యనిర్మలా గోవిందా\nనీలమేఘశ్యామా గోవిందా\nపురాణపురుషా గోవిందా\nపుండరీకాక్షా గోవిందా',
  'గోవిందా గోవిందా\nగోకులనందనా గోవిందా\nశ్రీనివాసా గోవిందా\nశ్రీ వేంకటేశా గోవిందా',
];
const positive = [
  'Traditional Telugu Govinda Namalu devotional group chanting dedicated to Lord Venkateswara; original simple repeating bhajan melody, steady unhurried 74 BPM',
  'Small ensemble of natural warm adult voices chanting melodically together in tight unison throughout; consistent group vocal identity',
  'Precise native Telugu pronunciation, every supplied name sung distinctly and completely in exact order, clear synchronized syllables and natural word boundaries',
  'Peaceful reverent South Indian temple atmosphere; close prominent intelligible ensemble vocals over quiet tanpura drone, gentle mridangam and soft hand cymbals',
  'Restrained ornamentation, light room ambience, short natural breaths; brief gentle musical resolution after the final name',
];
const request = {
  model_id: 'music_v2_5', with_timestamps: true, store_for_inpainting: true,
  composition_plan: { chunks: chunks.map(text => ({
    text, duration_ms: 16000, positive_styles: positive,
    negative_styles: ['solo lead', 'spoken narration', 'English lyrics', 'extra lyrics', 'rushed diction', 'heavy reverb', 'loud percussion', 'EDM', 'artist imitation'],
    context_adherence: 'high',
  })) },
};

async function parseAudio(record) {
  assert.equal(record.state, 'completed', 'Prior generation incomplete; inspect before retrying');
  const bytes = await readFile(`${root}/sample-response.bin`);
  const boundary = /boundary="?([^";\s]+)/i.exec(record.contentType || '')?.[1];
  if (!boundary && /audio\//i.test(record.contentType || '')) {
    await writeFile(`${root}/govinda-group-sample.mp3`, bytes); return;
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
      else if (/audio\//i.test(header)) { await writeFile(`${root}/govinda-group-sample.mp3`, body); found = true; }
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
  await writeFile(`${root}/lyrics-te.txt`, chunks.join('\n\n') + '\n');
  const key = await credential();
  const headers = { 'xi-api-key': key };
  const subscription = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers, signal: AbortSignal.timeout(30000) });
  assert(subscription.ok, `Credential/subscription check failed (${subscription.status})`);
  const info = await subscription.json();
  const remaining = Number(info.character_limit) - Number(info.character_count);
  await save('credit-check', { tier: info.tier, remainingCredits: remaining, checkedAt: new Date().toISOString() });
  assert(info.tier !== 'free' && remaining >= 10000, 'Insufficient included credits for sample; stopped before generation');
  console.log(JSON.stringify({ stage: 'generating', seconds: 48, model: request.model_id, tier: info.tier, remainingCredits: remaining }));
  const record = { state: 'submitted', submittedAt: new Date().toISOString(), maximumCalls: 1,
    authorization: 'User requested a sample of Telugu Govinda Namalu, group chanting, using the existing project ElevenLabs key.',
    externalAudioReferenceUsed: false, requestedSeconds: 48, actualCharge: null };
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
    console.log(JSON.stringify({ state: 'completed', audio: `${root}/govinda-group-sample.mp3`, bytes: bytes.length }));
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
