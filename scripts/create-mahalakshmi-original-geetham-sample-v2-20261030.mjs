import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { credential, db } from './anjaneya-dandakam-audio.mjs';

const root = 'data/productions/divine-wisdom/mahalakshmi-original-geetham-sample-v2-2026-10-30';
const save = (name, value) => writeFile(`${root}/${name}.json`, JSON.stringify(value, null, 2));
const chunks = [
 'లక్ష్మీ తల్లీ మా ఇంట కొలువుండవే\nదీపాల వెలుగుల్లో దీవెనలు అందించవే',
 'నీ పాదాల చెంత పూలను ఉంచాము\nనిండు మనసుతో నిన్ను పిలిచాము',
];
const positive = [
 'Completely new original Telugu devotional bhajan melody for these newly authored lyrics, intimate graceful acoustic South Indian devotional music at a gentle steady 68 BPM',
 'Exactly one warm natural adult female solo singer with native Telugu accent; expressive but syllabic simple singing, comfortable middle register; same singer throughout',
 'Highest priority: clearly articulate every written Telugu syllable, natural word boundaries and vowel lengths. Lakshmee tallee, maa inta koluvundave, deepaala velugullo, deevenalu andinchave; nee paadaala chenta, poolanu unchaamu, nindu manasuto, ninnu pilichaamu. These roman spellings are diction guidance only; sing only the supplied Telugu lyrics',
 'Sing one clear note per syllable, very little ornamentation, natural short breath between phrases. Keep Telugu vowels stable and consonants fully audible. Gentle devotional feeling without dramatic runs or excessive long notes',
 'Foreground dry clean female vocal much louder than soft tanpura and occasional veena; minimal very quiet percussion, no instruments covering words',
 'Begin the first supplied line promptly, give each complete phrase enough time for clear speech-like syllables while remaining melodic, and resolve gently after the final word',
];
const request = {
  model_id: 'music_v2_5', with_timestamps: true, store_for_inpainting: true,
  composition_plan: { chunks: chunks.map(text => ({
    text, duration_ms: 16000, positive_styles: positive,
    negative_styles: ['male voice', 'choir', 'group vocals', 'vocal doubling', 'backing vocals', 'long gaps between lines', 'instrumental interludes', 'long introduction', 'long held final syllables', 'spoken narration', 'English lyrics', 'extra lyrics', 'rushed diction', 'heavy reverb', 'loud percussion', 'EDM', 'artist imitation', 'melismatic vocal runs', 'slurred Telugu', 'swallowed syllables', 'rapid gamakas', 'English pronunciation of Telugu', 'additional Sanskrit prayers'],
    context_adherence: 'high',
  })) },
};

async function parseAudio(record) {
  assert.equal(record.state, 'completed', 'Prior generation incomplete; inspect before retrying');
  const bytes = await readFile(`${root}/sample-response.bin`);
  const boundary = /boundary="?([^";\s]+)/i.exec(record.contentType || '')?.[1];
  if (!boundary && /audio\//i.test(record.contentType || '')) {
    await writeFile(`${root}/mahalakshmi-original-female-sample-v2.mp3`, bytes); return;
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
      else if (/audio\//i.test(header)) { await writeFile(`${root}/mahalakshmi-original-female-sample-v2.mp3`, body); found = true; }
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
  await save('source', {lyricsOrigin:'New Telugu devotional lyrics authored in this conversation for the user on 2026-10-30', scope:'Four newly written simple devotional Telugu lines inviting Lakshmi and offering flowers. Original devotional song; not a traditional stotram.', musicalArrangement:'New original melody and AI-generated female singer; no audio references, voice cloning, artist references or third-party recordings supplied', title:'శ్రీ మహాలక్ష్మి భక్తి గీతం'});
  await writeFile(`${root}/lyrics-te.txt`, chunks.join('\n\n') + '\n');
  const key = await credential();
  const headers = { 'xi-api-key': key };
  const subscription = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers, signal: AbortSignal.timeout(30000) });
  assert(subscription.ok, `Credential/subscription check failed (${subscription.status})`);
  const info = await subscription.json();
  const remaining = Number(info.character_limit) - Number(info.character_count);
  await save('credit-check', { tier: info.tier, remainingCredits: remaining, checkedAt: new Date().toISOString() });
  assert(info.tier !== 'free' && remaining >= 1500, 'Insufficient included credits for sample; stopped before generation');
  console.log(JSON.stringify({ stage: 'generating', seconds: 32, model: request.model_id, tier: info.tier, remainingCredits: remaining }));
  const record = { state: 'submitted', submittedAt: new Date().toISOString(), maximumCalls: 1,
    authorization: 'User rejected the first original sample because of lyrics or pronunciation. This revision uses four newly written simpler devotional lines and much clearer native Telugu syllabic singing. One 32-second revised music_v2_5 generation using included credits only; no blocked prayer lyrics or prior audio used, no topup, no publishing.',
    externalAudioReferenceUsed: false, requestedSeconds: 32, actualCharge: null };
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
    console.log(JSON.stringify({ state: 'completed', audio: `${root}/mahalakshmi-original-female-sample-v2.mp3`, bytes: bytes.length }));
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
