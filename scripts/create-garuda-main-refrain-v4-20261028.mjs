import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { credential, db } from './anjaneya-dandakam-audio.mjs';

const root = 'data/productions/divine-wisdom/garuda-gamana-tava-main-refrain-v4-2026-10-28';
const save = (name, value) => writeFile(`${root}/${name}.json`, JSON.stringify(value, null, 2));
const chunks = ['गरुडगमन तव चरणकमलमिह\nमनसि लसतु मम नित्यम्\nमम तापमपाकुरु देव\nमम पापमपाकुरु देव'];
const request = {
  model_id:'music_v2_5',with_timestamps:true,store_for_inpainting:true,
  composition_plan:{chunks:[{
    text:chunks[0],duration_ms:28000,
    positive_styles:[
      'MAIN REFRAIN of a South Indian devotional studio SONG: rhythmic, tuneful, uplifting bhajan, a strong clearly shaped memorable melodic hook; the performance is already in its main rhythmic section at the beginning',
      'Bright clear resonant FEMALE LEAD in a natural medium-high register, confident musical projection and warm devotional expression, clean sustained tone with graceful small pitch slides',
      'Sing complete connected phrases over a steady hand-percussion pulse: the first two lines form one melodic question-and-answer pair, the last two lines form a matching rising-and-resolving response pair',
      'A small soft female backing ensemble joins the lead ONLY on the two response lines, gently in unison, supporting the lead without obscuring the words',
      'Quiet but rhythmically defined mridangam and tabla-style hand percussion, light hand cymbals, continuous warm drone and soft sustained strings; a short flute answer fills only the breath between complete phrases',
      'Start the rhythmic groove immediately, lead singing enters within one second, compact musical breathing spaces, steady devotional forward movement throughout all four lines',
      'Exact supplied Sanskrit pronunciation: garuda-gamana tava charana-kamalam-iha; manasi lasatu mama nityam; mama taapam apaakuru deva; mama paapam apaakuru deva. Preserve long aa and uu, crisp consonants, natural Sanskrit word endings',
      'All four supplied lyric lines sung once, fully and in order, lead voice prominent and centered, warm polished acoustic mix, short natural vocal reverb; original melody and arrangement'
    ],
    negative_styles:['slow invocation','free meter','alap intro','ambient meditation','spoken recitation','flat monotone chant','word-by-word pauses','thin breathy voice','slurred Sanskrit','rushed syllables','extra lyrics','repeated lyrics','long instrumental introduction','western pop ballad','operatic vibrato','EDM','heavy bass','loud drums','male voice','identifiable singer imitation'],context_adherence:'high'
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
  await save('source', {url:'https://www.sampradayavidya.org/our-syllabus/Track5/garudagamanatava', composer:'Jagadguru Sri Bharati Tirtha Swamiji', scope:'Main rhythmic refrain only; Sanskrit Devanagari input; audio-only musical test', musicalArrangement:'New original generation; no source audio supplied', referenceVideo:'https://www.youtube.com/watch?v=dMZ-1gMiIEY'});
  await writeFile(`${root}/lyrics-sa.txt`, chunks.join('\n\n') + '\n');
  const key = await credential();
  const headers = { 'xi-api-key': key };
  const subscription = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers, signal: AbortSignal.timeout(30000) });
  assert(subscription.ok, `Credential/subscription check failed (${subscription.status})`);
  const info = await subscription.json();
  const remaining = Number(info.character_limit) - Number(info.character_count);
  await save('credit-check', { tier: info.tier, remainingCredits: remaining, checkedAt: new Date().toISOString() });
  assert(info.tier !== 'free' && remaining >= 10000, 'Insufficient included credits for sample; stopped before generation');
  console.log(JSON.stringify({ stage: 'generating', seconds: 28, model: request.model_id, tier: info.tier, remainingCredits: remaining }));
  const record = { state: 'submitted', submittedAt: new Date().toISOString(), maximumCalls: 1,
    authorization: 'User requested Garuda Gamana Tava in our own channel style, sample first. User approved an audio-only main-refrain sample after detailed reference review: rhythmic female lead, melodic hook, hand percussion and soft backing responses. One 28-second ElevenLabs generation using included credits; no invocation, Govinda voice reference, video render or publishing.',
    externalAudioReferenceUsed: false, requestedSeconds: 28, actualCharge: null };
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
