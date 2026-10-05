import 'dotenv/config';
import {readFile,writeFile,mkdir,copyFile,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const old='data/productions/divine-wisdom/gita-chapter-1/visual-v2',dir='data/productions/divine-wisdom/gita-chapter-1/clear-labels-v3';
const read=(file)=>readFile(file,'utf8').then(JSON.parse),exists=file=>access(file).then(()=>true).catch(()=>false);
await mkdir(dir,{recursive:true});
const original=await read(`${old}/episode.json`),oldState=await read(`${old}/state.json`),before=await read(`${old}/completed-timeline.json`);
const state=await read(`${dir}/state.json`).catch(e=>{if(e.code!=='ENOENT')throw e;return {projectId:original.projectId,variantId:'gita-chapter-1-te-clear-labels-v3',labelJobs:{},labelAudio:{},replacementAudio:{},renderJobs:{}};});
const save=()=>writeFile(`${dir}/state.json`,JSON.stringify(state,null,2));
const client=new Client({name:'chapter-clear-labels',version:'1'});
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`,Connection:'close'}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args});const t=r.content.find(c=>c.type==='text')?.text;assert(!r.isError,t);return JSON.parse(t);}
const get=()=>call('get_project',{projectId:state.projectId});
const ones=['','ఒకటి','రెండు','మూడు','నాలుగు','ఐదు','ఆరు','ఏడు','ఎనిమిది','తొమ్మిది','పది','పదకొండు','పన్నెండు','పదమూడు','పద్నాలుగు','పదిహేను','పదహారు','పదిహేడు','పద్దెనిమిది','పంతొమ్మిది'];
const number=n=>n<20?ones[n]:({20:'ఇరవై',30:'ముప్పై',40:'నలభై'}[Math.floor(n/10)*10]+(n%10?' '+ones[n%10]:''));
const label=n=>`అధ్యాయం ఒకటి, శ్లోకం ${number(n)}.`;
const batches=Array.from({length:4},(_,k)=>{const numbers=Array.from({length:Math.min(12,47-k*12)},(_,i)=>k*12+i+1);return {id:`chapter-clear-label-source-${k}`,numbers,text:numbers.map(label).join('\n\n')};});
async function wait(id){let prev='';for(;;){const j=await call('get_job',{jobId:id});if(j.state+':'+j.stage!==prev){console.log(JSON.stringify({jobId:id,state:j.state,stage:j.stage,error:j.error}));prev=j.state+':'+j.stage;}if(j.state==='completed')return j;assert(!['failed','cancelled','stale','waiting-for-input'].includes(j.state),j.error||j.state);await new Promise(r=>setTimeout(r,6000));}}
async function asset(file){return JSON.parse(execFileSync(process.execPath,['--import','tsx','scripts/upload-owner-asset.ts',state.projectId,file],{encoding:'utf8',maxBuffer:1024*1024})).id;}
const ff=(args)=>execFileSync('ffmpeg',['-v','error','-y',...args],{stdio:'pipe'});
const duration=file=>Number(JSON.parse(execFileSync('ffprobe',['-v','error','-show_format','-of','json',file],{encoding:'utf8'})).format.duration);
try{
 if(!state.prepared){const p=await get();await writeFile(`${dir}/before-production.json`,JSON.stringify(p,null,2));assert(p.document.scenes.length+4<=200);assert.equal(p.document.unknownCostPolicy,'allow');
  for(const b of batches)if(!p.document.scenes.some(s=>s.id===b.id))p.document.scenes.push({id:b.id,title:'Clear chapter and verse labels',narration:b.text,voiceId:original.voiceId,providers:{voice:'7e994f10-1088-464c-91fb-79297b8fd6cb'},modes:{voice:'api'},duration:60});
  await call('update_project',{projectId:p.id,expectedRevision:p.revision,document:p.document});state.prepared=true;await save();
 }
 for(const b of batches){if(!state.labelJobs[b.id]){state.labelJobs[b.id]=(await call('queue_generation',{projectId:state.projectId,sceneId:b.id,kind:'voice',profileId:'7e994f10-1088-464c-91fb-79297b8fd6cb',paidConfirmed:true})).id;await save();}await wait(state.labelJobs[b.id]);
  if(!state.labelAudio[b.id]){const p=await get(),s=p.document.scenes.find(s=>s.id===b.id);assert(s.audioId&&!s.narrationStale);const r=await fetch(`http://localhost:3000/api/mcp/files/assets/${s.audioId}`,{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`}});assert(r.ok);const raw=`${dir}/${b.id}.mp3`,finished=`${dir}/${b.id}.wav`;await writeFile(raw,Buffer.from(await r.arrayBuffer()));const ratio=2**(.5/12),rate=Number(JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-of','json',raw],{encoding:'utf8'})).streams.find(s=>s.codec_type==='audio').sample_rate);ff(['-i',raw,'-af',`asetrate=${rate}*${ratio},aresample=48000,atempo=${1/ratio},bass=g=3:f=110:w=0.6`,'-c:a','pcm_s16le',finished]);
   const words=s.captions.flatMap(c=>c.words||[]);assert.deepEqual(words.map(w=>w.text.replace(/[\p{P}\p{S}]/gu,'')),b.text.split(/\s+/u).map(w=>w.replace(/[\p{P}\p{S}]/gu,'')));state.labelAudio[b.id]={file:finished,words,duration:duration(finished)};await save();
  }
 }
 const overrides={},changes=[];for(const b of batches){const source=state.labelAudio[b.id];let offset=0;for(let k=0;k<b.numbers.length;k++){
  const n=b.numbers[k],count=label(n).split(/\s+/u).length,lw=source.words.slice(offset,offset+count);offset+=count;
  const sec=original.sections.find(s=>s.verseNumber===n),base=before.document.scenes.find(s=>s.id===original.prefix+'-'+sec.id),words=base.captions.flatMap(c=>c.words||[]);assert.equal(words[0].text,'శ్లోకం');assert(words[1].text.startsWith(`1.${n}`));assert(words.length>2);
  const cut=(words[1].end+words[2].start)/2,start=k?(source.words[offset-count-1].end+lw[0].start)/2:0,end=k===b.numbers.length-1?source.duration:(lw.at(-1).end+source.words[offset].start)/2;
  const prefixFile=`${dir}/label-${n}.wav`,newFile=`${dir}/verse-${n}-first-scene.wav`,tail=base.duration-cut;
  if(!state.replacementAudio[n]){ff(['-i',source.file,'-af',`atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS`,'-c:a','pcm_s16le',prefixFile]);
   const originalSource=oldState.batches.find(b=>oldState.finished[b.id].audioId===base.audioId);assert(originalSource);const fullAudio=`${oldState.reusesNarrationFrom}/${originalSource.id}-finished.wav`;assert(await exists(fullAudio));
   ff(['-i',prefixFile,'-i',fullAudio,'-filter_complex',`[1:a]atrim=start=${base.audioStart+cut}:duration=${tail},asetpts=PTS-STARTPTS[t];[0:a][t]concat=n=2:v=0:a=1[out]`,'-map','[out]','-c:a','pcm_s16le',newFile]);
   state.replacementAudio[n]={id:await asset(newFile),duration:duration(newFile),prefixDuration:duration(prefixFile),cut,sourceAudioId:base.audioId,sourceStart:base.audioStart+cut,tailDuration:tail};await save();
  }
  const replacement=state.replacementAudio[n],delta=replacement.prefixDuration-cut;
  const text=`${label(n)} ${words.slice(2).map(w=>w.text).join(' ')}`,aligned=[...lw.map(w=>({...w,start:w.start-start,end:w.end-start})),...words.slice(2).map(w=>({...w,start:w.start+delta,end:w.end+delta}))];
  // Use numeric labels on screen while the voice pronounces the full Telugu numbers.
  const shown=aligned.map((w,i)=>({...w,text:i===1?'1,':i>=3&&i<count?(i===3?`${n}.`:''):w.text})).filter(w=>w.text);
  if(count>4)shown[3].end=aligned[count-1].end;
  overrides[base.id]={...structuredClone(base),title:`అధ్యాయం 1 — శ్లోకం ${n} · ${sec.title.split(' · ').slice(1).join(' · ')}`,narration:text,audioId:replacement.id,audioStart:0,duration:replacement.duration,captions:[{...base.captions[0],start:shown[0].start,end:shown.at(-1).end,text:`అధ్యాయం 1, శ్లోకం ${n}. ${words.slice(2).map(w=>w.text).join(' ')}`,words:shown}],narrationStale:false,captionsStale:false};
  changes.push({verse:n,sceneId:base.id,...replacement,oldDuration:base.duration,newDuration:replacement.duration,explanationAudioPreserved:true});
 }}
 const config={...original,variantId:state.variantId,clearLabels:true,sections:original.sections.map(s=>s.verseNumber?{...s,title:`అధ్యాయం 1 — శ్లోకం ${s.verseNumber}`,text:overrides[original.prefix+'-'+s.id].narration}:s)};
 await writeFile(`${dir}/episode.json`,JSON.stringify(config,null,2));for(const f of ['thumbnail.png','THUMBNAIL-PROMPT.md','image-prompts.json','coverage.json','visual-plan.json'])await copyFile(`${old}/${f}`,`${dir}/${f}`);
 await writeFile(`${dir}/label-replacements.json`,JSON.stringify(changes,null,2));await writeFile(`${dir}/script-te.md`,config.sections.map(s=>`## ${s.title}\n\n${s.text}`).join('\n\n'));
 if(!state.assembled){const p=await get();const v=structuredClone(p.document.variants.find(v=>v.id===original.variantId));v.id=state.variantId;v.name='Divine Wisdom Telugu · Chapter 1 · Clear chapter and shloka labels · 16:9';v.sceneOverrides=overrides;p.document.variants.push(v);await call('update_project',{projectId:p.id,expectedRevision:p.revision,document:p.document});const current=await get();const nv=current.document.variants.find(v=>v.id===state.variantId);for(const s of Object.values(nv.sceneOverrides)){s.narrationStale=false;s.captionsStale=false;}await call('update_project',{projectId:p.id,expectedRevision:current.revision,document:current.document});state.assembled=true;await save();}
 await writeFile(`${dir}/completed-timeline.json`,JSON.stringify(await get(),null,2));
 console.log(JSON.stringify({prepared:true,changedLabels:47,newVoiceBatches:4,preservedExplanations:true,variantId:state.variantId}));
}finally{await client.close();}
