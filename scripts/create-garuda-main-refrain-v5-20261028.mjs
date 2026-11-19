import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { credential, db } from './anjaneya-dandakam-audio.mjs';

const root = 'data/productions/divine-wisdom/garuda-gamana-tava-main-refrain-v5-2026-10-28';
const save = (name, value) => writeFile(`${root}/${name}.json`, JSON.stringify(value, null, 2));
const seed = JSON.parse(await readFile('data/productions/divine-wisdom/garuda-gamana-tava-main-refrain-v4-2026-10-28/sample-attempt.json','utf8'));
assert.equal(seed.state,'completed');assert(seed.songId);
const chunks = ['गरुडगमन तव चरणकमलमिह\nमनसि लसतु मम नित्यम्\nमम तापमपाकुरु देव\nमम पापमपाकुरु देव'];
const request = {
  model_id:'music_v2_5',with_timestamps:true,store_for_inpainting:true,
  composition_plan:{chunks:[{
    text:chunks[0],duration_ms:28000,
    conditioning_ref:{song_id:seed.songId,range:{start_ms:1000,end_ms:25000}},condition_strength:'medium',
    positive_styles:[
      'MAIN REFRAIN of a South Indian devotional studio SONG: rhythmic, tuneful, uplifting bhajan, a strong clearly shaped memorable melodic hook; the performance is already in its main rhythmic section at the beginning',
      'Full-bodied natural FEMALE LEAD with a rounded resonant middle register and effortless upper notes; emotionally expressive devotional singing, steady breath support, warm chest resonance, sweet clear head tone without nasal thinness',
      'Sing complete connected phrases over a steady hand-percussion pulse: the first two lines form one melodic question-and-answer pair, the last two lines form a matching rising-and-resolving response pair',
      'Keep the female lead dominant throughout. Only a very quiet two-voice female unison support joins the final response line, well behind the lead; every Sanskrit consonant remains distinctly intelligible',
      'Elegant acoustic arrangement: softly rounded mridangam groove, delicate hand cymbals, warm tanpura drone and restrained veena plucks; bamboo flute answers only in line-end breathing spaces; smooth balanced bass and clean separation',
      'Start the rhythmic groove immediately, lead singing enters within one second, compact musical breathing spaces, steady devotional forward movement throughout all four lines',
      'Exact supplied Sanskrit pronunciation: garuda-gamana tava charana-kamalam-iha; manasi lasatu mama nityam; mama taapam apaakuru deva; mama paapam apaakuru deva. Preserve long aa and uu, crisp consonants, natural Sanskrit word endings',
      'Refine the supplied OWN GENERATED main-refrain reference: preserve its rhythmic devotional direction while improving the musical phrasing, a graceful memorable rise on the opening phrase and a satisfying descending answer; no abrupt melodic jumps or random ornamental runs',
      'Shape each complete lyric line as one connected musical thought; breathe at line endings, preserve long vowels, allow restrained expressive pitch slides and natural note decay instead of mechanically stretching each word',
      'All four supplied lyric lines sung once in order, lead vocal close clear and above every instrument, short warm room reverb with dry consonant attacks, gentle final resolution; refined original performance'
    ],
    negative_styles:['slow invocation','free meter','alap intro','ambient meditation','spoken recitation','flat monotone chant','word-by-word pauses','thin breathy voice','nasal piercing voice','metallic vocal texture','wavering pitch','overlapping choir','smeared consonants','excessive reverb','slurred Sanskrit','rushed syllables','extra lyrics','repeated lyrics','long instrumental introduction','western pop ballad','operatic vibrato','EDM','heavy bass','loud drums','male voice','identifiable singer imitation'],context_adherence:'high'
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
    authorization: 'User requested Garuda Gamana Tava in our own channel style, sample first. User requested further improvement of the latest main-refrain audio sample. One 28-second separate refined take: smoother melodic phrasing, fuller natural lead, clearer Sanskrit, quieter backing and balanced acoustic accompaniment. Only own generated v4 used as reference, included credits only, audio-only and no publishing.',
    externalAudioReferenceUsed: false, ownGeneratedReferenceUsed: true, requestedSeconds: 28, actualCharge: null };
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
