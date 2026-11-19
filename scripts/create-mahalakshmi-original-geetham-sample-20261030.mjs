import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { credential, db } from './anjaneya-dandakam-audio.mjs';

const root = 'data/productions/divine-wisdom/mahalakshmi-original-geetham-sample-2026-10-30';
const save = (name, value) => writeFile(`${root}/${name}.json`, JSON.stringify(value, null, 2));
const chunks = [
 'మా ఇంటి దీపంలో నీ నవ్వు వెలగాలి\nమా మనసు తోటలో నీ దయ పూయాలి',
 'తామరల తల్లీ నీ చల్లని చూపులో\nచిన్న చిన్న ఆశలకు ధైర్యం దొరకాలి',
 'చేతిలో ఉన్నదే పంచుకునే మనసివ్వు\nచేరువైన వారిని ఆదరించే గుణమివ్వు',
 'లక్ష్మీ నీ సన్నిధి ప్రేమకు నిలయమై\nప్రతి ఉదయం మాలో మంచితనం మేల్కొనాలి',
];
const positive = [
 'Newly written Telugu devotional lyrics supplied for a completely original musical composition; gentle lilting South Indian acoustic devotional song at 76 BPM',
 'Exactly one original natural warm adult female solo singer, sweet expressive middle register, emotionally sincere and graceful, consistent vocal identity throughout',
 'Precise native Telugu diction, sing every supplied syllable in exact order, clear natural word boundaries and long vowels, no added or repeated lyrics',
 'Lead vocal clear and prominent above quiet veena, soft tanpura drone, delicate bamboo flute and restrained mridangam; rich warm acoustic recording with minimal reverb',
 'Start singing promptly within one second; flowing original melody, brief breaths at phrase endings, restrained ornamentation; resolve gently after the final supplied word',
];
const request = {
  model_id: 'music_v2_5', with_timestamps: true, store_for_inpainting: true,
  composition_plan: { chunks: chunks.map(text => ({
    text, duration_ms: 12000, positive_styles: positive,
    negative_styles: ['male voice', 'choir', 'group vocals', 'vocal doubling', 'backing vocals', 'long gaps between lines', 'instrumental interludes', 'long introduction', 'long held final syllables', 'spoken narration', 'English lyrics', 'extra lyrics', 'rushed diction', 'heavy reverb', 'loud percussion', 'EDM', 'artist imitation'],
    context_adherence: 'high',
  })) },
};

async function parseAudio(record) {
  assert.equal(record.state, 'completed', 'Prior generation incomplete; inspect before retrying');
  const bytes = await readFile(`${root}/sample-response.bin`);
  const boundary = /boundary="?([^";\s]+)/i.exec(record.contentType || '')?.[1];
  if (!boundary && /audio\//i.test(record.contentType || '')) {
    await writeFile(`${root}/mahalakshmi-original-female-sample.mp3`, bytes); return;
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
      else if (/audio\//i.test(header)) { await writeFile(`${root}/mahalakshmi-original-female-sample.mp3`, body); found = true; }
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
  await save('source', {lyricsOrigin:'New Telugu devotional lyrics authored in this conversation for the user on 2026-10-30', scope:'Eight newly written lines about kindness, sharing and the blessings of Lakshmi. Original devotional song; not a traditional stotram.', musicalArrangement:'New original melody and AI-generated female singer; no audio references, voice cloning, artist references or third-party recordings supplied', title:'శ్రీ మహాలక్ష్మి భక్తి గీతం'});
  await writeFile(`${root}/lyrics-te.txt`, chunks.join('\n\n') + '\n');
  const key = await credential();
  const headers = { 'xi-api-key': key };
  const subscription = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers, signal: AbortSignal.timeout(30000) });
  assert(subscription.ok, `Credential/subscription check failed (${subscription.status})`);
  const info = await subscription.json();
  const remaining = Number(info.character_limit) - Number(info.character_count);
  await save('credit-check', { tier: info.tier, remainingCredits: remaining, checkedAt: new Date().toISOString() });
  assert(info.tier !== 'free' && remaining >= 1500, 'Insufficient included credits for sample; stopped before generation');
  console.log(JSON.stringify({ stage: 'generating', seconds: 48, model: request.model_id, tier: info.tier, remainingCredits: remaining }));
  const record = { state: 'submitted', submittedAt: new Date().toISOString(), maximumCalls: 1,
    authorization: 'User approved creating a new original Telugu Mahalakshmi devotional song with newly written lyrics, original melody and an original female vocal, and asked to create and provide a sample. One 48-second music_v2_5 generation using included credits only; no blocked prayer lyrics or prior audio used, no topup, no publishing.',
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
    console.log(JSON.stringify({ state: 'completed', audio: `${root}/mahalakshmi-original-female-sample.mp3`, bytes: bytes.length }));
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
