import 'dotenv/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
const dir='data/productions/divine-wisdom/gita-1-2-1-3', projectId='ac6507e4-bccd-4344-a918-165df79bc4a5', profileId='7e994f10-1088-464c-91fb-79297b8fd6cb';
const mode=process.argv[2] || 'status';
await mkdir(dir,{recursive:true});
const state=JSON.parse(await readFile(`${dir}/production-state.json`,'utf8'));
const save=()=>writeFile(`${dir}/production-state.json`,JSON.stringify(state,null,2));
const token=process.env.STORY_STUDIO_MCP_TOKEN;
if(!token) throw Error('Connector token missing');
const client=new Client({name:'gita-123-production',version:'1.0'});
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${token}`,Connection:'close'}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args});const t=r.content.find(c=>c.type==='text')?.text;if(r.isError||!t)throw Error(t||'Missing response');return JSON.parse(t);}
async function ownerSession(){const r=await fetch('http://localhost:3000/api/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost:3000',Connection:'close'},body:JSON.stringify({password:process.env.OWNER_PASSWORD})});if(!r.ok)throw Error('Owner sign-in failed');return r.headers.get('set-cookie')?.split(';')[0];}
try {
 if(mode==='retry-series'){
  const cookie=await ownerSession();
  for(const [sceneId,jobId] of Object.entries(state.voiceJobs)){
   let j=await call('get_job',{jobId});if(['completed','stale'].includes(j.state))continue;
   if(j.state!=='failed'||!j.error?.includes('HTTP 429'))throw Error(`Unexpected job state: ${j.state}`);
   const r=await fetch(`http://localhost:3000/api/jobs/${jobId}/retry`,{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie,Origin:'http://localhost:3000',Connection:'close'},body:JSON.stringify({acknowledgeNewCharge:false})});if(!r.ok)throw Error(`Retry failed ${r.status}`);
   console.log(JSON.stringify({retrying:sceneId,jobId}));
   for(let n=0;n<120;n++){await new Promise(resolve=>setTimeout(resolve,2000));j=await call('get_job',{jobId});if(['completed','stale','failed','waiting-for-input','cancelled'].includes(j.state))break;}
   if(!['completed','stale'].includes(j.state))throw Error(`Narration retry did not complete: ${j.state}, ${j.error}`);
   console.log(JSON.stringify({completed:sceneId,assetId:j.result.assetId}));await new Promise(resolve=>setTimeout(resolve,4000));
  }
 }
 if(mode==='retry-one'){
  const sceneId=process.argv[3],jobId=state.voiceJobs[sceneId];if(!jobId)throw Error('Scene job missing');
  const j=await call('get_job',{jobId});if(j.state!=='failed'||!j.error?.includes('HTTP 429'))throw Error('Only a confirmed failed HTTP 429 job can be retried');
  const r=await fetch(`http://localhost:3000/api/jobs/${jobId}/retry`,{method:'POST',headers:{'Content-Type':'application/json',Cookie:await ownerSession(),Origin:'http://localhost:3000',Connection:'close'},body:JSON.stringify({acknowledgeNewCharge:false})});
  const d=await r.json();if(!r.ok)throw Error(JSON.stringify(d));state.voiceJobs[sceneId]=d.id||jobId;await save();console.log(JSON.stringify({retried:true,sceneId,jobId:state.voiceJobs[sceneId]}));
 }
 if(mode==='provider-status'){
  const key=process.env.ELEVENLABS_API_KEY;if(!key)throw Error('ElevenLabs process key unavailable');
  const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key}}),d=await r.json();
  console.log(JSON.stringify({http:r.status,status:d.status,tier:d.tier,characterCount:d.character_count,characterLimit:d.character_limit,canExtend:d.can_extend_character_limit,detail:d.detail}));
 }
 if(mode==='recover-voices'){
  const cookie=await ownerSession(),headers={Cookie:cookie,Connection:'close'};
  const ownerProject=async()=>{const r=await fetch(`http://localhost:3000/api/projects/${projectId}`,{headers});if(!r.ok)throw Error('Project read failed');return r.json();};
  const p=await ownerProject();
  for(const s of p.document.scenes){if(s.audioId&&!s.narrationStale)continue;const jobId=state.voiceJobs[s.id];if(!jobId)continue;const j=await call('get_job',{jobId});if(j.state!=='completed'||!j.result?.assetId)continue;
   const latest=await ownerProject(),asset=latest.assets.find(a=>a.id===j.result.assetId),old=latest.document.scenes.find(x=>x.id===s.id);
   if(old.narration!==s.narration||!asset?.duration)throw Error('Narration changed or generated asset is missing');
   const alignment=asset.metadata?.alignment||asset.metadata?.normalized_alignment;
   if(!alignment)throw Error('Provider alignment unavailable on saved asset');
   const {narrationTiming}=await import('../lib/alignment.ts');const timing=narrationTiming(alignment,asset.duration);
   if(timing.narrationStale)throw Error('Saved timing requires review');
   await call('upsert_scene',{projectId,expectedRevision:latest.revision,scene:{id:s.id,audioId:asset.id,duration:asset.duration,audioStart:0,audioSlice:false,...timing}});
   console.log(JSON.stringify({recovered:s.title,assetId:asset.id,duration:asset.duration}));
  }
 }
 if(mode==='policy'){
  const p=await call('get_project',{projectId});
  await writeFile(`${dir}/before-production.json`,JSON.stringify(p,null,2));
  if(p.document.unknownCostPolicy!=='allow'){
   const r=await fetch('http://localhost:3000/api/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost:3000',Connection:'close'},body:JSON.stringify({password:process.env.OWNER_PASSWORD})});
   if(!r.ok)throw Error('Owner sign-in failed');
   const cookie=r.headers.get('set-cookie')?.split(';')[0];if(!cookie)throw Error('Owner session missing');
   const doc=structuredClone(p.document);doc.unknownCostPolicy='allow';
   const u=await fetch(`http://localhost:3000/api/projects/${projectId}`,{method:'PATCH',headers:{'Content-Type':'application/json',Cookie:cookie,Origin:'http://localhost:3000',Connection:'close'},body:JSON.stringify({revision:p.revision,document:doc})});
   if(!u.ok)throw Error(`Policy save failed: ${u.status} ${await u.text()}`);
  }
  const now=await call('get_project',{projectId});if(now.document.unknownCostPolicy!=='allow'||now.document.generationLimit!==p.document.generationLimit||now.document.budget!==p.document.budget)throw Error('Policy verification failed');
  state.status='production-ready';await save();console.log(JSON.stringify({policy:'allow',budget:now.document.budget,generationLimit:now.document.generationLimit}));
 }
 if(mode==='voices'){
  const p=await call('get_project',{projectId});
  for(const s of p.document.scenes){if(s.audioId&&!s.narrationStale)continue;if(!state.voiceJobs[s.id]){const j=await call('queue_generation',{projectId,sceneId:s.id,kind:'voice',profileId,paidConfirmed:true});state.voiceJobs[s.id]=j.id;await save();console.log(JSON.stringify({scene:s.title,jobId:j.id}));}}
 }
 if(mode==='status'){
  const p=await call('get_project',{projectId});
  const pending=[];for(const [sceneId,jobId] of Object.entries(state.voiceJobs)){const j=await call('get_job',{jobId});if(!['completed','stale'].includes(j.state))pending.push({sceneId,jobId,state:j.state,stage:j.stage,error:j.error});}
  console.log(JSON.stringify({revision:p.revision,images:p.document.scenes.filter(s=>s.assetId).length,voices:p.document.scenes.filter(s=>s.audioId&&!s.narrationStale).length,scenes:p.document.scenes.length,pending}));
  for(const [kind,jobId] of Object.entries(state.renderJobs))console.log(JSON.stringify({kind,...await call('get_job',{jobId})}));
 }
 if(mode==='image'){
  const index=Number(process.argv[3]), source=process.argv[4], p=await call('get_project',{projectId}), s=p.document.scenes[index];
  if(!s||!source)throw Error('Usage: image <zero-based-scene-index> <source-path>');
  const file=`${dir}/scene-${String(index+1).padStart(2,'0')}${path.extname(source)||'.png'}`;await copyFile(source,file);
  if(!state.imageAssets[s.id]){const a=await call('import_asset',{projectId,name:path.basename(file),base64:(await readFile(file)).toString('base64')});state.imageAssets[s.id]=a.id;await save();}
  const latest=await call('get_project',{projectId});await call('upsert_scene',{projectId,expectedRevision:latest.revision,scene:{id:s.id,assetId:state.imageAssets[s.id],motion:index%2?'zoom-out':'zoom-in',strength:0.09,focalY:0.45,transition:'cut',overlap:0}});
  console.log(JSON.stringify({scene:index+1,assetId:state.imageAssets[s.id],file}));
 }
 if(mode==='finish'){
  const p=await call('get_project',{projectId}),doc=p.document;
  if(doc.scenes.some(s=>!s.assetId||!s.audioId||s.narrationStale))throw Error('Media or narration is missing');
  const seg=new Intl.Segmenter('te',{granularity:'grapheme'}),len=t=>Array.from(seg.segment(t)).length;
  for(const s of doc.scenes){const words=s.captions.flatMap(c=>c.words||[]);if(!words.length)throw Error(`Aligned captions missing: ${s.title}`);let group=[],lines=[''];const cues=[];
   const flush=()=>{if(!group.length)return;cues.push({id:crypto.randomUUID(),start:group[0].start,end:group.at(-1).end,text:lines.join('\n'),accuracy:'aligned',words:group});group=[];lines=[''];};
   for(const w of words){const next=[...lines],i=next.length-1,t=next[i]?next[i]+' '+w.text:w.text;if(len(t)>20&&next[i])next.push(w.text);else next[i]=t;if(next.length>2||group.length>=5){flush();lines=[w.text];}else lines=next;group.push(w);if(/[.!?।॥]$/u.test(w.text))flush();}flush();
   for(let i=cues.length-1;i>0;i--)if(/^[\s\p{P}]+$/u.test(cues[i].text)){cues[i-1].text+=' '+cues[i].text.trim();cues[i-1].end=cues[i].end;cues[i-1].words.push(...cues[i].words);cues.splice(i,1);}
   for(let i=0;i<cues.length;i++)cues[i].end=Math.min(s.duration,cues[i+1]?.start??s.duration,cues[i].end+0.16);
   s.captions=cues;s.captionsStale=false;s.status='Ready to render';s.volume=1.15;s.fadeIn=0;s.fadeOut=0;
  }
  for(const v of doc.variants){v.font='Noto Sans Telugu';v.fontSize=84;v.background=true;v.wordHighlight=false;}
  let elapsed=0;const chapters=[];
  for(const section of doc.video.generated.sections){chapters.push(`${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(Math.floor(elapsed%60)).padStart(2,'0')} ${section.title}`);const start=doc.video.generated.sections.slice(0,chapters.length-1).reduce((n,x)=>n+x.scenes.length,0);elapsed+=doc.scenes.slice(start,start+section.scenes.length).reduce((n,s)=>n+s.duration,0);}
  doc.video.generated.metadata.chapters=chapters.join('\n');
  await call('update_project',{projectId,expectedRevision:p.revision,document:doc});
  const now=await call('get_project',{projectId});await writeFile(`${dir}/completed-timeline.json`,JSON.stringify(now,null,2));
  state.status='ready-to-render';await save();console.log(JSON.stringify({ready:true,seconds:doc.scenes.reduce((n,s)=>n+s.duration,0)}));
 }
 if(['draft','full'].includes(mode)){
  if(!state.renderJobs[mode]){const j=await call('queue_render',{projectId,variantId:state.variantId,draft:mode==='draft'});state.renderJobs[mode]=j.id;await save();}console.log(JSON.stringify(await call('get_job',{jobId:state.renderJobs[mode]})));
 }
 if(mode==='download'){
  const kind=process.argv[3]||'full',jobId=state.renderJobs[kind],j=await call('get_job',{jobId});if(!['completed','stale'].includes(j.state))throw Error('Render not complete');
  for(const f of ['mp4','srt','vtt']){const r=await fetch(`http://localhost:3000/api/mcp/files/jobs/${jobId}/download?format=${f}`,{headers:{Authorization:`Bearer ${token}`,Connection:'close'}});if(!r.ok)throw Error('Download failed');await writeFile(`${dir}/gita-1-2-1-3-${kind}.${f}`,Buffer.from(await r.arrayBuffer()));}console.log(JSON.stringify({downloaded:true,kind,result:j.result}));
 }
}finally{await client.close();}
