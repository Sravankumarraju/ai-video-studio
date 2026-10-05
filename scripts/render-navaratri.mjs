import 'dotenv/config';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const phase=process.argv[2];assert(['previews','finals'].includes(phase));
const plan=JSON.parse(await readFile('data/productions/divine-wisdom/devi-navaratri-2026/production-plan.json','utf8'));
const client=new Client({name:'navaratri-render-checks',version:'1.0'});
assert(process.env.STORY_STUDIO_MCP_TOKEN);
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`}}}));
const state=v=>readFile(v.dir+'/state.json','utf8').then(JSON.parse);
async function call(name,args){for(let attempt=0;attempt<3;attempt++){try{const r=await client.callTool({name,arguments:args});assert(!r.isError);return JSON.parse(r.content.find(c=>c.type==='text').text);}catch(error){if(attempt===2||name!=='get_job')throw error;console.log('Reconnecting a transient job-status read');await new Promise(r=>setTimeout(r,2000));}}}
const run=(v,mode,kind)=>execFileSync(process.execPath,['scripts/divine-long-episode.mjs',v.dir,mode,...(kind?[kind]:[])],{stdio:'inherit',env:process.env});
async function completed(id){let previous='';for(;;){const job=await call('get_job',{jobId:id});const status=job.state+':'+job.stage;if(status!==previous){console.log(JSON.stringify({jobId:id,state:job.state,stage:job.stage}));previous=status;}if(job.state==='completed')return job;assert(!['failed','cancelled','stale','waiting-for-input'].includes(job.state),job.error||job.state);await new Promise(r=>setTimeout(r,15000));}}
try{
 const kind=phase==='previews'?'draft':'full';
 for(const video of plan.videos){
  const saved=await state(video);
  if(phase==='previews'){
   for(const batch of saved.batches){let current=await state(video);while(!current.jobs[batch.id]){await new Promise(r=>setTimeout(r,15000));current=await state(video);}await completed(current.jobs[batch.id]);}
   run(video,'finish');run(video,'assemble');
  }else{
   let check;
   for(;;){try{check=JSON.parse(await readFile(video.dir+'/verification-draft.json','utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
    if(check?.decodedEntireFile&&check.visualEdition===(await state(video)).graceEdition)break;
    console.log(JSON.stringify({slug:video.slug,waitingFor:'corrected preview verification'}));await new Promise(r=>setTimeout(r,15000));}
   assert(check.seconds<=300);
  }
  run(video,kind);
 }
 for(const video of plan.videos){
  await completed((await state(video)).renderJobs[kind]);run(video,'download',kind);
  execFileSync(process.execPath,['scripts/divine-long-episode-check.mjs',video.dir,kind],{stdio:'inherit',env:process.env});
  console.log(JSON.stringify({slug:video.slug,verified:kind}));
  if(kind==='full')execFileSync(process.execPath,['scripts/navaratri-delivery-report.mjs'],{stdio:'inherit',env:process.env});
 }
}finally{await client.close();}
