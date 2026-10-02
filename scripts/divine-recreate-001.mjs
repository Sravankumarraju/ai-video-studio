import 'dotenv/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const dir='data/productions/divine-wisdom/gita-1-1/recreated-v3';
const projectId='a39b4823-f4d4-436b-be68-7d6694418d36', variantId='gita-1-1-te-recreated-v3';
const profileId='7e994f10-1088-464c-91fb-79297b8fd6cb', mode=process.argv[2]||'status';
await mkdir(dir,{recursive:true});
let state;try{state=JSON.parse(await readFile(`${dir}/production-state.json`,'utf8'));}catch{state={projectId,variantId,imageAssets:{},renderJobs:{}};}
const save=()=>writeFile(`${dir}/production-state.json`,JSON.stringify(state,null,2));
const token=process.env.STORY_STUDIO_MCP_TOKEN;if(!token)throw Error('Connector token unavailable');
const client=new Client({name:'divine-recreate-001',version:'1.0'});
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${token}`,Connection:'close'}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args}),t=r.content.find(c=>c.type==='text')?.text;if(r.isError||!t)throw Error(t||'No response');return JSON.parse(t);}
const prompts=JSON.parse(await readFile(`${dir}/image-prompts.json`,'utf8'));
async function asset(file){return (await call('import_asset',{projectId,name:path.basename(file),base64:(await readFile(file)).toString('base64')})).id;}
try{
 if(mode==='media'){
  for(const image of JSON.parse(await readFile(`${dir}/generated-images.json`,'utf8'))){
   const file=`${dir}/${String(image.index+1).padStart(2,'0')}-${image.name}.png`;
   await copyFile(image.path,file);
   if(!state.imageAssets[image.index]){state.imageAssets[image.index]=await asset(file);await save();}
   console.log(JSON.stringify({image:image.name,assetId:state.imageAssets[image.index]}));
  }
  const logo='data/branding/divine-wisdom/logo-samples/01-lotus-book.png';
  if(!state.logoId){state.logoId=await asset(logo);await save();}
  if(!state.logoClipId){
   const clip=`${dir}/logo-welcome.mp4`;
   execFileSync(process.env.FFMPEG_PATH||'ffmpeg',['-y','-v','error','-loop','1','-i',logo,'-f','lavfi','-i','color=c=0x090b2c:s=1920x1080:r=30:d=3','-filter_complex','[0:v]scale=720:720,format=rgba,fade=t=in:st=0:d=0.3:alpha=1[lg];[1:v][lg]overlay=(W-w)/2:(H-h)/2:shortest=1,format=yuv420p[v]','-map','[v]','-t','3','-c:v','libx264','-preset','fast','-an',clip],{stdio:'inherit'});
   state.logoClipId=await asset(clip);await save();
  }
 }
 if(mode==='assemble'){
  if(!state.logoClipId||Object.keys(state.imageAssets).length!==12)throw Error('Import images and logo first');
  const p=await call('get_project',{projectId}),doc=p.document;
  if(doc.variants.some(v=>v.id===variantId)){console.log('Version already assembled');}
  else{
   if(doc.musicId||doc.effects.length)throw Error('Project-wide music/effects require version isolation before assembly');
   await writeFile(`${dir}/before-recreation.json`,JSON.stringify(p,null,2));
   const sections=Array.from({length:8},(_,i)=>doc.scenes.find(s=>s.id===`gita-1-1-te-section-${i}`));
   if(sections.some(s=>!s?.audioId||s.narrationStale))throw Error('Approved original narration unavailable');
   const created=[];
   const words=s=>s.captions.flatMap(c=>c.words||[]);
   const slice=(s,index,start,end,tag)=>{
    const ws=words(s).filter(w=>w.start>=start-1e-6&&w.end<=end+1e-6).map(w=>({...w,start:Math.max(0,w.start-start),end:w.end-start}));
    const captions=s.captions.filter(c=>c.end>start&&c.start<end).map(c=>({...c,id:crypto.randomUUID(),start:Math.max(0,c.start-start),end:Math.min(end,c.end)-start,words:c.words?.filter(w=>w.start>=start-1e-6&&w.end<=end+1e-6).map(w=>({...w,start:Math.max(0,w.start-start),end:w.end-start}))})).filter(c=>c.end>c.start&&(!c.words||c.words.length)).map(c=>({...c,text:c.words?.map(w=>w.text).join(' ')||c.text}));
    const n={...structuredClone(s),id:`gita-001-v3-${tag}`,title:`001 · ${tag}`,narration:ws.map(w=>w.text).join(' '),duration:end-start,audioStart:(s.audioStart||0)+start,audioSlice:true,assetId:state.imageAssets[index],imagePrompt:prompts.find(x=>x.index===index).prompt,visual:'Imagined devotional watercolor artwork; symbolic scenes illustrate the teaching',motion:index%2?'zoom-out':'zoom-in',strength:.07,mediaType:'image',focalX:.5,focalY:.5,transition:'cut',overlap:0,fadeIn:0,fadeOut:0,captions,narrationStale:false,captionsStale:false,status:'Approved Episode 001 narration reused; no music',locked:false};
    created.push(n);return n;
   };
   const boundary=(s,near)=>{const ws=words(s),gaps=ws.slice(0,-1).map((w,i)=>({at:(w.end+ws[i+1].start)/2,gap:ws[i+1].start-w.end})).filter(g=>g.gap>=0);return gaps.sort((a,b)=>Math.abs(a.at-near)-Math.abs(b.at-near))[0].at;};
   const logo=slice(sections[0],0,0,2.92,'logo-welcome');logo.assetId=state.logoClipId;logo.mediaType='video';logo.motion='static';logo.strength=0;logo.imagePrompt='Selected Divine Wisdom lotus-book logo, centered over indigo, subtle fade-in';
   const title={...structuredClone(logo),id:'gita-001-v3-title',title:'భగవద్గీత · అధ్యాయం 1 · శ్లోకం 1',narration:'',audioId:undefined,audioStart:0,audioSlice:false,duration:3,assetId:state.imageAssets[3],mediaType:'image',captions:[{id:crypto.randomUUID(),start:0,end:3,text:'భగవద్గీత\nఅధ్యాయం 1 · శ్లోకం 1',accuracy:'manual',display:'full-verse'}]};created.push(title);
   slice(sections[0],0,2.92,sections[0].duration,'welcome');
   slice(sections[1],1,0,sections[1].duration,'overview');
   slice(sections[2],2,0,sections[2].duration,'book-context');
   const verse=slice(sections[3],3,0,10.46,'shloka');verse.motion='static';verse.strength=0;verse.visual='Single calm indigo background for the entire exact recitation';verse.captions=[{id:crypto.randomUUID(),start:.02,end:10.42,text:'ధృతరాష్ట్ర ఉవాచ ।\nధర్మక్షేత్రే కురుక్షేత్రే సమవేతా యుయుత్సవః ।\nమామకాః పాండవాశ్చైవ కిమకుర్వత సంజయ ॥',accuracy:'manual',display:'full-verse'}];
   slice(sections[3],4,10.46,sections[3].duration,'meaning');
   for(const [section,index,tag] of [[4,5,'explanation'],[5,7,'example']]){const s=sections[section],at=boundary(s,s.duration/2);slice(s,index,0,at,`${tag}-a`);slice(s,index+1,at,s.duration,`${tag}-b`);}
   slice(sections[6],9,0,sections[6].duration,'conclusion');slice(sections[7],10,0,sections[7].duration,'next');
   const cta={...structuredClone(sections[7]),id:'gita-001-v3-closing',title:'Subscribe, like, share and comment',narration:'ఈ వీడియో ద్వారా మీరు కొత్తగా ఏం నేర్చుకున్నారు? కామెంట్‌లో చెప్పండి. వీడియో నచ్చితే లైక్ చేయండి. మీ కుటుంబ సభ్యులతో, స్నేహితులతో షేర్ చేయండి. ఇలాంటి మరిన్ని జ్ఞాన విషయాల కోసం డివైన్ విజ్డమ్ ఛానల్‌కు సబ్‌స్క్రైబ్ చేయండి.',duration:18,audioId:undefined,audioStart:0,audioSlice:false,captions:[],assetId:state.imageAssets[11],imagePrompt:prompts.find(x=>x.index===11).prompt,motion:'zoom-out',strength:.07,transition:'cut',overlap:0,fadeIn:0,fadeOut:0,volume:1.25,narrationStale:false,captionsStale:false,status:'Awaiting updated closing narration'};created.push(cta);
   doc.scenes.push(...created);
   const base=doc.variants.find(v=>v.id==='gita-1-1-te-landscape-v2');
   doc.variants.push({...structuredClone(base),id:variantId,name:'Divine Wisdom Telugu · 001 / 1.1 · recreated · 16:9',sceneIds:created.map(s=>s.id),sceneOverrides:{},aspect:'landscape',logoId:state.logoId,logoStart:2.92,captions:false,font:'Noto Sans Telugu',fontSize:68,color:'#ffffff',background:false,wordHighlight:false,titleOverlay:'',maxDuration:300,targetDuration:250});
   await call('update_project',{projectId,expectedRevision:p.revision,document:doc});state.status='assembled-awaiting-closing-voice';await save();
   console.log(JSON.stringify({assembled:true,scenes:created.length,seconds:created.reduce((n,s)=>n+s.duration,0)}));
  }
 }
 if(mode==='voice'){
  const p=await call('get_project',{projectId}),s=p.document.scenes.find(s=>s.id==='gita-001-v3-closing');if(!s)throw Error('Assemble first');
  if(!s.audioId&&!state.voiceJob){state.voiceJob=(await call('queue_generation',{projectId,sceneId:s.id,kind:'voice',profileId,paidConfirmed:true})).id;await save();}
  console.log(JSON.stringify(state.voiceJob?await call('get_job',{jobId:state.voiceJob}):{voiceAlreadyPresent:true}));
 }
 if(mode==='finish-voice'){
  const p=await call('get_project',{projectId}),s=p.document.scenes.find(s=>s.id==='gita-001-v3-closing');
  if(!s?.audioId||s.narrationStale)throw Error('Closing voice unavailable');
  if(!state.finishedVoiceId){
   const r=await fetch(`http://localhost:3000/api/mcp/files/assets/${s.audioId}`,{headers:{Authorization:`Bearer ${token}`,Connection:'close'}});if(!r.ok)throw Error('Audio download failed');
   const raw=`${dir}/closing-original.mp3`,out=`${dir}/closing-finished.wav`;await writeFile(raw,Buffer.from(await r.arrayBuffer()));
   const info=JSON.parse(execFileSync(process.env.FFPROBE_PATH||'ffprobe',['-v','error','-show_streams','-of','json',raw],{encoding:'utf8'}));const rate=Number(info.streams.find(s=>s.codec_type==='audio').sample_rate),ratio=2**(.5/12);
   execFileSync(process.env.FFMPEG_PATH||'ffmpeg',['-y','-v','error','-i',raw,'-af',`asetrate=${rate}*${ratio},aresample=48000,atempo=${1/ratio},bass=g=3:f=110:w=0.6`,'-c:a','pcm_s16le',out],{stdio:'inherit'});
   state.originalClosingAudioId=s.audioId;state.finishedVoiceId=await asset(out);await save();
  }
  if(s.audioId!==state.finishedVoiceId){const latest=await call('get_project',{projectId}),a=latest.assets.find(a=>a.id===state.finishedVoiceId);await call('upsert_scene',{projectId,expectedRevision:latest.revision,scene:{id:s.id,audioId:a.id,duration:a.duration,captions:s.captions.map(c=>({...c,end:Math.min(c.end,a.duration)})),captionsStale:false,narrationStale:false,promptOverrides:{...s.promptOverrides,audioFinishing:JSON.stringify({originalAudioId:state.originalClosingAudioId,bassDb:3,pitchSemitones:.5,tempo:1})}}});}
  console.log(JSON.stringify({finishedVoiceId:state.finishedVoiceId}));
 }
 if(mode==='ready'){
  const p=await call('get_project',{projectId}),v=p.document.variants.find(v=>v.id===variantId),ss=v.sceneIds.map(id=>p.document.scenes.find(s=>s.id===id));
  if(ss.some(s=>s.narration&&!s.audioId||s.narrationStale||s.captionsStale))throw Error('Narration still missing/stale');
  const seconds=ss.reduce((n,s)=>n+s.duration,0);if(seconds>300)throw Error('Video exceeds five minutes');
  await writeFile(`${dir}/completed-timeline.json`,JSON.stringify(p,null,2));
  state.status='ready-to-render';state.seconds=seconds;await save();console.log(JSON.stringify({ready:true,seconds,verse:ss.find(s=>s.id.endsWith('-shloka')).captions}));
 }
 if(['draft','full'].includes(mode)){
  if(!['ready-to-render','completed'].includes(state.status))throw Error('Run ready check before rendering');
  if(!state.renderJobs[mode]){state.renderJobs[mode]=(await call('queue_render',{projectId,variantId,draft:mode==='draft'})).id;await save();}console.log(JSON.stringify(await call('get_job',{jobId:state.renderJobs[mode]})));
 }
 if(mode==='download'){
  const kind=process.argv[3]||'full',jobId=state.renderJobs[kind],j=await call('get_job',{jobId});if(j.state!=='completed')throw Error('Current render is not complete');
  for(const format of ['mp4','srt','vtt']){const r=await fetch(`http://localhost:3000/api/mcp/files/jobs/${jobId}/download?format=${format}`,{headers:{Authorization:`Bearer ${token}`,Connection:'close'}});if(!r.ok)throw Error(`Download failed: ${r.status}`);await writeFile(`${dir}/episode-001-${kind}.${format}`,Buffer.from(await r.arrayBuffer()));}
  if(kind==='full'){state.status='completed';state.completedAt=new Date().toISOString();await save();}
  console.log(JSON.stringify({downloaded:true,kind,...j.result}));
 }
 if(mode==='status'){
  if(state.voiceJob&&!process.argv[3])console.log(JSON.stringify({kind:'closing-voice',...await call('get_job',{jobId:state.voiceJob})}));
  for(const [kind,jobId] of Object.entries(state.renderJobs))if(!process.argv[3]||process.argv[3]===kind)console.log(JSON.stringify({kind,...await call('get_job',{jobId})}));
 }
}finally{await client.close();}
