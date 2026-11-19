import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { credential, db } from './anjaneya-dandakam-audio.mjs';

const root = 'data/productions/divine-wisdom/garuda-gamana-tava-audio-v3b-2026-10-28';
const save = (name, value) => writeFile(`${root}/${name}.json`, JSON.stringify(value, null, 2));
const approved = JSON.parse(await readFile('data/productions/divine-wisdom/garuda-gamana-tava-audio-v3-2026-10-28/own-reference.json','utf8'));
assert.equal(approved.state,'completed');assert(approved.songId);
const chunks = ['गरुडगमन तव चरणकमलमिह\nमनसि लसतु मम नित्यम्\nमम तापमपाकुरु देव\nमम पापमपाकुरु देव'];
const request = {
  model_id:'music_v2_5',with_timestamps:true,store_for_inpainting:true,
  composition_plan:{chunks:[{
    text:chunks[0],duration_ms:24000,
    conditioning_ref:{song_id:approved.songId,range:{start_ms:1000,end_ms:22000}},condition_strength:'medium',
    positive_styles:[
      'South Indian classical devotional female singing, a flowing lyrical Vishnu stotra with a clear memorable rising-and-resolving melodic refrain',
      'Use the supplied OWN GENERATED audio as the female vocal timbre reference. One clear natural mature female solo voice, centered resonant mid-register, confident devotional projection',
      'Sing the supplied Sanskrit exactly and in order with precise classical diction, long aa in taapam and paapam, long uu in apaakuru, short vowels in manasi lasatu, clearly articulated consonants and clean word endings',
      'Connected complete musical phrases: garuda-gamana tava charana-kamalam-iha; manasi lasatu mama nityam; mama taapam apaakuru deva; mama paapam apaakuru deva. All these guide syllables refer only to the supplied lyrics',
      'One consistent melodic mode and acoustic arrangement throughout; restrained graceful gamaka, gentle note slides, warm sustained vowel endings with natural breaths at line boundaries',
      'Soft continuous tanpura, quiet veena, restrained mridangam and light cymbals; instruments support the voice and leave clear space for every sung word',
      'Begin singing within one second, devote about five seconds to each complete lyric line, resolve the final note gently; new original melody, no additional invocation'
    ],
    negative_styles:['speech','plain recitation','flat monotone chant','word-by-word pauses','western pop','operatic vibrato','thin breathy synthetic voice','slurred syllables','Hindi schwa insertion','duet','choir','vocal doubling','extra words','repeated lyrics','long instrumental introduction','dramatic percussion','artist impersonation'],context_adherence:'high'
  }]}
};

async function parseAudio(record) {
  assert.equal(record.state, 'completed', 'Prior generation incomplete; inspect before retrying');
  const bytes = await readFile(`${root}/sample-response.bin`);
  const boundary = /boundary="?([^";\s]+)/i.exec(record.contentType || '')?.[1];
  if (!boundary && /audio\//i.test(record.contentType || '')) {
    await writeFile(`${root}/garuda-gamana-tava-sample.mp3`, bytes); return;
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
      else if (/audio\//i.test(header)) { await writeFile(`${root}/garuda-gamana-tava-sample.mp3`, body); found = true; }
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
  await save('source', {url:'https://www.sampradayavidya.org/our-syllabus/Track5/garudagamanatava', composer:'Jagadguru Sri Bharati Tirtha Swamiji', scope:'Opening refrain only; Sanskrit Devanagari input; audio-only pronunciation and musical test', musicalArrangement:'New original generation; no source audio supplied', referenceVideo:'https://www.youtube.com/watch?v=dMZ-1gMiIEY'});
  await writeFile(`${root}/lyrics-sa.txt`, chunks.join('\n\n') + '\n');
  const key = await credential();
  const headers = { 'xi-api-key': key };
  const subscription = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers, signal: AbortSignal.timeout(30000) });
  assert(subscription.ok, `Credential/subscription check failed (${subscription.status})`);
  const info = await subscription.json();
  const remaining = Number(info.character_limit) - Number(info.character_count);
  await save('credit-check', { tier: info.tier, remainingCredits: remaining, checkedAt: new Date().toISOString() });
  assert(info.tier !== 'free' && remaining >= 10000, 'Insufficient included credits for sample; stopped before generation');
  console.log(JSON.stringify({ stage: 'generating', seconds: 24, model: request.model_id, tier: info.tier, remainingCredits: remaining }));
  const record = { state: 'submitted', submittedAt: new Date().toISOString(), maximumCalls: 1,
    authorization: 'User requested Garuda Gamana Tava in our own channel style, sample first. User rejected voice, tune, and pronunciation of both prior samples and authorized ElevenLabs. One revised 24-second audio-only test, using own approved Govinda female vocal reference and Sanskrit-script pronunciation; included credits only, no video or publishing.',
    externalAudioReferenceUsed: false, requestedSeconds: 24, actualCharge: null };
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
    console.log(JSON.stringify({ state: 'completed', audio: `${root}/garuda-gamana-tava-sample.mp3`, bytes: bytes.length }));
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
