import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {db} from '../lib/db';
import {decrypt} from '../lib/security';
const root='data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12/video-02-recitation/priest-chant-full-v4';
async function main(){
 const attempt=JSON.parse(await readFile(`${root}/batch-02-attempt.json`,'utf8'));const plan=JSON.parse(await readFile(`${root}/plan.json`,'utf8'));
 let key=process.env.ELEVENLABS_API_KEY;if(!key||/^(<|PASTE|your)/i.test(key))key=decrypt((await db.providerProfile.findUniqueOrThrow({where:{id:'7e994f10-1088-464c-91fb-79297b8fd6cb'}})).encryptedKey);
 const r=await fetch(`https://api.elevenlabs.io/v1/history/${attempt.historyItemId}`,{headers:{'xi-api-key':key!},signal:AbortSignal.timeout(60000)});assert(r.ok);const d=await r.json();assert(d.dialogue[0].text===plan.batches[2].text&&d.dialogue[0].voice_id===plan.voiceId);
 await writeFile(`${root}/batch-02-history-detail.json`,JSON.stringify(d,null,2));
 console.log(JSON.stringify({state:d.state,alignmentKeys:Object.keys(d.alignments||{}),alignmentShapes:Object.fromEntries(Object.entries(d.alignments||{}).map(([k,v]:any)=>[k,{keys:Object.keys(v||{}),characterCount:v?.characters?.length,lastStart:v?.character_start_times_seconds?.slice(-6),lastEnd:v?.character_end_times_seconds?.slice(-6)}]))}));
}
main().catch(()=>{console.error('Read-only history check stopped; credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
