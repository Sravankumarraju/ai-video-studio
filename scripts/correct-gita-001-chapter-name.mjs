import 'dotenv/config';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const dir='data/productions/divine-wisdom/gita-1-1/chapter-name-v5';
const projectId='a39b4823-f4d4-436b-be68-7d6694418d36',variantId='gita-1-1-te-chapter-name-v5',mode=process.argv[2]||'status';
await mkdir(dir,{recursive:true});
let state;try{state=JSON.parse(await readFile(`${dir}/production-state.json`,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;state={projectId,variantId,renderJobs:{}};}
const save=()=>writeFile(`${dir}/production-state.json`,JSON.stringify(state,null,2));
const token=process.env.STORY_STUDIO_MCP_TOKEN;assert(token,'Connector token unavailable');
const client=new Client({name:'correct-gita-001-chapter-name',version:'1.0'});
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${token}`,Connection:'close'}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args});const t=r.content.find(c=>c.type==='text')?.text;if(r.isError||!t)throw Error(t||'No response');return JSON.parse(t);}
try{
 if(mode==='assemble'){
  const p=await call('get_project',{projectId}),d=p.document,base=d.variants.find(v=>v.id==='gita-1-1-te-refined-v4');assert(base);
  if(!d.variants.some(v=>v.id===variantId)){
   await writeFile(`${dir}/before-recreation.json`,JSON.stringify(p,null,2));
   if(!state.audio){
    execFileSync('ffmpeg',['-v','error','-y','-i','data/productions/divine-wisdom/gita-chapter-1/audio-corrected-v5/chapter-name-finished.wav','-t','5.4','-c:a','pcm_s16le',`${dir}/chapter-name.wav`]);
    const a=await call('import_asset',{projectId,name:'episode-001-chapter-name.wav',base64:(await readFile(`${dir}/chapter-name.wav`)).toString('base64')});
    state.audio={id:a.id,duration:a.duration};await save();
   }
   const id='gita-001-v4-title',original=base.sceneOverrides[id]||d.scenes.find(s=>s.id===id);assert(original);assert.equal(original.duration,3);
   const text='భగవద్గీత మొదటి అధ్యాయం పేరు అర్జున విషాద యోగం.';
   const title={...structuredClone(original),title:'భగవద్గీత · అధ్యాయం 1 · అర్జున విషాద యోగం · శ్లోకం 1',narration:text,audioId:state.audio.id,audioStart:0,audioSlice:true,duration:state.audio.duration,narrationStale:false,captionsStale:false,captions:[{id:'gita-001-v5-chapter-title',start:0,end:state.audio.duration,text:'భగవద్గీత · అధ్యాయం 1\nఅర్జున విషాద యోగం\nశ్లోకం 1',accuracy:'manual',display:'full-verse'}]};
   const v=structuredClone(base);v.id=variantId;v.name='Divine Wisdom Telugu · Episode 001 · spoken chapter name';v.sceneOverrides={...v.sceneOverrides,[id]:title};
   const delta=title.duration-original.duration;
   const shift=line=>line.replace(/^(\d+):(\d{2}) /,(_,m,s)=>{const old=Number(m)*60+Number(s),n=Math.floor(old+(old>3?delta:0));return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')} `;});
   v.publishing.chapters=v.publishing.chapters.split('\n').map(shift).join('\n');v.publishing.description=v.publishing.description.split('\n').map(shift).join('\n');
   d.variants.push(v);await writeFile(`${dir}/proposed.json`,JSON.stringify({revision:p.revision,document:d}));await call('update_project',{projectId,expectedRevision:p.revision,document:d});state.assembled=true;state.seconds=base.sceneIds.reduce((n,id)=>n+(v.sceneOverrides[id]||d.scenes.find(s=>s.id===id)).duration,0);await save();
  }
  let after=await call('get_project',{projectId});
  const corrected=after.document.variants.find(v=>v.id===variantId).sceneOverrides['gita-001-v4-title'];
  if(corrected.narrationStale||corrected.captionsStale){corrected.narrationStale=false;corrected.captionsStale=false;await call('update_project',{projectId,expectedRevision:after.revision,document:after.document});after=await call('get_project',{projectId});}
  state.assembled=true;state.seconds=after.document.variants.find(v=>v.id===variantId).sceneIds.reduce((n,id)=>n+(after.document.variants.find(v=>v.id===variantId).sceneOverrides[id]||after.document.scenes.find(s=>s.id===id)).duration,0);await save();
  await writeFile(`${dir}/completed-timeline.json`,JSON.stringify(after,null,2));
  const before=JSON.parse(await readFile(`${dir}/before-recreation.json`,'utf8')).document;
  for(const s of before.scenes)assert.deepEqual(after.document.scenes.find(n=>n.id===s.id),s);
  for(const v of before.variants)assert.deepEqual(after.document.variants.find(n=>n.id===v.id),v);
  const v=after.document.variants.find(v=>v.id===variantId);assert.deepEqual(v.sceneIds,base.sceneIds);
  for(const id of base.sceneIds.filter(id=>id!=='gita-001-v4-title'))assert.deepEqual(v.sceneOverrides[id],base.sceneOverrides[id]);
  await writeFile(`${dir}/preservation-check.json`,JSON.stringify({originalScenesAndVariantsPreserved:true,onlyOpeningTitleChanged:true,newPaidCalls:0,seconds:state.seconds},null,2));
  await writeFile(`${dir}/publishing-package.json`,JSON.stringify(v.publishing,null,2));console.log(JSON.stringify({assembled:true,seconds:state.seconds}));
 }
 if(mode==='full'){
  assert(state.assembled);if(state.renderJobs.full&&(await call('get_job',{jobId:state.renderJobs.full})).state==='failed'){state.renderJobs.previous=state.renderJobs.full;delete state.renderJobs.full;await save();}
  if(!state.renderJobs.full){state.renderJobs.full=(await call('queue_render',{projectId,variantId,draft:false})).id;await save();}
 }
 if(['full','status'].includes(mode)&&state.renderJobs.full){const j=await call('get_job',{jobId:state.renderJobs.full});console.log(JSON.stringify({id:j.id,state:j.state,progress:j.progress,error:j.error,result:j.result}));}
 if(mode==='download'){
  const jobId=state.renderJobs.full,j=await call('get_job',{jobId});assert.equal(j.state,'completed');
  for(const format of ['mp4','srt','vtt']){const r=await fetch(`http://localhost:3000/api/mcp/files/jobs/${jobId}/download?format=${format}`,{headers:{Authorization:`Bearer ${token}`,Connection:'close'}});assert(r.ok);await writeFile(`${dir}/episode-001-full.${format}`,Buffer.from(await r.arrayBuffer()));}
  state.status='downloaded';await save();console.log('Downloaded corrected Episode 001');
 }
}finally{await client.close();}
