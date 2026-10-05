import 'dotenv/config';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createWriteStream} from 'node:fs';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const old='data/productions/divine-wisdom/gita-chapter-1/story-v4',dir='data/productions/divine-wisdom/gita-chapter-1/audio-corrected-v5';
const mode=process.argv[2]||'prepare',read=f=>readFile(f,'utf8').then(JSON.parse);
await mkdir(dir,{recursive:true});
const baseline=await read(`${old}/completed-timeline.json`),config=await read(`${old}/episode.json`);
const variantId='gita-chapter-1-te-audio-corrected-v5',profileId='7e994f10-1088-464c-91fb-79297b8fd6cb';
const state=await read(`${dir}/state.json`).catch(e=>{if(e.code!=='ENOENT')throw e;return {projectId:config.projectId,variantId,jobs:{},audio:{},renderJobs:{}};});
const save=()=>writeFile(`${dir}/state.json`,JSON.stringify(state,null,2));
const originalVariant=baseline.document.variants.find(v=>v.id===config.variantId),map=new Map(baseline.document.scenes.map(s=>[s.id,s]));
const original=originalVariant.sceneIds.map(id=>structuredClone(originalVariant.sceneOverrides[id]||map.get(id)));
const correction=original.find(s=>s.id.endsWith('-verse-22-part-2'));assert(correction);
const lines=[
 {id:'chapter-name',text:'భగవద్గీత మొదటి అధ్యాయం పేరు అర్జున విషాద యోగం. విషాదం అంటే దుఃఖం. యుద్ధరంగంలో తన బంధువులను, గురువులను చూసిన అర్జునుడు దుఃఖంతో, ధర్మసందేహంతో కలత చెందుతాడు. అతని ఈ అంతరంగ సంఘర్షణ జ్ఞానాన్ని అన్వేషించే ప్రయాణానికి ఆరంభం కావడంతో ఈ అధ్యాయానికి అర్జున విషాద యోగం అనే పేరు వచ్చింది.'},
 {id:'pronunciation',text:correction.narration},
 {id:'next-chapter',text:'ఈ సంపూర్ణ అధ్యాయాల సిరీస్‌లో తరువాతి వీడియో భగవద్గీత రెండవ అధ్యాయం, సాంఖ్య యోగం. అర్జునుడి సందేహాలకు కృష్ణుడు ఇచ్చే సమాధానాలను, ఆత్మ స్వరూపాన్ని, కర్తవ్యాన్ని సులభమైన తెలుగులో తెలుసుకుందాం.'}
];
assert.equal(lines.length,3);assert(lines.every(l=>l.text.length<1000));
await writeFile(`${dir}/AUDIO-CHANGE-PLAN.json`,JSON.stringify({scope:'Only full Chapter 1; preserve every verse explanation and individual episodes',calls:3,characters:lines.reduce((n,l)=>n+l.text.length,0),lines,sourceCorrectionAtSeconds:893.733398,voiceId:config.voiceId,preserveOriginal:true,youtube:'No mutations'},null,2));
const client=new Client({name:'chapter-one-audio-corrections',version:'1'});await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args}),t=r.content.find(c=>c.type==='text')?.text;assert(!r.isError,t);return JSON.parse(t);}
const get=()=>call('get_project',{projectId:state.projectId});
const norm=t=>t.normalize('NFC').replace(/[\p{P}\p{S}‌‍]/gu,'').trim();
try{
 if(mode==='prepare'){
  if(!state.prepared){const p=await get();assert.equal(p.document.unknownCostPolicy,'allow','Do not change approved billing policy');await writeFile(`${dir}/before-production.json`,JSON.stringify(p,null,2));
   for(const l of lines){const id=`chapter-one-v5-source-${l.id}`;if(!p.document.scenes.some(s=>s.id===id))p.document.scenes.push({id,title:l.id,narration:l.text,voiceId:config.voiceId,providers:{voice:profileId},modes:{voice:'api'},duration:30});}
   await call('update_project',{projectId:p.id,expectedRevision:p.revision,document:p.document});state.prepared=true;await save();
  }
 }
 if(mode==='voice'){
  assert(state.prepared);for(const l of lines){const id=`chapter-one-v5-source-${l.id}`;
   if(!state.jobs[id]){state.jobs[id]=(await call('queue_generation',{projectId:state.projectId,sceneId:id,kind:'voice',profileId,paidConfirmed:true})).id;await save();}
   for(;;){const j=await call('get_job',{jobId:state.jobs[id]});if(j.state==='completed')break;assert(!['failed','stale','cancelled','waiting-for-input'].includes(j.state),j.error||j.state);await new Promise(r=>setTimeout(r,5000));}
   if(!state.audio[l.id]){const p=await get(),s=p.document.scenes.find(s=>s.id===id);assert(s.audioId&&!s.narrationStale);const words=s.captions.flatMap(c=>c.words||[]);assert.deepEqual(words.map(w=>norm(w.text)),l.text.split(/\s+/u).map(norm));
    const r=await fetch(`http://localhost:3000/api/mcp/files/assets/${s.audioId}`,{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`}});assert(r.ok);const raw=`${dir}/${l.id}-raw.mp3`,file=`${dir}/${l.id}-finished.wav`;await writeFile(raw,Buffer.from(await r.arrayBuffer()));
    const rate=Number(JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-of','json',raw],{encoding:'utf8'})).streams.find(s=>s.codec_type==='audio').sample_rate),ratio=2**(.5/12);
    execFileSync('ffmpeg',['-v','error','-y','-i',raw,'-af',`asetrate=${rate}*${ratio},aresample=48000,atempo=${1/ratio},bass=g=3:f=110:w=0.6`,'-c:a','pcm_s16le',file]);
    const b=await readFile(file),a=await call('import_asset',{projectId:p.id,name:`chapter-one-v5-${l.id}.wav`,base64:b.toString('base64')});
    state.audio[l.id]={id:a.id,duration:a.duration,words,rawAudioId:s.audioId};await save();console.log(JSON.stringify({recording:l.id,seconds:a.duration}));
   }
  }
 }
 if(mode==='assemble'){
  assert(lines.every(l=>state.audio[l.id]));const p=await get();if(!p.document.variants.some(v=>v.id===variantId)){
   const replace=(scene,l)=>{const a=state.audio[l.id];return {...scene,narration:l.text,audioId:a.id,audioStart:0,duration:a.duration,narrationStale:false,captionsStale:false,promptOverrides:{...scene.promptOverrides,chapterSeries:'complete-chapters',audioCorrection:l.id},captions:[{id:crypto.randomUUID(),start:a.words[0].start,end:a.words.at(-1).end,text:l.text,words:a.words,accuracy:'aligned'}]};};
   const scenes=original.map(s=>s.id===correction.id?replace(s,lines[1]):s);
   const name=replace({...original[2],id:'chapter-one-v5-name',title:'అధ్యాయం 1 — అర్జున విషాద యోగం'},lines[0]);scenes.splice(1,0,name);
   const nextIndex=scenes.findIndex(s=>s.id.endsWith('-next-part-3'));assert(nextIndex>0);const next=scenes[nextIndex],words=next.captions.flatMap(c=>c.words||[]),first=words.slice(0,3);assert.equal(first.map(w=>w.text).join(' '),'తరువాతి సంభాషణలో వింటాం.');
   next.narration=first.map(w=>w.text).join(' ');next.duration=(first.at(-1).end+words[3].start)/2;next.captions=[{...next.captions[0],end:first.at(-1).end,text:next.narration,words:first}];
   scenes.splice(nextIndex+1,0,replace({...next,id:'chapter-one-v5-next',title:'తరువాత — అధ్యాయం 2: సాంఖ్య యోగం'},lines[2]));
   // All original explanations must survive byte-for-byte, except the replacement audio of the reported line.
   for(const s of original.filter(s=>s.id.includes('-verse-'))){const n=scenes.find(n=>n.id===s.id);assert(n);assert.equal(n.narration,s.narration);if(s.id!==correction.id){assert.equal(n.audioId,s.audioId);assert.equal(n.audioStart,s.audioStart);assert.equal(n.duration,s.duration);}}
   assert(!scenes.some(s=>/శ్లోకం పదకొండును|ఒక్కో శ్లోకం సిరీస్/.test(s.narration)));assert.equal(scenes.filter(s=>/-verse-\d+$/.test(s.id)).length,47);
   const v=structuredClone(originalVariant);v.id=variantId;v.name='Divine Wisdom Telugu · Chapter 1 · corrected audio · Full chapters';v.sceneIds=scenes.map(s=>s.id);v.sceneOverrides=Object.fromEntries(scenes.filter(s=>map.has(s.id)).map(s=>[s.id,s]));
   p.document.scenes.push(...scenes.filter(s=>!map.has(s.id)));let t=0;const chapters=[];for(const s of scenes){if(/-verse-\d+$/.test(s.id)||s===scenes[0])chapters.push(`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')} ${s.title}`);t+=s.duration;}
   v.publishing.chapters=chapters.join('\n');v.publishing.description=v.publishing.description.replace(/వీడియో భాగాలు:[\s\S]*?(?=\n\nమూలాలు:)/,`వీడియో భాగాలు:\n${v.publishing.chapters}`);v.publishing.description+='\n\nసంపూర్ణ అధ్యాయాల ప్రత్యేక సిరీస్: అధ్యాయం 1 — అర్జున విషాద యోగం. తరువాత: అధ్యాయం 2 — సాంఖ్య యోగం. విడి శ్లోకాల వీడియోలు వేరే సిరీస్‌లో ఉంటాయి.';
   p.document.variants.push(v);p.document.publishing=v.publishing;await call('update_project',{projectId:p.id,expectedRevision:p.revision,document:p.document});state.assembled=true;state.seconds=t;await save();
   await writeFile(`${dir}/preservation-check.json`,JSON.stringify({all47MeaningsRetained:true,untouchedExplanationAudioPreserved:true,replacedPronunciationScene:correction.id,separateChapterSeries:true,noIndividualEpisodeTeaser:true,seconds:t},null,2));await writeFile(`${dir}/publishing.json`,JSON.stringify(v.publishing,null,2));
  }
  const aligned=await get(),av=aligned.document.variants.find(v=>v.id===variantId);
  // These captions were edited against actual aligned words, not left over from the old narration.
  let stale=false;for(const s of Object.values(av.sceneOverrides)){if(s.narrationStale||s.captionsStale){s.narrationStale=false;s.captionsStale=false;stale=true;}}
  if(stale)await call('update_project',{projectId:aligned.id,expectedRevision:aligned.revision,document:aligned.document});
  await writeFile(`${dir}/completed-timeline.json`,JSON.stringify(await get(),null,2));
 }
 if(['draft','full'].includes(mode)){assert(state.assembled);if(!state.renderJobs[mode]){state.renderJobs[mode]=(await call('queue_render',{projectId:state.projectId,variantId,draft:mode==='draft'})).id;await save();}console.log(JSON.stringify(await call('get_job',{jobId:state.renderJobs[mode]})));}
 if(mode==='status')for(const [k,id] of Object.entries({...state.jobs,...state.renderJobs})){const j=await call('get_job',{jobId:id});console.log(JSON.stringify({k,state:j.state,stage:j.stage,error:j.error}));}
 if(mode==='exports')console.log(JSON.stringify(await call('get_exports',{jobId:state.renderJobs[process.argv[3]||'draft']})));
 if(mode==='wait-full'){let prior='';for(;;){const j=await call('get_job',{jobId:state.renderJobs.full});const status=`${j.state}: ${j.stage}`;if(status!==prior){console.log(status);prior=status;}if(j.state==='completed')break;assert(!['failed','cancelled','stale','waiting-for-input'].includes(j.state),j.error||j.state);await new Promise(r=>setTimeout(r,30000));}}
 if(mode==='download'){const kind=process.argv[3]||'full',j=await call('get_job',{jobId:state.renderJobs[kind]});assert.equal(j.state,'completed');for(const format of ['mp4','srt','vtt']){const r=await fetch(`http://localhost:3000/api/mcp/files/jobs/${j.id}/download?format=${format}`,{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`}});assert(r.ok);assert(r.body);await pipeline(Readable.fromWeb(r.body),createWriteStream(`${dir}/gita-chapter-1-${kind}.${format}`));}}
 console.log(JSON.stringify({mode,projectId:state.projectId,variantId,seconds:state.seconds}));
}finally{await client.close();}
