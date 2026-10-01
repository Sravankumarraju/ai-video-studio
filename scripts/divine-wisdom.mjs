import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const projectId='a39b4823-f4d4-436b-be68-7d6694418d36',profileId='7e994f10-1088-464c-91fb-79297b8fd6cb';
const dir='data/productions/divine-wisdom/gita-1-1',mode=process.argv[2]||'prepare';
const only=process.argv[3];
if(only&&!['te','hi','en'].includes(only))throw Error('Unknown language');
const episode=JSON.parse(await readFile(`${dir}/episode.json`,'utf8'));
let state=await readFile(`${dir}/state.json`,'utf8').then(JSON.parse).catch(e=>{if(e.code!=='ENOENT')throw e;return {projectId,languages:{},images:{}};});
const token=process.env.STORY_STUDIO_MCP_TOKEN;
const client=new Client({name:'divine-wisdom-playlist',version:'1.0'});
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${token}`,Connection:'close'}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args});const t=r.content.find(c=>c.type==='text')?.text;if(r.isError)throw Error(t);return JSON.parse(t);}
async function saveState(){await writeFile(`${dir}/state.json`,JSON.stringify(state,null,2));}
function docker(args){return execFileSync('docker',['compose',...args],{encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:4*1024*1024});}
function packs(texts){const result=[];for(let i=0;i<texts.length;i++){if(texts[i].length>1000)throw Error('Section exceeds reliable narration chunk limit');const last=result.at(-1);if(last&&(last.text+'\n\n'+texts[i]).length<=1000){last.text+='\n\n'+texts[i];last.sections.push(i);}else result.push({text:texts[i],sections:[i]});}return result;}
function readableCaptions(words,language,duration){const seg=new Intl.Segmenter(language,{granularity:'grapheme'}),limit={te:18,hi:20,en:28}[language];const length=t=>Array.from(seg.segment(t)).length;const out=[];let group=[],lines=[''];function flush(){if(!group.length)return;out.push({id:crypto.randomUUID(),start:group[0].start,end:group.at(-1).end,text:lines.join('\n'),accuracy:'aligned',words:group});group=[];lines=[''];}
 for(const word of words){const next=[...lines],i=next.length-1,t=next[i]?next[i]+' '+word.text:word.text;if(length(t)>limit&&next[i])next.push(word.text);else next[i]=t;if(next.length>2||group.length>=4){flush();lines=[word.text];}else lines=next;group.push(word);if(/[.!?।]$/u.test(word.text))flush();}flush();
 for(let i=0;i<out.length;i++){out[i].end=Math.min(duration,out[i+1]?.start??duration,out[i].end+0.2);assert(out[i].end>out[i].start);assert(out[i].text.split('\n').length<=2);assert(out[i].words.length<=4);}
 assert.deepEqual(out.flatMap(c=>c.words.map(w=>w.text)),words.map(w=>w.text));return out;}
const normalize=t=>t.normalize('NFC').replace(/[\p{P}\p{S}\u200c\u200d]/gu,'').trim();
try {
 if(mode==='recover-chunks'){
  const a=JSON.parse(await readFile(`${dir}/divine-original-alignment.json`,'utf8'));
  const prefix=episode.languages.te.text.slice(0,4).join('\n\n');
  assert(a.characters.join('').startsWith(prefix));
  const end=a.character_start_times_seconds[prefix.length];
  assert(end>0&&end<134);
  const chars=a.characters.slice(0,prefix.length),starts=a.character_start_times_seconds.slice(0,prefix.length),ends=a.character_end_times_seconds.slice(0,prefix.length);
  let words=[],word='',start=0,last=0;
  for(let i=0;i<chars.length;i++){if(!/\s/u.test(chars[i])){if(!word)start=starts[i];word+=chars[i];last=ends[i];}else if(word){words.push({text:word,start,end:last});word='';}}
  if(word)words.push({text:word,start,end:last});
  assert(words.every(w=>w.end>w.start));
  const assetId='3808a02b-5be2-4a20-812d-76565f866a5d';
  const response=await fetch(`http://localhost:3000/api/mcp/files/assets/${assetId}`,{headers:{Authorization:`Bearer ${token}`,Connection:'close'}});assert(response.ok);
  await writeFile(`${dir}/original-long-te.mp3`,Buffer.from(await response.arrayBuffer()));
  docker(['cp',`${dir}/original-long-te.mp3`,'app:/app/test-output/original-long-te.mp3']);
  docker(['exec','-T','app','ffmpeg','-v','error','-i','/app/test-output/original-long-te.mp3','-t',String(end),'-c:a','libmp3lame','-y','/app/test-output/te-prefix.mp3']);
  docker(['cp','app:/app/test-output/te-prefix.mp3',`${dir}/te-prefix.mp3`]);
  const imported=await call('import_asset',{projectId,name:'gita-1-1-te-recovered-prefix.mp3',base64:(await readFile(`${dir}/te-prefix.mp3`)).toString('base64')});
  const p=await call('get_project',{projectId});const template=p.document.scenes.find(s=>s.id==='gita-1-1-te-source-1');
  template.narration=prefix;template.audioId=imported.id;template.duration=imported.duration;template.captions=words.map(w=>({id:crypto.randomUUID(),start:w.start,end:w.end,text:w.text,words:[w],accuracy:'aligned'}));template.narrationStale=false;template.captionsStale=false;
  state.languages.te.batches=[{id:template.id,text:prefix,sections:[0,1,2,3]},...packs(episode.languages.te.text.slice(4)).map((b,i)=>({...b,sections:b.sections.map(n=>n+4),id:`gita-1-1-te-short-${i+1}`}))];
  for(const language of ['hi','en'])state.languages[language].batches=packs(episode.languages[language].text).map((b,i)=>({...b,id:`gita-1-1-${language}-short-${i+1}`}));
  for(const [language,s] of Object.entries(state.languages))for(const batch of s.batches){if(p.document.scenes.some(scene=>scene.id===batch.id))continue;p.document.scenes.push({...structuredClone(template),id:batch.id,narration:batch.text,title:`${episode.languages[language].channel} source`,audioId:undefined,captions:[],duration:90,voiceId:episode.languages[language].voiceId,status:'Short narration chunk prepared'});}
  await call('update_project',{projectId,expectedRevision:p.revision,document:p.document});await saveState();console.log(JSON.stringify({recoveredPrefixSeconds:end,batches:Object.fromEntries(Object.entries(state.languages).map(([l,s])=>[l,s.batches.map(b=>b.text.length)]))}));
 }
 if(mode==='prepare'){
  let p=await call('get_project',{projectId});const prompts=JSON.parse(await readFile(`${dir}/image-prompts.json`,'utf8')).images;
  for(const item of prompts){const a=p.assets.find(a=>a.name===item.name)||await call('import_asset',{projectId,name:item.name,base64:(await readFile(`${dir}/${item.name}`)).toString('base64')});state.images[item.name]={assetId:a.id,prompt:item.prompt};}
  const cosmic=p.assets.find(a=>a.name==='cosmic-watercolor.png');assert(cosmic);
  const oldPrompt=p.document.scenes.find(s=>s.assetId===cosmic.id&&s.imagePrompt)?.imagePrompt||'';state.images['cosmic-watercolor.png']={assetId:cosmic.id,prompt:oldPrompt};
  p=await call('get_project',{projectId});const template=p.document.scenes.find(s=>s.id==='gita-247-te-1');
  for(const [language,config] of Object.entries(episode.languages)){
   if(!state.languages[language])state.languages[language]={variantId:`gita-1-1-${language}`,batches:packs(config.text).map((batch,i)=>({...batch,id:`gita-1-1-${language}-source-${i+1}`})),jobs:{}};
   for(const batch of state.languages[language].batches){if(p.document.scenes.some(s=>s.id===batch.id))continue;p.document.scenes.push({...structuredClone(template),id:batch.id,title:`${config.channel} · source narration`,narration:batch.text,audioId:undefined,captions:[],duration:150,voiceId:config.voiceId,providers:{voice:profileId},narrationStale:false,captionsStale:false,status:'Prepared narration batch; original audio retained'});}
   await writeFile(`${dir}/script-${language}.md`,`# ${config.channel} — Bhagavad Gita 1.1\n\nSame eight concepts and visuals across Telugu, Hindi and English. Exact verse in local script or phonetic transliteration; meaning and example are original explanations.\nSources: ${episode.sources.join(' ; ')}\n\n`+config.text.map((t,i)=>`## ${i}. ${config.titles[i]}\n\n${t}`).join('\n\n'));
  }
  p.document.sources+='\nDivine Wisdom playlist episode 001 = BG 1.1; next BG 1.2. '+episode.sources.join(' ; ');
  p.document.publishing.description+='\nDivine Wisdom Telugu / Divine Wisdom Hindi / Divine Wisdom English. Bhagavad Gita playlist begins at 1.1 and proceeds in chapter/verse order. Three equivalent language editions share visuals, with separate voices and captions.';
  await call('update_project',{projectId,expectedRevision:p.revision,document:p.document});await saveState();
  console.log(JSON.stringify({prepared:true,batches:Object.fromEntries(Object.entries(state.languages).map(([l,s])=>[l,s.batches.map(b=>b.text.length)]))}));
 }
 if(mode==='generate'){
  const initial=await call('get_project',{projectId});const originalLanguage=initial.document.language,originalSubtitleLanguage=initial.document.subtitleLanguage;
  try{for(const [language,s] of Object.entries(state.languages)){
   let p=await call('get_project',{projectId});p.document.language=language;p.document.subtitleLanguage=language;await call('update_project',{projectId,expectedRevision:p.revision,document:p.document});
   for(const batch of s.batches){p=await call('get_project',{projectId});if(p.document.scenes.find(scene=>scene.id===batch.id).audioId)continue;
    let jobId=s.jobs[batch.id];if(!jobId){const j=await call('queue_generation',{projectId,kind:'voice',sceneId:batch.id,profileId,paidConfirmed:true});jobId=j.id;s.jobs[batch.id]=jobId;await saveState();console.log(JSON.stringify({language,batch:batch.id,jobId}));}
    for(;;){const job=await call('get_job',{jobId});if(job.state==='completed')break;if(['failed','cancelled','waiting-for-input'].includes(job.state))throw Error(`${language} narration: ${job.state}: ${job.error}`);await new Promise(r=>setTimeout(r,4000));}
    console.log(JSON.stringify({language,batch:batch.id,recorded:true}));
   }
  }}finally{const p=await call('get_project',{projectId});p.document.language=originalLanguage;p.document.subtitleLanguage=originalSubtitleLanguage;await call('update_project',{projectId,expectedRevision:p.revision,document:p.document});}
 }
 if(mode==='assemble'){
  let p=await call('get_project',{projectId});const originals=JSON.stringify(p.document.scenes.filter(s=>!s.id.startsWith('gita-1-1-')));const newScenes=[],variants=[];
  for(const [language,s] of Object.entries(state.languages)){
   if(p.document.variants.some(v=>v.id===s.variantId)){console.log(JSON.stringify({language,assembled:true}));continue;}
   const config=episode.languages[language],bySection=new Map();
   for(const batch of s.batches){const recorded=p.document.scenes.find(scene=>scene.id===batch.id);assert(recorded?.audioId);const asset=p.assets.find(a=>a.id===recorded.audioId);assert(asset?.duration);
    const response=await fetch(`http://localhost:3000/api/mcp/files/assets/${asset.id}`,{headers:{Authorization:`Bearer ${token}`,Connection:'close'}});if(!response.ok)throw Error('Cannot download recorded audio');
    const raw=`${dir}/${batch.id}.mp3`;await writeFile(raw,Buffer.from(await response.arrayBuffer()));docker(['cp',raw,`app:/app/test-output/${batch.id}.mp3`]);
    const words=recorded.captions.flatMap(c=>c.words||[]);let offset=0;
    const ranges=batch.sections.map(section=>{const expected=config.text[section].trim().split(/\s+/u),chosen=words.slice(offset,offset+expected.length);assert.deepEqual(chosen.map(w=>normalize(w.text)),expected.map(normalize),'Aligned words differ from the reviewed script');offset+=expected.length;return {section,words:chosen};});assert.equal(offset,words.length);
    const boundaries=ranges.map((range,i)=>i?Math.max(ranges[i-1].words.at(-1).end,(ranges[i-1].words.at(-1).end+range.words[0].start)/2):0);boundaries.push(asset.duration);
    for(let i=0;i<ranges.length;i++){
     const {section,words:chosen}=ranges[i],start=boundaries[i],end=boundaries[i+1],duration=end-start;assert(duration>=0.5);const id=`gita-1-1-${language}-section-${section}`;
     const filter=`atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS,rubberband=tempo=1:pitch=1.0293022366:formant=preserved:pitchq=quality,bass=g=3:f=120:w=0.7,apad,atrim=duration=${duration},asetpts=PTS-STARTPTS`;
     docker(['exec','-T','app','ffmpeg','-v','error','-threads','1','-i',`/app/test-output/${batch.id}.mp3`,'-af',filter,'-ar','48000','-ac','1','-c:a','pcm_s16le','-y',`/app/test-output/${id}.wav`]);
     const info=JSON.parse(docker(['exec','-T','app','ffprobe','-v','error','-show_entries','format=duration','-of','json',`/app/test-output/${id}.wav`]));assert(Math.abs(Number(info.format.duration)-duration)<0.025);
     const local=`${dir}/${id}.wav`;docker(['cp',`app:/app/test-output/${id}.wav`,local]);const name=`${id}-${asset.id}.wav`;const imported=p.assets.find(a=>a.name===name)||await call('import_asset',{projectId,name,base64:(await readFile(local)).toString('base64')});
     const captions=readableCaptions(chosen.map(w=>({...w,start:Math.max(0,w.start-start),end:Math.min(duration,w.end-start)})),language,duration);
     bySection.set(section,{...structuredClone(recorded),id,title:config.titles[section],narration:config.text[section],audioId:imported.id,assetId:state.images[episode.sharedImages[section]].assetId,imagePrompt:state.images[episode.sharedImages[section]].prompt,duration,captions,volume:1.25,voiceId:config.voiceId,status:'Reviewed equivalent-language episode; original source narration retained',narrationStale:false,captionsStale:false,motion:section%2?'pan-left':'zoom-in',strength:0.04,promptOverrides:{audioFinishing:JSON.stringify({originalAudioId:asset.id,trimStart:start,trimEnd:end,bassDb:3,pitchSemitones:0.5,tempo:1,volume:1.25}),section:episode.sections[section]}});
    }
   }
   assert.equal(bySection.size,8);const ordered=Array.from({length:8},(_,i)=>bySection.get(i));newScenes.push(...ordered);
   const seconds=ordered.reduce((n,scene)=>n+scene.duration,0);s.actualDuration=seconds;s.sceneIds=ordered.map(scene=>scene.id);s.voiceId=config.voiceId;s.channel=config.channel;
   variants.push({...structuredClone(p.document.variants.find(v=>v.id==='gita-247-strong-voice')),id:s.variantId,name:`${config.channel} · Bhagavad Gita 1.1`,sceneIds:s.sceneIds,sceneOverrides:{},framing:{},targetDuration:210,maxDuration:600,font:config.font,fontSize:language==='en'?37:42,titleOverlay:config.channel,background:true,outline:3,captions:true,wordHighlight:false});
   console.log(JSON.stringify({language,actualSeconds:seconds,sections:8,voice:config.voiceName}));
  }
  p=await call('get_project',{projectId});p.document.scenes.push(...newScenes);p.document.variants.push(...variants);
  assert.equal(originals,JSON.stringify(p.document.scenes.filter(scene=>!scene.id.startsWith('gita-1-1-'))));
  assert.deepEqual(variants.map(v=>v.sceneIds.map(id=>newScenes.find(s=>s.id===id).assetId)),variants.map(()=>episode.sharedImages.map(name=>state.images[name].assetId)));
  await call('update_project',{projectId,expectedRevision:p.revision,document:p.document});await saveState();
 }
 if(mode==='drafts'||mode==='fulls'){
  for(const [language,s] of Object.entries(state.languages)){if(only&&language!==only)continue;const key=mode==='drafts'?'draftJobId':'fullJobId';if(!s[key]){const j=await call('queue_render',{projectId,variantId:s.variantId,draft:mode==='drafts'});s[key]=j.id;await saveState();}console.log(JSON.stringify({language,[key]:s[key]}));}
 }
 if(mode==='status')for(const [language,s] of Object.entries(state.languages)){const id=s.fullJobId||s.draftJobId;if(id){const j=await call('get_job',{jobId:id});console.log(JSON.stringify({language,id,state:j.state,stage:j.stage,error:j.error}));}}
 if(mode==='download'){
  for(const [language,s] of Object.entries(state.languages)){if(only&&language!==only)continue;const jobId=s.fullJobId||s.draftJobId;const job=await call('get_job',{jobId});if(!['completed','stale'].includes(job.state)||!job.result?.mp4Key)throw Error(`${language} export not complete`);const prefix=s.fullJobId?'gita-1-1':'gita-1-1-draft';for(const format of ['mp4','srt','vtt']){const r=await fetch(`http://localhost:3000/api/mcp/files/jobs/${jobId}/download?format=${format}`,{headers:{Authorization:`Bearer ${token}`,Connection:'close'}});if(!r.ok)throw Error(`Download HTTP ${r.status}`);const file=`${prefix}-${language}.${format}`;await writeFile(`${dir}/${file}`,Buffer.from(await r.arrayBuffer()));if(format==='mp4')s.file=file;}console.log(JSON.stringify({language,file:s.file,seconds:job.result.duration}));}
  await saveState();
 }
}finally{await client.close();}
