import 'dotenv/config';
import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile, access} from 'node:fs/promises';
import {db} from '../lib/db';
import {decrypt} from '../lib/security';

const root = 'data/productions/divine-wisdom/venkateswara/suprabhatam-2026-10-19';
const flowing = process.argv.includes('--lalitha-flow');
const natural = process.argv.includes('--natural-v3');
const hanumanOriginal = process.argv.includes('--hanuman-original-v2');
const hanuman = process.argv.includes('--hanuman-style') || hanumanOriginal;
const sample = `${root}/${hanumanOriginal ? 'opening-two-verses-original-male-v2' : hanuman ? 'opening-two-verses-hanuman-style-v1' : natural ? 'opening-two-verses-natural-v3' : flowing ? 'opening-two-verses-lalitha-flow-v2' : 'opening-two-verses-sample'}`;
const save = (name: string, data: unknown) => writeFile(`${sample}/${name}.json`, JSON.stringify(data, null, 2));
async function exists(path: string) {try {await access(path); return true;} catch {return false;}}

async function main() {
  const mode = process.argv[2];
  assert(['check', 'generate', 'align', 'transcribe'].includes(mode!), 'Choose check, generate, align or transcribe');
  await mkdir(sample, {recursive: true});
  const source = await readFile(`${root}/source-browser.txt`, 'utf8');
  const prayer = source.slice(source.indexOf('కౌసల్యా'), source.indexOf('Browse Related Categories:'));
  const matches = [...prayer.matchAll(/([\s\S]*?)॥\s*(\d+)\s*॥/g)];
  assert.deepEqual(matches.map(m => Number(m[2])), Array.from({length: 29}, (_, i) => i + 1));
  const units = matches.map(m => ({verse: Number(m[2]), text: m[1].replace(/\[[^\]]*\]/g, '').trim() + ' ॥'}));
  const text = units.slice(0, 2).map(u => u.text).join('\n\n');
  assert(!/[\d\[\]]/.test(text));
  await writeFile(`${root}/complete-prayer-telugu.txt`, units.map(u => u.text).join('\n\n') + '\n');
  await writeFile(`${sample}/lyrics.txt`, text + '\n');
  const referencePath = hanuman ? 'data/productions/divine-wisdom/hanuman-chalisa/sung-preview-2026-10-06/request.json' : 'data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12/sung-album-sample-v2-2026-10-15/request.json';
  const reference = JSON.parse(await readFile(referencePath, 'utf8'));
  const request = {model_id: 'music_v2_5', store_for_inpainting: true, composition_plan: {chunks: [{
    text, duration_ms: 50000,
    positive_styles: [
      'Original melodic Sri Venkateswara Suprabhatam, peaceful early morning Tirumala temple atmosphere, intimate professionally produced South Indian devotional album',
      'One warm clear female solo lead singer in a sweet natural middle register, sincere reverence, gentle expressive sustained melody, restrained Carnatic ornamentation',
      'Gentle unhurried flowing 6/8 devotional pulse, consistent singer melody tempo and recording character across both verses',
      'Supplied lyrics are Sanskrit written in Telugu script; articulate every syllable clearly, preserve long vowels aspirated consonants and consonant clusters, natural breaths at line boundaries',
      'Soft sustained tanpura, delicate veena and bamboo flute responses, gentle violin bed, very light mridangam, rounded warm bass foundation under the prominent vocal',
      'Spacious warm acoustic studio mix with subtle sacred ambience; accompaniment quiet enough to hear every word',
      'Brief gentle instrumental opening, sing the two supplied verses once in exact order, musical continuity between them, graceful instrumental resolution after the final complete word',
      'Original melody and original vocal identity, no commercial recording or singer references, no copied tune',
      'Use time for complete words and breathing; place ornaments on vowels without obscuring words; no extra lyrics or repeats'
    ],
    negative_styles: [...reference.composition_plan.chunks[0].negative_styles,
      'commercial Suprabhatam melody', 'artist imitation', 'overpowering bass', 'clipped syllables', 'rushed consonant clusters', 'invented chorus'],
    context_adherence: 'high'
  }]}};
  if (flowing) {
    const chunk: any = request.composition_plan.chunks[0];
    const savedReference = JSON.parse(await readFile('data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12/full-sung-v2-approved-2026-10-15/reference.json', 'utf8'));
    assert(savedReference.song_id, 'Saved approved Lalitha reference required');
    chunk.duration_ms = 30000;
    chunk.positive_styles = reference.composition_plan.chunks[0].positive_styles
      .filter((s: string) => !/Lalita Sahasranamam|introduction|responses|end this section/.test(s));
    chunk.positive_styles.push(
      'Original melodic Sri Venkateswara Suprabhatam with the same forward flowing musical pace, warm female lead register, 76 BPM 6/8 acoustic devotional feel and recording warmth as the supplied approved Lalitha reference',
      'Connected lyrical phrasing: sing complete lines smoothly across adjacent words, short natural breaths only at line boundaries, move directly into the next verse',
      'Begin singing promptly, no extended introduction, no instrumental interlude between lines or verses, no long held notes after each word, no empty gaps',
      'Sing both supplied verses once in exact order with every Sanskrit syllable clearly articulated; graceful brief ending after the complete final word',
      'Warm balanced bass below the clear prominent vocal, quiet sustained tanpura veena flute violin and gentle mridangam',
      'Compose a fresh melody for this prayer; preserve the reference pacing and arrangement character');
    chunk.negative_styles.push('slow drawn-out delivery', 'pauses between individual words', 'extended instrumental gaps', 'excessively stretched vowels');
    chunk.conditioning_ref = {song_id: savedReference.song_id, range: {start_ms: 5000, end_ms: 35000}};
    chunk.condition_strength = 'high';
  }
  if (natural) {
    const chunk = request.composition_plan.chunks[0];
    chunk.duration_ms = 32000;
    chunk.positive_styles = [
      'Fresh original South Indian melodic morning devotional prayer, Sanskrit supplied in Telugu script, warm acoustic devotional album production',
      'One clear warm female solo singer in a comfortable middle register, natural human singing at a normal moderate pace, flowing tuneful musical phrases',
      'Gentle flowing 6/8 devotional pulse around 76 BPM, connected words within each line, natural short breaths at the ends of complete lines',
      'Precise Sanskrit pronunciation with clear full syllables, correct long vowels and consonant clusters, restrained tasteful ornamentation',
      'Begin singing within the first second, move naturally through both verses with only a short breath between verses, brief graceful ending',
      'Prominent intimate vocal, gentle tanpura veena bamboo flute and violin, light mridangam, rounded warm bass quietly supporting the voice',
      'Sing only the supplied two verses exactly once in order, each word complete, no added words, fresh original melody and original vocal identity',
      'Natural recording character and articulation, expressive connected musical delivery, peaceful early morning temple warmth'
    ];
    chunk.negative_styles = ['spoken narration', 'flat spoken chanting', 'extra lyrics', 'omitted syllables', 'repeated verses', 'long instrumental gaps', 'pauses between individual words', 'drawn-out syllables', 'excessive melisma', 'rushed diction', 'heavy percussion', 'loud bass', 'vocal doubling', 'artist imitation', 'copied melody'];
  }
  if (hanuman) {
    const chunk=request.composition_plan.chunks[0];
    chunk.duration_ms=30000;
    chunk.positive_styles=reference.composition_plan.chunks[0].positive_styles.map((s:string)=>s.replace('traditional Awadhi words transliterated in Telugu script','traditional Sanskrit prayer words written in Telugu script'));
    chunk.positive_styles.push(
      'Original devotional setting of Sri Venkateswara Suprabhatam, same rich male baritone direction and steady 84 BPM instrumental feel as this production brief',
      'Connected complete musical phrases with natural short breaths, confident clear devotional vocal delivery, articulate every supplied Sanskrit syllable',
      'Begin singing promptly, flow through both supplied verses once in order, no repeated lines, no long introduction or instrumental interlude',
      'Keep all words intelligible above the accompaniment; finish the complete final word and give a brief natural musical resolution');
    chunk.negative_styles=[...reference.composition_plan.chunks[0].negative_styles,'female lead','slow drawn-out syllables','long instrumental gaps','silent breaks between verses','copied commercial melody'];
  }
  if(hanumanOriginal){
    const chunk=request.composition_plan.chunks[0];
    chunk.positive_styles=[
      'New original devotional musical composition setting the supplied traditional public-domain Sanskrit prayer text written in Telugu script',
      'One rich resonant natural male baritone lead, sincere reverence, confident warm expressive devotional delivery',
      'Steady 84 BPM acoustic devotional pulse with connected syllabic musical phrasing, clear consonants and vowel lengths, normal natural pace',
      'Quiet tabla and pakhawaj, soft harmonium and tanpura, subtle acoustic strings, rounded balanced bass foundation',
      'Voice prominently above accompaniment, clear intelligible complete words and restrained ornamentation',
      'Fresh original melody and fresh arrangement; this request includes no reference audio and requests no particular recording or singer',
      'Perform both supplied verses exactly once in order, begin vocals promptly, brief natural breaths between lines, transition directly into verse two',
      'Resolve briefly after the complete final word, warm clear studio recording'
    ];
    chunk.negative_styles=['spoken narration','female lead','extra lyrics','repeated verses','missing words','rushed consonants','long pauses','long instrumental introduction','heavy reverb','loud instruments masking voice'];
  }
  await save('request', request);
  await save('plan', {source: 'https://vignanam.org/telugu/sri-venkateswara-suprabhatam.html',
    sourceSnapshot: `${root}/source-browser.txt`, verifiedVerseSequence: units.map(u => u.verse),
    units: units.slice(0, 2), referenceRequest: referencePath,
    modelDocumentation: 'https://elevenlabs.io/docs/api-reference/music/compose',
    scope: 'Opening two verses musical audio sample only; user requested sample first',
    durationNote: hanuman ? 'User selected the saved Hanuman Chalisa voice and flow. Reuse its original music_v2_5 written style brief with new Sanskrit lyrics; one 30-second continuous sample, no reference audio conditioning or tempo processing.' : natural ? 'Fresh independent original generation, 32-second allocation for two verses with natural connected singing. User rejected both slow delivery and locally sped-up preview. No reference audio or tempo processing.' : flowing ? '30-second two-verse allocation follows the approved Lalitha syllabic flow; connected phrasing and minimal gaps. User rejected the slow 50-second sample.' : 'API requires a chunk duration; generous 50-second allocation for two short verses, breathing and instrumental resolution. Full prayer runtime is not fixed.',
    fullProductionStarted: false, pronunciationApproved: false, publishApproved: false});
  let key = process.env.ELEVENLABS_API_KEY;
  if (!key || /^(<|PASTE|your)/i.test(key)) {
    const profile = await db.providerProfile.findUniqueOrThrow({where: {id: '7e994f10-1088-464c-91fb-79297b8fd6cb'}});
    key = decrypt(profile.encryptedKey);
  }
  const headers = {'xi-api-key': key!};
  const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {headers, signal: AbortSignal.timeout(30000)});
  assert(response.ok, `Subscription HTTP ${response.status}`);
  const account = await response.json();
  const remaining = Number(account.character_limit) - Number(account.character_count);
  await save(`credits-${mode}`, {checkedAt: new Date().toISOString(), tier: account.tier, remainingIncludedCredits: remaining});
  console.log(JSON.stringify({stage: 'credits', tier: account.tier, remainingIncludedCredits: remaining}));
  if (mode === 'check') return;
  assert(account.tier !== 'free' && Number.isFinite(remaining) && remaining >= 15000, 'Insufficient included credit headroom; no overage');
  const stem = mode === 'generate' ? 'generation' : mode === 'transcribe' ? 'transcription-attempt' : 'alignment-attempt';
  if (mode === 'generate' && await exists(`${sample}/sample.mp3`)) {console.log('Reusing saved sample'); return;}
  assert(!await exists(`${sample}/${stem}.json`), 'Existing attempt: inspect saved state before any retry');
  let form: FormData | undefined;
  if (mode === 'align' || mode === 'transcribe') {
    form = new FormData();
    form.append('file', new Blob([new Uint8Array(await readFile(`${sample}/sample.mp3`))], {type: 'audio/mpeg'}), 'sample.mp3');
    if(mode==='align')form.append('text', text);
    else {form.append('model_id','scribe_v2');form.append('language_code','tel');form.append('tag_audio_events','false');form.append('timestamps_granularity','word');}
  }
  const record: any = {state: 'submitted', submittedAt: new Date().toISOString(), maximumCalls: 1};
  await save(stem, record);
  try {
    const result = await fetch(`https://api.elevenlabs.io/v1/${mode === 'generate' ? 'music?output_format=mp3_48000_192' : mode === 'transcribe' ? 'speech-to-text' : 'forced-alignment'}`, {
      method: 'POST', headers: mode === 'generate' ? {...headers, 'Content-Type': 'application/json'} : headers,
      body: mode === 'generate' ? JSON.stringify(request) : form, signal: AbortSignal.timeout(600000)
    });
    record.httpStatus = result.status;
    if (!result.ok) {
      const error = await result.json().catch(() => ({}));
      await save(`${stem}-provider-error`, error);
      record.state = 'rejected'; await save(stem, record);
      throw Error(`Provider HTTP ${result.status}; inspect saved error`);
    }
    if (mode === 'generate') {
      const bytes = Buffer.from(await result.arrayBuffer());
      assert(bytes.length > 10000);
      await writeFile(`${sample}/sample.mp3`, bytes);
      record.bytes = bytes.length; record.songId = result.headers.get('song-id');
    } else {await save(mode==='transcribe'?'transcription':'alignment', await result.json());}
    record.state = 'completed'; record.completedAt = new Date().toISOString();
    await save(stem, record); console.log(JSON.stringify(record));
  } catch (error) {
    if (record.state === 'submitted') {record.state = 'unknown'; await save(stem, record);}
    throw error;
  }
}
main().catch(error => {console.error(error instanceof assert.AssertionError ? error.message : 'Sample operation stopped; inspect saved records. Credentials suppressed.'); process.exitCode = 1;}).finally(() => db.$disconnect());
