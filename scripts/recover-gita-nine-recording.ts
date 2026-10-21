import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {db} from '../lib/db';
import {decrypt} from '../lib/security';
import {providerSchema} from '../lib/schema';
import {narrationTiming} from '../lib/alignment';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
async function main(){
 const dir='data/productions/divine-wisdom/gita-chapter-9/story-v1';
 const state=JSON.parse(await readFile(`${dir}/state.json`,'utf8'));
 const config=JSON.parse(await readFile(`${dir}/episode.json`,'utf8'));
 const detail=JSON.parse(await readFile(`${dir}/interrupted-narration-history.json`,'utf8'));
 const batch=state.batches[14],jobId=state.jobs[batch.id];
 assert.equal(detail.history_item_id,'SblSGfeRzbu5656mdI6Y');
 assert.equal(detail.model_id,'eleven_v4');assert.equal(detail.dialogue.length,1);
 assert.equal(detail.dialogue[0].text,batch.text);assert.equal(detail.dialogue[0].voice_id,config.voiceId);
 const alignment=detail.alignments.alignment;assert.equal(alignment.characters.join(''),batch.text);
 const job=await db.job.findUniqueOrThrow({where:{id:jobId}});
 assert(['waiting-for-input','completed'].includes(job.state));
 const client=new Client({name:'recover-saved-chapter-recording',version:'1'});
 await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`}}}));
 async function call(name:string,args:object){const r=await client.callTool({name,arguments:args});assert(!r.isError);return JSON.parse((r.content.find((x:any)=>x.type==='text') as any).text);}
 try{
  let project=await call('get_project',{projectId:config.projectId});
  let scene=project.document.scenes.find((s:any)=>s.id===batch.id);assert.equal(scene.narration,batch.text);
  let assetId=scene.audioId;
  if(!assetId){
   const saved=project.assets.find((a:any)=>a.name===`${batch.id}-recovered.mp3`);
   let asset=saved;
   if(!asset){
   const profile=await db.providerProfile.findUniqueOrThrow({where:{id:config.voiceProfileId}}),pc=providerSchema.parse(profile.config);
   const response=await fetch(new URL(`/v1/history/${detail.history_item_id}/audio`,pc.baseUrl),{headers:{'xi-api-key':decrypt(profile.encryptedKey)},signal:AbortSignal.timeout(30000)});assert(response.ok);
   const bytes=Buffer.from(await response.arrayBuffer());await writeFile(`${dir}/${batch.id}-recovered.mp3`,bytes);
   asset=await call('import_asset',{projectId:config.projectId,name:`${batch.id}-recovered.mp3`,base64:bytes.toString('base64')});
   }
   assetId=asset.id;
   project=await call('get_project',{projectId:config.projectId});
   const timing=narrationTiming(alignment,asset.duration);
   await call('upsert_scene',{projectId:config.projectId,expectedRevision:project.revision,scene:{id:batch.id,audioId:assetId,duration:asset.duration,...timing,status:timing.narrationStale?'Original recording recovered; caption alignment requires repair':'Original paid narration recovered from provider history'}});
  }
  assert(assetId);
  await db.job.update({where:{id:jobId},data:{state:'completed',stage:'Recovered original recording',error:null,result:{assetId,applied:true,recovered:true,historyItemId:detail.history_item_id,providerRequestId:detail.request_id,newPaidCallMade:false}}});
  await writeFile(`${dir}/narration-recovery.json`,JSON.stringify({jobId,assetId,historyItemId:detail.history_item_id,exactTextAndVoiceVerified:true,alignmentVerified:false,alignmentRepairRequired:true,newPaidCallMade:false,recoveredAt:new Date().toISOString()},null,2));
  console.log(JSON.stringify({jobId,assetId,recovered:true,newPaidCallMade:false}));
 }finally{await client.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
