import 'dotenv/config';
import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {db} from '../lib/db';
import {decrypt} from '../lib/security';

const root = 'data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12/full-sung-v2-approved-2026-10-15/channel-edition';
const voiceId = 'sJrRcQEpUbZehhGBdEbD';
const save = (name: string, value: unknown) => writeFile(`${root}/${name}.json`, JSON.stringify(value, null, 2));
async function exists(name: string) {
  try { await readFile(`${root}/${name}`); return true; }
  catch (error: any) { if (error.code === 'ENOENT') return false; throw error; }
}

async function main() {
  await mkdir(root, {recursive: true});
  const sections = [
    {name: 'welcome', text: 'డివైన్ విజ్డమ్ తెలుగు ఛానల్‌కు స్వాగతం. ఇప్పుడు శ్రీ లలితా సహస్రనామ స్తోత్రాన్ని మధురమైన భక్తి సంగీతంతో ఆలకిద్దాం.'},
    {name: 'closing', text: 'ఈ శ్రీ లలితా సహస్రనామం మీకు నచ్చితే, మా డివైన్ విజ్డమ్ తెలుగు ఛానల్‌ను సబ్‌స్క్రైబ్ చేయండి. ఈ వీడియోను లైక్ చేయండి, షేర్ చేయండి. మీ అభిప్రాయాన్ని కామెంట్‌లో తెలియజేయండి. శ్రీమాత అనుగ్రహం మీ అందరికీ కలగాలి.'}
  ];
  await save('plan', {channelName: 'Divine Wisdom Telugu', voiceId, model: 'eleven_v4', sections,
    authorization: 'User requested a channel welcome introducing Sri Lalita Sahasranamam and a closing subscribe, like, share and comment request.',
    originalSongMustRemainUnchanged: true, publishApproved: false, maximumNewNarrationCalls: 2});
  const pending = [];
  for (const section of sections) if (!await exists(`${section.name}.mp3`)) pending.push(section);
  if (!pending.length) { console.log('Both channel narration sections are already saved.'); return; }
  let key = process.env.ELEVENLABS_API_KEY;
  if (!key || /^(<|PASTE|your)/i.test(key)) {
    key = decrypt((await db.providerProfile.findUniqueOrThrow({where: {id: '7e994f10-1088-464c-91fb-79297b8fd6cb'}})).encryptedKey);
  }
  const headers = {'xi-api-key': key!, Connection: 'close'};
  const check = await fetch('https://api.elevenlabs.io/v1/user/subscription', {headers, signal: AbortSignal.timeout(30000)});
  assert(check.ok, 'Credit check failed');
  const info = await check.json();
  const remaining = Number(info.character_limit) - Number(info.character_count);
  assert(info.tier !== 'free' && remaining >= pending.reduce((sum, section) => sum + section.text.length, 0) * 2 + 1000, 'Insufficient included credits; no overage');
  await save('credit-check', {remainingCredits: remaining, tier: info.tier});
  for (const section of pending) {
    assert(!await exists(`${section.name}-attempt.json`), 'Existing narration attempt; inspect before retrying');
    const request = {inputs: [{text: section.text, voice_id: voiceId}], model_id: 'eleven_v4', language_code: 'te'};
    await save(`${section.name}-request`, request);
    const record: any = {state: 'submitted', submittedAt: new Date().toISOString(), characters: section.text.length, maximumCalls: 1};
    await save(`${section.name}-attempt`, record);
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/text-to-dialogue/with-timestamps', {
        method: 'POST', headers: {...headers, 'Content-Type': 'application/json'}, body: JSON.stringify(request), signal: AbortSignal.timeout(180000)
      });
      record.httpStatus = response.status;
      if (!response.ok) { record.state = 'rejected'; await save(`${section.name}-attempt`, record); throw Error('Narration rejected'); }
      const result = await response.json();
      assert(result.audio_base64 && result.alignment, 'Missing voice audio or timestamps');
      await writeFile(`${root}/${section.name}.mp3`, Buffer.from(result.audio_base64, 'base64'));
      await save(`${section.name}-alignment`, result.alignment);
      record.state = 'completed'; record.completedAt = new Date().toISOString();
      await save(`${section.name}-attempt`, record);
      console.log(JSON.stringify({section: section.name, state: 'completed'}));
    } catch (error) {
      if (record.state === 'submitted') { record.state = 'unknown'; await save(`${section.name}-attempt`, record); }
      throw error;
    }
  }
}
main().catch(error => {
  console.error(error instanceof assert.AssertionError ? error.message : 'Channel narration stopped; inspect saved attempts. Credentials suppressed.');
  process.exitCode = 1;
}).finally(() => db.$disconnect());
