import 'dotenv/config';
import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {db} from '../lib/db';
import {decrypt} from '../lib/security';

const base = 'data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12';
const root = `${base}/sung-76bpm-sample-v4-2026-10-15`;
const seconds = 90;
const save = (name: string, value: unknown) => writeFile(`${root}/${name}.json`, JSON.stringify(value, null, 2));
async function exists(name: string) {
  try { await readFile(`${root}/${name}`); return true; }
  catch (error: any) { if (error.code === 'ENOENT') return false; throw error; }
}

async function main() {
  const mode = process.argv[2];
  assert(['prepare', 'check', 'generate', 'align'].includes(mode), 'Choose prepare, check, generate or align');
  await mkdir(root, {recursive: true});
  const source = JSON.parse(await readFile(`${base}/video-02-recitation/priest-chant-sample-2026-10-14/plan.json`, 'utf8'));
  const units = source.units.map((unit: any) => ({verse: unit.verse, text: unit.displayText}));
  assert.equal(units.length, 4);
  const text = units.map((unit: any) => unit.text).join('\n');
  const request = {
    model_id: 'music_v2_5',
    composition_plan: {chunks: [{
      text,
      duration_ms: seconds * 1000,
      positive_styles: [
        'original melodic Indian devotional setting of Sri Lalita Sahasranamam, warmth and emotional appeal of a professionally produced South Indian devotional album',
        'Carnatic-inspired devotional light music, peaceful graceful uplifting morning prayer, flowing memorable melody that listeners can hum',
        'gentle 6/8 rhythm at approximately 76 BPM',
        'one warm clear female lead singer with a naturally sweet middle register, sincere devotion and restrained classical ornamentation',
        'sing with a flowing musical melody, expressive phrasing and gentle sustained notes',
        'every Sanskrit syllable clear and intelligible, preserve long vowels and consonant clusters, supplied lyrics are Sanskrit written in Telugu script',
        'soft tanpura drone, expressive bamboo flute, delicate veena, gentle violin accompaniment, light mridangam and subtle manjira',
        'keep the voice prominent and the accompaniment spacious',
        'contemporary studio clarity, warm acoustic instruments, subtle temple-like reverb and balanced dynamics',
        'begin with a brief flute-and-veena introduction, then bring in the lead vocal gently, establish a recognizable melodic theme in the opening lines',
        'small melodic variations between verses maintaining a consistent devotional mood, brief instrumental responses only between complete verses',
        'sing only supplied lyrics exactly in their given order, preserve complete words and verse boundaries, do not invent translate omit rearrange or repeat words',
        'place vocal ornaments on vowels without obscuring pronunciation',
        'end this section with a graceful musical resolution',
        'compose a fresh melody and use an original vocal identity, no copied melody or imitation of an existing singer'
      ],
      negative_styles: [
        'spoken narration', 'flat spoken chanting', 'Hanuman Chalisa melody', 'martial rhythm',
        'powerful male chorus', 'dhol', 'heavy drums', 'pop beat', 'EDM', 'rap',
        'extra lyrics', 'omitted lyrics', 'repeated lyrics', 'spoken verse numbers',
        'long melisma', 'rushed syllables', 'heavy reverb', 'loud instruments covering the voice',
        'EDM drops', 'excessive echo', 'dramatic vocal runs', 'translated lyrics', 'rearranged words',
        'instrumental interruption within a verse', 'multiple lead singers',
        'shrill high notes', 'nasal voice', 'harsh vocal tone', 'breathy whispered words',
        'robotic pitch correction', 'monotone melody', 'mechanical repetitive chant',
        'busy percussion', 'bright piercing cymbals', 'abrupt ending', 'clipped final word'
      ],
      context_adherence: 'high'
    }]}
  };
  await save('request', request);
  await save('plan', {
    units, text, seconds, language: 'Sanskrit', displayScript: 'Telugu',
    musicDirection: 'User-specified original Carnatic-inspired devotional light music, gentle 6/8 at approximately 76 BPM; sweet female middle register, tanpura, flute, veena, gentle violin, light mridangam and subtle manjira',
    userAuthorization: 'User resupplied the complete composition brief. Create another sample closely following that brief at 76 BPM; retain the sample-first approval gate and complete Telugu verse display. Full version awaits approval.',
    fullVersionApproved: false, publishApproved: false, pronunciationApproved: false
  });
  if (mode === 'prepare') { console.log(JSON.stringify({root, seconds, verses: units.length, calls: 0})); return; }
  let key = process.env.ELEVENLABS_API_KEY;
  if (!key || /^(<|PASTE|your)/i.test(key)) {
    const profile = await db.providerProfile.findUniqueOrThrow({where: {id: '7e994f10-1088-464c-91fb-79297b8fd6cb'}});
    key = decrypt(profile.encryptedKey);
  }
  const headers = {'xi-api-key': key!};
  const subscription = await fetch('https://api.elevenlabs.io/v1/user/subscription', {headers, signal: AbortSignal.timeout(30000)});
  assert(subscription.ok, `Subscription check HTTP ${subscription.status}`);
  const info = await subscription.json();
  const remaining = Number(info.character_limit) - Number(info.character_count);
  await save('access', {checkedAt: new Date().toISOString(), tier: info.tier, remainingCredits: remaining});
  if (mode === 'check') { console.log(JSON.stringify({tier: info.tier, remainingCredits: remaining})); return; }
  assert(info.tier !== 'free' && Number.isFinite(remaining) && remaining >= 15000, 'Insufficient included credit headroom; no overage');
  const ledger = mode === 'generate' ? 'generation' : 'alignment-attempt';
  assert(!await exists(`${ledger}.json`), 'An attempt already exists; inspect it before another call');
  let form: FormData | undefined;
  if (mode === 'align') {
    const bytes = await readFile(`${root}/sample.mp3`);
    form = new FormData();
    form.append('file', new Blob([new Uint8Array(bytes)], {type: 'audio/mpeg'}), 'sample.mp3');
    form.append('text', text);
  }
  const record: any = {state: 'submitted', submittedAt: new Date().toISOString(), maximumCalls: 1, scope: `One ${seconds}-second song sample and its caption alignment only`, actualCharge: null};
  await save(ledger, record);
  try {
    const response = await fetch(mode === 'generate'
      ? 'https://api.elevenlabs.io/v1/music?output_format=mp3_48000_192'
      : 'https://api.elevenlabs.io/v1/forced-alignment', {
      method: 'POST',
      headers: mode === 'generate' ? {...headers, 'Content-Type': 'application/json'} : headers,
      body: mode === 'generate' ? JSON.stringify(request) : form,
      signal: AbortSignal.timeout(300000)
    });
    record.httpStatus = response.status;
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const status = error.detail?.status;
      record.state = 'rejected';
      record.reason = typeof status === 'string' && /^[a-z_]{1,100}$/.test(status) ? status : 'provider_rejected';
      await save(ledger, record);
      throw Error('Provider rejected sample operation');
    }
    if (mode === 'generate') {
      const bytes = Buffer.from(await response.arrayBuffer());
      assert(bytes.length > 10000, 'Audio response too small');
      await writeFile(`${root}/sample.mp3`, bytes);
      record.bytes = bytes.length;
    } else {
      const alignment = await response.json();
      assert(Array.isArray(alignment.characters), 'Missing acoustic character alignment');
      await save('alignment', alignment);
      record.words = alignment.words?.length;
      record.loss = alignment.loss;
    }
    record.state = 'completed';
    record.completedAt = new Date().toISOString();
    await save(ledger, record);
    console.log(JSON.stringify(record));
  } catch (error) {
    if (record.state === 'submitted') {
      record.state = 'unknown';
      record.reason = 'transport_or_save_failed_no_automatic_retry';
      await save(ledger, record);
    }
    throw error;
  }
}
main().catch(error => {
  console.error(error instanceof assert.AssertionError ? error.message : 'Sample operation failed; credentials suppressed. Inspect the saved attempt before retrying.');
  process.exitCode = 1;
}).finally(() => db.$disconnect());
