import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { credential, db } from './anjaneya-dandakam-audio.mjs';

const root = 'data/productions/divine-wisdom/lakshmi-prayer-clear-flow-v2-2026-10-30';
const save = (name, value) => writeFile(`${root}/${name}.json`, JSON.stringify(value, null, 2));
const chunks = [
 'కమలవాసిని కరుణారూపిణి\nమమ హృదయే భక్తిం దేహి',
 'మంగళదాయిని మాధవకామిని\nమమ మనసి శాంతిం దేహి',
];
const positive = [
 'New original Sanskrit devotional prayer in Telugu script, compact flowing South Indian female melodic recitation at 88 BPM, softly pitched musical chanting with a simple narrow melody',
 'Exactly one warm natural adult female singer with clear native South Indian Sanskrit diction; comfortable middle register, close dry voice, same singer throughout',
 'HIGHEST PRIORITY clear crisp complete syllables and natural word boundaries. Deliver words almost as clearly as careful speech, with one short steady note per syllable. Do not stretch vowels, repeat syllables or add ornamentation',
 'Sing the supplied text exactly once in order. Connect words smoothly without silence between individual words; brief natural breaths only at complete line endings, approximately 0.15 to 0.25 seconds, no pause or instrumental fill between the two chunks',
 'Begin the first syllable immediately, within 0.2 seconds. Continue the second chunk directly from the first, same tempo and voice. Finish the final word completely with a short clean ending',
 'Voice much louder than a very quiet tanpura drone and occasional veena; no percussion or flute competing with consonants, minimal room sound, intimate clean recording',
];
const request = {
  model_id: 'music_v2_5', with_timestamps: true, store_for_inpainting: true,
  composition_plan: { chunks: chunks.map(text => ({
    text, duration_ms: 9000, positive_styles: positive,
    negative_styles: ['male voice', 'choir', 'group vocals', 'vocal doubling', 'backing vocals', 'long gaps between lines', 'instrumental interludes', 'long introduction', 'long held final syllables', 'spoken narration', 'English lyrics', 'extra lyrics', 'rushed diction', 'heavy reverb', 'loud percussion', 'EDM', 'artist imitation', 'melismatic vocal runs', 'slurred Telugu', 'swallowed syllables', 'rapid gamakas', 'English pronunciation of Telugu', 'additional Sanskrit prayers', 'long gaps between words', 'stretched vowels', 'held notes', 'repeated syllables', 'melisma', 'dramatic vibrato', 'wordless humming', 'instrumental solos'],
    context_adherence: 'high',
  })) },
};

async function parseAudio(record) {
  assert.equal(record.state, 'completed', 'Prior generation incomplete; inspect before retrying');
  const bytes = await readFile(`${root}/sample-response.bin`);
  const boundary = /boundary="?([^";\s]+)/i.exec(record.contentType || '')?.[1];
  if (!boundary && /audio\//i.test(record.contentType || '')) {
    await writeFile(`${root}/lakshmi-prayer-clear-flow-v2.mp3`, bytes); return;
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
      else if (/audio\//i.test(header)) { await writeFile(`${root}/lakshmi-prayer-clear-flow-v2.mp3`, body); found = true; }
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
  await save('source', {lyricsOrigin:'New Telugu devotional lyrics authored in this conversation for the user on 2026-10-30', scope:'Four newly composed Sanskrit-style devotional prayer lines written in Telugu script, requesting devotion and peace. Not a quotation from Mahalakshmi Ashtakam or any of the blocked verses. Original devotional song; not a traditional stotram.', musicalArrangement:'New original melody and AI-generated female singer; no audio references, voice cloning, artist references or third-party recordings supplied', title:'కొత్త లక్ష్మీ ప్రార్థన'});
  await writeFile(`${root}/lyrics-te.txt`, chunks.join('\n\n') + '\n');
  const key = await credential();
  const headers = { 'xi-api-key': key };
  const subscription = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers, signal: AbortSignal.timeout(30000) });
  assert(subscription.ok, `Credential/subscription check failed (${subscription.status})`);
  const info = await subscription.json();
  const remaining = Number(info.character_limit) - Number(info.character_count);
  await save('credit-check', { tier: info.tier, remainingCredits: remaining, checkedAt: new Date().toISOString() });
  assert(info.tier !== 'free' && remaining >= 1500, 'Insufficient included credits for sample; stopped before generation');
  console.log(JSON.stringify({ stage: 'generating', seconds: 18, model: request.model_id, tier: info.tier, remainingCredits: remaining }));
  const record = { state: 'submitted', submittedAt: new Date().toISOString(), maximumCalls: 1,
    authorization: 'User asked to reduce lag and speak clearly in the new prayer sample. Preserve the same four lines with compact continuous melodic recitation and crisp pronunciation. A new prayer text is used with traditional female stotra-style musical direction. No blocked text or external recording is supplied. One 18-second music_v2_5 revision using included credits only; no blocked prayer lyrics or prior audio used, no topup, no publishing.',
    externalAudioReferenceUsed: false, requestedSeconds: 18, actualCharge: null };
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
    console.log(JSON.stringify({ state: 'completed', audio: `${root}/lakshmi-prayer-clear-flow-v2.mp3`, bytes: bytes.length }));
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
