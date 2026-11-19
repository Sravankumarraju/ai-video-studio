import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { credential, db } from './anjaneya-dandakam-audio.mjs';

const root = 'data/productions/divine-wisdom/garuda-gamana-tava-sample-v2-2026-10-28';
const save = (name, value) => writeFile(`${root}/${name}.json`, JSON.stringify(value, null, 2));
const chunks = [
  'గరుడగమన తవ చరణకమలమిహ\nమనసి లసతు మమ నిత్యం',
  'మమ తాపమపాకురు దేవ\nమమ పాపమపాకురు దేవ',
];
const positive = [
  'Original expressive South Indian devotional song for Lord Vishnu; lyrical melodic singing with a beautifully shaped memorable melodic arc, not spoken recitation or a mechanical namavali chant',
  'One warm clear natural adult female solo vocalist in a comfortable middle register; intimate devotional emotion, rounded resonant vowels and fluid connected legato phrases',
  'Sing the supplied Sanskrit text from Telugu script accurately: every syllable clearly audible, short and long vowels correct, no swallowed consonants',
  'Give each complete phrase a gentle rising and falling melodic contour, graceful pitch slides and restrained gamaka, sustain phrase-ending vowels with controlled tone and soft natural decay',
  'Prominent centered lead vocal over a quiet continuous tanpura and a soft warm string cushion; bamboo flute and veena answer only between complete sung phrases',
  'Warm natural temple-room reverb with clear dry consonants, beautiful acoustic depth, voice always above the instruments; avoid a flat synthetic or thin sound',
  'Use a new original melody and performance; no imitation of any identifiable singer or copied recording',
];
const negative = ['spoken narration','word-by-word recitation','robotic flat chanting','staccato syllables','rushed diction','swallowed syllables','excessively stretched syllables inside words','pop ballad','western pop vibrato','operatic singing','EDM','heavy bass','loud percussion','male voice','duet','choir','vocal doubling','extra lyrics','English words','artist impersonation'];
const request = {
  model_id:'music_v2_5',with_timestamps:true,store_for_inpainting:true,
  composition_plan:{chunks:chunks.map((text,i)=>({
    text,duration_ms:i===0?22000:18000,
    positive_styles:[...positive,i===0?
      'Opening invocation in free meter without drums or a click-like pulse; begin vocal within one second; two flowing melodic lines with expressive sustained endings and a short breathing space between them; intimate calm devotional singing':
      'Continue exactly the same female singer and tonal center; gentle mridangam and soft hand cymbals enter smoothly, establish a flowing medium-tempo bhajan pulse under the two connected prayer lines; melody becomes warmer and more rhythmically grounded; graceful brief flute resolution after the final sung word'],
    negative_styles:[...negative,...(i===0?['drums','percussion','strict fixed beat']:[])],context_adherence:'high'
  }))}
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
  await save('source', {url:'https://www.sampradayavidya.org/our-syllabus/Track5/garudagamanatava', composer:'Jagadguru Sri Bharati Tirtha Swamiji', scope:'Opening refrain only; sample, not full stotram', musicalArrangement:'New original generation; no source audio supplied', referenceVideo:'https://www.youtube.com/watch?v=dMZ-1gMiIEY'});
  await writeFile(`${root}/lyrics-te.txt`, chunks.join('\n\n') + '\n');
  const key = await credential();
  const headers = { 'xi-api-key': key };
  const subscription = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers, signal: AbortSignal.timeout(30000) });
  assert(subscription.ok, `Credential/subscription check failed (${subscription.status})`);
  const info = await subscription.json();
  const remaining = Number(info.character_limit) - Number(info.character_count);
  await save('credit-check', { tier: info.tier, remainingCredits: remaining, checkedAt: new Date().toISOString() });
  assert(info.tier !== 'free' && remaining >= 10000, 'Insufficient included credits for sample; stopped before generation');
  console.log(JSON.stringify({ stage: 'generating', seconds: 40, model: request.model_id, tier: info.tier, remainingCredits: remaining }));
  const record = { state: 'submitted', submittedAt: new Date().toISOString(), maximumCalls: 1,
    authorization: 'User requested Garuda Gamana Tava in our own channel style, sample first. After rejecting sample v1 and asking to refer to the supplied YouTube performance, user explicitly authorized ElevenLabs for better results. One new 40-second original female vocal sample using included credits; no full production or publishing.',
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
