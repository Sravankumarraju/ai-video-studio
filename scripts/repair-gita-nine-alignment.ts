import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {db} from '../lib/db';
import {decrypt} from '../lib/security';
import {providerSchema} from '../lib/schema';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
async function main(){
 const dir='data/productions/divine-wisdom/gita-chapter-9/story-v1';
 const state=JSON.parse(await readFile(`${dir}/state.json`,'utf8')),config=JSON.parse(await readFile(`${dir}/episode.json`,'utf8'));
 const batch=state.batches[14],bytes=await readFile(`${dir}/${batch.id}-recovered.mp3`),ledgerPath=`${dir}/alignment-repair-attempt.json`;
 let ledger=await readFile(ledgerPath,'utf8').then(JSON.parse).catch(e=>{if(e.code!=='ENOENT')throw e;return null});
 if(!ledger){
  const profile=await db.providerProfile.findUniqueOrThrow({where:{id:config.voiceProfileId}}),pc=providerSchema.parse(profile.config);
  ledger={authorization:'User approved one alignment request up to $0.05',maxUsd:.05,requests:1,recordingSeconds:86.125714,audioSha256:createHash('sha256').update(bytes).digest('hex'),state:'submitted',submittedAt:new Date().toISOString()};
  await writeFile(ledgerPath,JSON.stringify(ledger,null,2));
  const form=new FormData();form.append('file',new Blob([new Uint8Array(bytes)],{type:'audio/mpeg'}),'narration.mp3');form.append('text',batch.text);
  const response=await fetch(new URL('/v1/forced-alignment',pc.baseUrl),{method:'POST',headers:{'xi-api-key':decrypt(profile.encryptedKey)},body:form,signal:AbortSignal.timeout(180000)});
  const result=await response.json();await writeFile(`${dir}/repaired-alignment-provider.json`,JSON.stringify(result,null,2));
  ledger.httpStatus=response.status;ledger.state=response.ok?'response saved':'rejected';await writeFile(ledgerPath,JSON.stringify(ledger,null,2));assert(response.ok,`Alignment request HTTP ${response.status}`);
 }
 assert.equal(ledger.state,'response saved','Previous outcome requires review; no automatic retry');
 const result=JSON.parse(await readFile(`${dir}/repaired-alignment-provider.json`,'utf8'));
 const expected=batch.text.trim().split(/\s+/u),normalize=(s:string)=>s.normalize('NFC').replace(/[\p{P}\p{S}‌‍]/gu,'').trim();
 const spoken=result.words.filter((w:any)=>normalize(w.text));
 assert.deepEqual(spoken.map((w:any)=>normalize(w.text)),expected.map(normalize),'Alignment words differ from approved narration');
 const words=spoken.map((w:any,i:number)=>({text:expected[i],start:w.start,end:w.end}));
 assert(words.every((w:any)=>Number.isFinite(w.start)&&Number.isFinite(w.end)&&w.start>=0&&w.end>w.start));
 const client=new Client({name:'approved-caption-repair',version:'1'});
 await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`}}}));
 async function call(name:string,args:object){const r=await client.callTool({name,arguments:args});assert(!r.isError);return JSON.parse((r.content.find((x:any)=>x.type==='text') as any).text);}
 try{
  const project=await call('get_project',{projectId:config.projectId}),scene=project.document.scenes.find((s:any)=>s.id===batch.id);
  assert.equal(scene.narration,batch.text);assert(scene.audioId);assert(words.at(-1).end<=scene.duration+.25);
  await call('upsert_scene',{projectId:config.projectId,expectedRevision:project.revision,scene:{id:batch.id,narrationStale:false,captionsStale:false,status:'Original recovered audio; independently aligned captions reviewed',captions:[{id:crypto.randomUUID(),start:words[0].start,end:words.at(-1).end,text:batch.text,accuracy:'aligned',words}]}});
  await writeFile(`${dir}/alignment-repair-verification.json`,JSON.stringify({sourceId:batch.id,words:words.length,loss:result.loss,exactApprovedWords:true,positiveWordTiming:true,lastWordEnd:words.at(-1).end,audioSeconds:scene.duration,newNarrationCallMade:false,alignmentCalls:1,approvedMaximumUsd:.05},null,2));
  console.log(JSON.stringify({repaired:true,words:words.length,loss:result.loss,newNarrationCallMade:false}));
 }finally{await client.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
