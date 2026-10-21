import 'dotenv/config';
import assert from 'node:assert/strict';
import {copyFile, mkdir, readFile, writeFile} from 'node:fs/promises';
import {db} from '../lib/db';
import {decrypt} from '../lib/security';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const base = 'data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12';
const sample = `${base}/sung-album-sample-v2-2026-10-15`;
const root = `${base}/full-sung-v2-approved-2026-10-15`;
const execute = promisify(execFile);
const save = (name: string, value: unknown) => writeFile(`${root}/${name}.json`, JSON.stringify(value, null, 2));
const load = async (name: string) => JSON.parse(await readFile(`${root}/${name}.json`, 'utf8'));

async function exists(name: string) {
  try { await readFile(`${root}/${name}`); return true; }
  catch (error: any) { if (error.code === 'ENOENT') return false; throw error; }
}

async function prepare() {
  await mkdir(root, {recursive: true});
  if (await exists('plan.json')) return load('plan');
  const source = JSON.parse(await readFile(`${base}/video-02-recitation/vignanam-v3/plan.json`, 'utf8'));
  const approved = JSON.parse(await readFile(`${sample}/plan.json`, 'utf8'));
  const request = JSON.parse(await readFile(`${sample}/request.json`, 'utf8'));
  const units = source.batches.flatMap((batch: any) => batch.units)
    .filter((unit: any) => unit.verse !== null)
    .map((unit: any) => ({verse: unit.verse, text: unit.displayText}));
  assert.deepEqual(units.map((unit: any) => unit.verse), Array.from({length: 183}, (_, index) => index + 1));
  assert.deepEqual(units.slice(0, 4), approved.units);
  const register = (await readFile(`${base}/name-register.csv`, 'utf8')).trim().split(/\r?\n/);
  assert.equal(register.length - 1, 1000);
  const batches: any[] = [{index: 0, reuseApprovedSample: true, seconds: 60, units: units.slice(0, 4)}];
  for (let index = 4; index < units.length; index += 32) {
    const selected = units.slice(index, index + 32);
    batches.push({index: batches.length, reuseApprovedSample: false, seconds: selected.length * 15, units: selected});
  }
  for (const batch of batches) batch.text = batch.units.map((unit: any) => unit.text).join('\n');
  await copyFile(`${sample}/sample.mp3`, `${root}/batch-00.mp3`);
  await copyFile(`${sample}/alignment.json`, `${root}/batch-00-alignment.json`);
  const plan = {
    units, batches, positiveStyles: request.composition_plan.chunks[0].positive_styles,
    negativeStyles: request.composition_plan.chunks[0].negative_styles,
    model: 'music_v2_5', plannedSeconds: batches.reduce((sum: number, batch: any) => sum + batch.seconds, 0),
    maximumNewMusicCalls: batches.length - 1, nameRegisterRows: 1000,
    source: source.source, openingPrayersIncluded: false, fullPhalashrutiIncluded: false,
    scope: 'Complete thousand-name stotra, all 183 verse units including final half verse and closing; same text sequence as the approved opening',
    userAuthorization: 'Good create full version and increase the font size',
    approvedReference: `${sample}/sample.mp3`, preserveApprovedOpening: true,
    mastering: 'Same gentle whole-mix polish as approved V2; no tempo or pitch change',
    captionFontSize: 96, completeVerseAlwaysVisible: true,
    fullVersionApproved: true, publishApproved: false, pronunciationApproved: false
  };
  await save('plan', plan);
  await writeFile(`${root}/complete-lyrics-telugu.txt`, units.map((unit: any) => `${unit.text} ${unit.verse}`).join('\n\n') + '\n');
  console.log(JSON.stringify({stage: 'prepared', verses: units.length, referenceNames: 1000, batches: batches.length, plannedSeconds: plan.plannedSeconds}), null, 2);
  return plan;
}

