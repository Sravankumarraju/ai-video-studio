import { PrismaClient } from '@prisma/client';
import { decrypt, safeFetch } from '../lib/security';
import { storage } from '../lib/storage';
import { writeFile } from 'node:fs/promises';
const db = new PrismaClient();
async function main() {
  const asset = await db.asset.findUniqueOrThrow({ where: { id: process.argv[2] } });
  const metadata = asset.metadata as { profileId: string; prompt: string };
  const profile = await db.providerProfile.findUniqueOrThrow({ where: { id: metadata.profileId } });
  const config = profile.config as { baseUrl: string };
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(await storage.get(asset.storageKey))], { type: asset.mime }), 'narration.mp3');
  form.append('text', metadata.prompt);
  const response = await safeFetch(`${config.baseUrl.replace(/\/$/, '')}/forced-alignment`, {
    method: 'POST', headers: { 'xi-api-key': decrypt(profile.encryptedKey) }, body: form,
    signal: AbortSignal.timeout(180000),
  });
  if (!response.ok) throw Error(`Alignment request HTTP ${response.status}`);
  const result = await response.json();
  await writeFile(`/app/test-output/alignment-${asset.id}.json`, JSON.stringify(result));
  console.log(JSON.stringify({ assetId: asset.id, words: result.words?.length, loss: result.loss, saved: true }));
}
main().finally(() => db.$disconnect());