async function main() {
  const mode = process.argv[2];
  assert(['prepare', 'produce', 'check', 'music', 'align', 'repair'].includes(mode), 'Choose prepare, check, produce, music, align or repair');
  const plan = await prepare();
  if (mode === 'prepare') return;
  let key = process.env.ELEVENLABS_API_KEY;
  if (!key || /^(<|PASTE|your)/i.test(key)) {
    const profile = await db.providerProfile.findUniqueOrThrow({where: {id: '7e994f10-1088-464c-91fb-79297b8fd6cb'}});
    key = decrypt(profile.encryptedKey);
  }
  const headers = {'xi-api-key': key!, Connection: 'close'};
  async function credits(required: number) {
    const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {headers, signal: AbortSignal.timeout(30000)});
    assert(response.ok, `Credit check HTTP ${response.status}`);
    const info = await response.json();
    const remaining = Number(info.character_limit) - Number(info.character_count);
    await save('credit-check', {checkedAt: new Date().toISOString(), tier: info.tier, remainingCredits: remaining, requiredHeadroom: required});
    assert(info.tier !== 'free' && Number.isFinite(remaining) && remaining >= required, 'Insufficient included credits; no overage');
    return remaining;
  }
  async function submit(name: string, endpoint: string, body: FormData | object, isJson: boolean, output: string) {
    if (await exists(`${name}-attempt.json`)) {
      const previous = await load(`${name}-attempt`);
      if (previous.state === 'rejected' && previous.httpStatus === 422) name += '-corrected';
      else if (previous.state === 'rejected' && previous.httpStatus === 400 && previous.reason === 'bad_composition_plan') name += '-revised';
      else if (endpoint === 'forced-alignment' && previous.state === 'unknown') name += '-recovery';
    }
    assert(!await exists(`${name}-attempt.json`), `Existing attempt for ${name}; inspect it before resubmitting`);
    const record: any = {state: 'submitted', submittedAt: new Date().toISOString(), maximumCalls: 1, authorization: plan.userAuthorization, actualCharge: null};
    await save(`${name}-attempt`, record);
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/${endpoint}`, {
        method: 'POST', headers: isJson ? {...headers, 'Content-Type': 'application/json'} : headers,
        body: isJson ? JSON.stringify(body) : body as FormData, signal: AbortSignal.timeout(endpoint === 'forced-alignment' ? 60000 : 900000)
      });
      record.httpStatus = response.status;
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        await save(`${name}-provider-error`, error);
        record.state = 'rejected';
        const status = error.detail?.status;
        record.reason = typeof status === 'string' && /^[a-z_]{1,100}$/.test(status) ? status : 'provider_rejected';
        record.validation = Array.isArray(error.detail) ? error.detail.map((item: any) => ({location: item.loc, message: item.msg, type: item.type})) : undefined;
        record.message = typeof error.detail?.message === 'string' ? error.detail.message : undefined;
        await save(`${name}-attempt`, record);
        throw Error(`Provider rejected ${name}: HTTP ${response.status} (${record.reason})`);
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      assert(bytes.length > 10, 'Empty provider response');
      await writeFile(`${root}/${output}`, bytes);
      record.state = 'completed'; record.bytes = bytes.length; record.completedAt = new Date().toISOString();
      record.songId = response.headers.get('song-id');
      await save(`${name}-attempt`, record);
      return bytes;
    } catch (error) {
      if (record.state === 'submitted') {
        record.state = 'unknown';
        record.errorType = error instanceof Error ? error.name : 'unknown';
        record.errorCode = (error as any)?.cause?.code;
        await save(`${name}-attempt`, record);
      }
      throw error;
    }
  }
  const pending = [];
  for (const batch of plan.batches) {
    const stem = `batch-${String(batch.index).padStart(2, '0')}`;
    if (!await exists(`${stem}.mp3`)) pending.push(batch);
  }
  const required = Math.ceil(pending.reduce((sum: number, batch: any) => sum + batch.seconds, 0) * 15) + 10000;
  const remaining = await credits(required);
  console.log(JSON.stringify({stage: 'credit-check', remainingCredits: remaining, requiredHeadroom: required, pendingMusicBatches: pending.length}), null, 2);
  if (mode === 'check') return;
  if (!await exists('reference.json')) {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(await readFile(`${sample}/sample.mp3`))], {type: 'audio/mpeg'}), 'approved-lalita-v2.mp3');
    form.append('with_timestamps', 'true');
    const bytes = await submit('reference-upload', 'music/upload', form, false, 'reference.json');
    assert(JSON.parse(bytes.toString()).song_id, 'Reference upload missing song ID');
  }
  const reference = await load('reference');
  if (mode === 'repair') {
    const repairPlan = await load('repair-plan');
    for (let groupIndex = 0; groupIndex < repairPlan.groups.length; groupIndex++) {
      const group = repairPlan.groups[groupIndex];
      const stem = `repair-group-${String(groupIndex).padStart(2, '0')}`;
      if (!await exists(`${stem}.mp3`)) {
        await credits(group.units.length * 20 * 15 + 5000);
        const request = {model_id: plan.model, composition_plan: {chunks: group.units.map((unit: any) => ({
          text: unit.text, duration_ms: 20000,
          positive_styles: [...plan.positiveStyles.filter((style: string) => !/introduction|opening lines/i.test(style)),
            'same female lead singer, key, flowing 6/8 devotional melody and soft acoustic arrangement as the reference',
            'sing every supplied syllable and complete word exactly once, slowly enough for intelligible Sanskrit, no omitted compounds',
            'this is a continuous middle verse, begin vocal after only a short breath, no new song introduction, no long instrumental interlude'],
          negative_styles: plan.negativeStyles, context_adherence: 'high',
          conditioning_ref: {song_id: reference.song_id, range: {start_ms: 5000, end_ms: 35000}}, condition_strength: 'high'
        }))}, store_for_inpainting: true};
        await save(`${stem}-request`, request);
        console.log(JSON.stringify({stage: 'repairing-flagged-verses', verses: group.units.map((unit: any) => unit.verse)}));
        await submit(stem, 'music?output_format=mp3_48000_192', request, true, `${stem}.mp3`);
      }
      for (let index = 0; index < group.units.length; index++) {
        const unit = group.units[index];
        const verseStem = `repair-verse-${String(unit.verse).padStart(3, '0')}`;
        if (!await exists(`${verseStem}.mp3`)) {
          await execute('ffmpeg', ['-v', 'error', '-nostdin', '-n', '-ss', String(index * 20), '-i', `${root}/${stem}.mp3`,
            '-t', '20', '-c:a', 'libmp3lame', '-b:a', '192k', `${root}/${verseStem}.mp3`]);
        }
        if (!await exists(`${verseStem}-alignment.json`)) {
          const form = new FormData();
          form.append('file', new Blob([new Uint8Array(await readFile(`${root}/${verseStem}.mp3`))], {type: 'audio/mpeg'}), `${verseStem}.mp3`);
          form.append('text', unit.text);
          await submit(`${verseStem}-alignment`, 'forced-alignment', form, false, `${verseStem}-alignment.json`);
        }
        console.log(JSON.stringify({stage: 'repair-verse-aligned', verse: unit.verse}));
      }
    }
    return;
  }
  for (const batch of plan.batches) {
    const stem = `batch-${String(batch.index).padStart(2, '0')}`;
    if (mode === 'align' && !await exists(`${stem}.mp3`)) continue;
    if (!await exists(`${stem}.mp3`)) {
      await credits(batch.seconds * 15 + 5000);
      const chunks = [];
      for (let index = 0; index < batch.units.length; index += 4) {
        const selected = batch.units.slice(index, index + 4);
        chunks.push({
          text: selected.map((unit: any) => unit.text).join('\n'), duration_ms: selected.length * 15000,
          positive_styles: [...plan.positiveStyles,
            'These supplied lyrics are the traditional Sanskrit Hindu prayer Sri Lalita Sahasranamam written in Telugu script; this is a respectful religious performance using an original melody and original singer identity',
            'continue the same female singer, melodic theme, tempo, key and instrumentation as the approved reference; flowing connected devotional album performance',
            'sing each supplied word fully and clearly once in order, natural breathing only at word and verse boundaries',
            batch.index === plan.batches.length - 1 && index + 4 >= batch.units.length
              ? 'finish every final word fully and end with a brief graceful musical resolution'
              : 'continue smoothly into the next verse with brief instrumental responses only between complete verses'],
          negative_styles: plan.negativeStyles, context_adherence: 'high',
          conditioning_ref: {song_id: reference.song_id, range: {start_ms: 5000, end_ms: 35000}}, condition_strength: 'high'
        });
      }
      const request = {model_id: plan.model, composition_plan: {chunks}, store_for_inpainting: true};
      await save(`${stem}-request`, request);
      console.log(JSON.stringify({stage: 'generating', batch: batch.index, firstVerse: batch.units[0].verse, lastVerse: batch.units.at(-1).verse, seconds: batch.seconds}), null, 2);
      await submit(stem, 'music?output_format=mp3_48000_192', request, true, `${stem}.mp3`);
      console.log(JSON.stringify({stage: 'audio-saved', batch: batch.index}), null, 2);
    }
    if (mode === 'music') continue;
    if (!await exists(`${stem}-alignment.json`)) {
      const characters: any[] = [];
      const words: any[] = [];
      const losses: number[] = [];
      for (let index = 0; index < batch.units.length; index += 4) {
        const group = batch.units.slice(index, index + 4);
        const chunk = `${stem}-chunk-${String(index / 4).padStart(2, '0')}`;
        const offset = index * 15;
        const text = group.map((unit: any) => unit.text).join('\n');
        if (!await exists(`${chunk}.mp3`)) {
          await execute('ffmpeg', ['-v', 'error', '-nostdin', '-n', '-ss', String(offset), '-i', `${root}/${stem}.mp3`,
            '-t', String(group.length * 15), '-c:a', 'libmp3lame', '-b:a', '192k', `${root}/${chunk}.mp3`]);
        }
        if (!await exists(`${chunk}-alignment.json`)) {
          const form = new FormData();
          form.append('file', new Blob([new Uint8Array(await readFile(`${root}/${chunk}.mp3`))], {type: 'audio/mpeg'}), `${chunk}.mp3`);
          form.append('text', text);
          await submit(`${chunk}-alignment`, 'forced-alignment', form, false, `${chunk}-alignment.json`);
        }
        const alignment = await load(`${chunk}-alignment`);
        const selected = alignment.characters.filter((character: any) => character.text !== '\r');
        assert.equal(selected.map((character: any) => character.text).join(''), text, `Alignment text mismatch: ${chunk}`);
        if (characters.length) characters.push({text: '\n', start: offset, end: offset});
        characters.push(...selected.map((character: any) => ({...character, start: character.start + offset, end: character.end + offset})));
        words.push(...alignment.words.map((word: any) => ({...word, start: word.start + offset, end: word.end + offset})));
        losses.push(alignment.loss);
        console.log(JSON.stringify({stage: 'chunk-aligned', batch: batch.index, firstVerse: group[0].verse, lastVerse: group.at(-1).verse}));
      }
      await save(`${stem}-alignment`, {characters, words, loss: losses.reduce((sum, value) => sum + value, 0) / losses.length, source: 'Short sections aligned independently at their enforced composition chunk offsets'});
      console.log(JSON.stringify({stage: 'alignment-saved', batch: batch.index}), null, 2);
    }
  }
  await credits(0);
  if (mode === 'music') { console.log(JSON.stringify({stage: 'all-music-saved'})); return; }
  for (const batch of plan.batches) {
    if (!await exists(`batch-${String(batch.index).padStart(2, '0')}-alignment.json`)) {
      console.log(JSON.stringify({stage: 'waiting-for-music', batch: batch.index}));
      return;
    }
  }
  await save('AUDIO-COMPLETE', {completedAt: new Date().toISOString(), batches: plan.batches.length, verseUnits: plan.units.length, pronunciationApproved: false});
  console.log(JSON.stringify({stage: 'audio-complete', batches: plan.batches.length, verses: plan.units.length}), null, 2);
}

main().catch(error => {
  console.error(error instanceof assert.AssertionError || String(error.message).startsWith('Provider rejected')
    ? error.message : 'Full song production stopped; inspect saved attempts. Credentials suppressed.');
  process.exitCode = 1;
}).finally(() => db.$disconnect());
