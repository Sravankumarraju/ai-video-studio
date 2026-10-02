// Resumable production. Credentials stay in the environment/encrypted profile.
import 'dotenv/config';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
const dir='data/productions/divine-wisdom/gita-series-intro',mode=process.argv[2]||'status',profileId='7e994f10-1088-464c-91fb-79297b8fd6cb';
const config=JSON.parse(await readFile(`${dir}/intro.json`,'utf8'));
await mkdir(dir,{recursive:true});
let state=await readFile(`${dir}/state.json`,'utf8').then(JSON.parse).catch(e=>{if(e.code!=='ENOENT')throw e;return {jobs:{},images:{},renderJobs:{},finished:{}};});
const save=()=>writeFile(`${dir}/state.json`,JSON.stringify(state,null,2));
const token=process.env.STORY_STUDIO_MCP_TOKEN;if(!token)throw Error('Connector token unavailable');
const client=new Client({name:'divine-series-intro',version:'1.0'});await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${token}`,Connection:'close'}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args}),t=r.content.find(c=>c.type==='text')?.text;if(r.isError||!t)throw Error(t||'No response');return JSON.parse(t);}
const get=()=>call('get_project',{projectId:state.projectId});
const ff=args=>execFileSync('ffmpeg',['-hide_banner','-loglevel','error',...args],{stdio:'inherit'});
async function asset(file){return (await call('import_asset',{projectId:state.projectId,name:path.basename(file),base64:(await readFile(file)).toString('base64')})).id;}
const normalize=t=>t.normalize('NFC').replace(/[\p{P}\p{S}‌‍]/gu,'').trim();
const stamp=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
try{
 if(mode==='only-long'){
  const p=await get(),promo=p.document.variants.find(v=>v.id==='gita-intro-te-promo');if(promo)await writeFile(`${dir}/cancelled-promotional-version.json`,JSON.stringify(promo,null,2));p.document.variants=p.document.variants.filter(v=>v.id!=='gita-intro-te-promo');await call('update_project',{projectId:state.projectId,expectedRevision:p.revision,document:p.document});state.onlyLong=true;state.cancelledRenderJobs??={};for(const key of Object.keys(state.renderJobs))if(key.includes('promo')){state.cancelledRenderJobs[key]=state.renderJobs[key];delete state.renderJobs[key];}await save();await writeFile(`${dir}/completed-timeline.json`,JSON.stringify(await get(),null,2));
 }
 if(mode==='portrait'){
  assert(!state.onlyLong,'Only long-form production is authorized');
  for(const name of ['manual-vertical','book-vertical'])if(!state.images[name]){state.images[name]=await asset(`${dir}/${name}.png`);await save();}
  if(!state.verticalLogoClipId){const logo='data/branding/divine-wisdom/logo-samples/01-lotus-book.png',clip=`${dir}/logo-welcome-vertical.mp4`;ff(['-y','-loop','1','-i',logo,'-f','lavfi','-i','color=c=0x090b2c:s=1080x1920:r=30:d=3','-filter_complex','[0:v]scale=720:720,format=rgba,fade=t=in:st=0:d=0.3:alpha=1[lg];[1:v][lg]overlay=(W-w)/2:(H-h)/2:shortest=1,format=yuv420p[v]','-map','[v]','-t','3','-c:v','libx264','-preset','fast','-an',clip]);state.verticalLogoClipId=await asset(clip);await save();}
  const p=await get(),v=p.document.variants.find(v=>v.id==='gita-intro-te-promo');
  for(const id of v.sceneIds){const s=p.document.scenes.find(s=>s.id===id),name=s.promptOverrides.section==='hook'?'manual-vertical':'book-vertical';v.sceneOverrides[id]={...structuredClone(s),assetId:s.promptOverrides.section==='welcome'?state.verticalLogoClipId:state.images[name],imagePrompt:s.promptOverrides.section==='welcome'?'Centered portrait logo and spoken series welcome':JSON.parse(await readFile(`${dir}/portrait-prompts.json`,'utf8')).find(x=>x.name===name).prompt};}
  await call('update_project',{projectId:state.projectId,expectedRevision:p.revision,document:p.document});await writeFile(`${dir}/completed-timeline.json`,JSON.stringify(await get(),null,2));if(state.renderJobs['gita-intro-te-promo-draft']){state.renderJobs['gita-intro-te-promo-draft-initial']=state.renderJobs['gita-intro-te-promo-draft'];delete state.renderJobs['gita-intro-te-promo-draft'];}await save();
 }
 if(mode==='correct-title'){
  assert(!Object.keys(state.jobs).length,'Do not change narration already submitted');const p=await get();state.batches.forEach(b=>{b.text=b.sections.map(i=>config.sections[i].text).join('\n\n');p.document.scenes.find(s=>s.id===b.id).narration=b.text;});p.document.script=config.sections.map(s=>s.text).join('\n\n');await call('update_project',{projectId:state.projectId,expectedRevision:p.revision,document:p.document});await save();
 }
 if(mode==='prepare'){
  if(!state.projectId){
   const batches=[];config.sections.forEach((s,i)=>{const last=batches.at(-1);if(last&&(last.text+'\n\n'+s.text).length<=1000){last.text+='\n\n'+s.text;last.sections.push(i);}else batches.push({id:`gita-intro-source-${batches.length}`,text:s.text,sections:[i]});});
   state.batches=batches;
   const p=await call('create_project',{document:{title:config.title,topic:'Why Bhagavad Gita? A practical motivational introduction to the Divine Wisdom verse-by-verse series',category:'Devotional',language:'te',subtitleLanguage:'te',mode:'manual',targetDuration:300,shortTargetDuration:60,style:'Luminous devotional watercolor-and-ink; cosmic indigo and gold; original Episode 001 style',audience:'Telugu-speaking youth, adults and older people',sources:config.sources.join('\n'),sourceClassification:'interpretation',script:config.sections.map(s=>s.text).join('\n\n'),outline:config.sections.map(s=>s.title).join('\n'),styleGuide:config.sourceNotes,providers:{voice:profileId},budget:10,generationLimit:20,unknownCostPolicy:'block',reviewCheckpoints:true,scenes:batches.map(b=>({id:b.id,title:'Source narration '+b.sections.join('+'),narration:b.text,voiceId:config.voiceId,providers:{voice:profileId},modes:{voice:'api'},duration:90,status:'Prepared original Telugu script'})),variants:[]}});
   state.projectId=p.id;await save();
  }
  await writeFile(`${dir}/script-te.md`,'# '+config.title+'\n\n'+config.sections.map(s=>'## '+s.title+'\n\n'+s.text).join('\n\n')+'\n\n## Research and editorial notes\n\n'+config.sourceNotes+'\n\n'+config.sources.map(s=>'- '+s).join('\n')+'\n');
  console.log(JSON.stringify({projectId:state.projectId,batches:state.batches.map(b=>({id:b.id,chars:b.text.length}))}));
 }
 if(mode==='voice'){
  for(const b of state.batches){let p=await get();if(p.document.scenes.find(s=>s.id===b.id).audioId)continue;
   if(state.jobs[b.id]){const old=await call('get_job',{jobId:state.jobs[b.id]});if(old.state==='completed'&&old.result?.assetId){const a=p.assets.find(a=>a.id===old.result.assetId),{narrationTiming}=await import('../lib/alignment.ts');const recovered=JSON.parse(await readFile(`${dir}/recovered-alignment.json`,'utf8')).find(x=>x.id===a.id);assert(recovered?.alignment,'Saved alignment unavailable');await call('upsert_scene',{projectId:state.projectId,expectedRevision:p.revision,scene:{id:b.id,audioId:a.id,duration:a.duration,...narrationTiming(recovered.alignment,a.duration)}});console.log(JSON.stringify({batch:b.id,recovered:true}));continue;}if(old.state==='failed'){assert(old.error?.includes('HTTP 429'),'Review failed provider call before retrying');state.failedJobs??={};state.failedJobs[b.id]=state.jobs[b.id];delete state.jobs[b.id];await save();}}
   if(!state.jobs[b.id]){state.jobs[b.id]=(await call('queue_generation',{projectId:state.projectId,sceneId:b.id,kind:'voice',profileId,paidConfirmed:true})).id;await save();}
   for(;;){const j=await call('get_job',{jobId:state.jobs[b.id]});if(j.state==='completed'){console.log(JSON.stringify({batch:b.id,state:j.state,applied:j.result?.applied}));break;}assert(!['failed','cancelled','waiting-for-input'].includes(j.state),j.error||j.state);await new Promise(r=>setTimeout(r,4000));}
  }
 }
 if(mode==='media'){
  const prompts=JSON.parse(await readFile(`${dir}/image-prompts.json`,'utf8'));
  for(const p of prompts){if(!state.images[p.name]){state.images[p.name]=await asset(`${dir}/${p.name}.png`);await save();}}
  if(!state.logoId){state.logoId=await asset('data/branding/divine-wisdom/logo-samples/01-lotus-book.png');await save();}
  if(!state.logoClipId){await copyFile('data/productions/divine-wisdom/gita-1-1/recreated-v3/logo-welcome.mp4',`${dir}/logo-welcome.mp4`);state.logoClipId=await asset(`${dir}/logo-welcome.mp4`);await save();}
  if(!state.thumbnailId){state.thumbnailId=await asset(`${dir}/thumbnail.png`);await save();}
  console.log(JSON.stringify({mediaImported:true}));
 }
 if(mode==='finish'){
  for(const b of state.batches){let p=await get();const s=p.document.scenes.find(s=>s.id===b.id);assert(s.audioId&&!s.narrationStale,'Narration not ready: '+b.id);
   if(!state.finished[b.id]){const r=await fetch(`http://localhost:3000/api/mcp/files/assets/${s.audioId}`,{headers:{Authorization:`Bearer ${token}`,Connection:'close'}});assert(r.ok);const raw=`${dir}/${b.id}-raw.mp3`,out=`${dir}/${b.id}-finished.wav`;await writeFile(raw,Buffer.from(await r.arrayBuffer()));const rate=Number(JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-of','json',raw],{encoding:'utf8'})).streams.find(s=>s.codec_type==='audio').sample_rate),ratio=2**(.5/12);ff(['-y','-i',raw,'-af',`asetrate=${rate}*${ratio},aresample=48000,atempo=${1/ratio},bass=g=3:f=110:w=0.6`,'-c:a','pcm_s16le',out]);state.finished[b.id]={audioId:await asset(out),rawAudioId:s.audioId};await save();}
  }console.log(JSON.stringify({finished:true}));
 }
 if(mode==='assemble'){
  let p=await get();if(p.document.variants.some(v=>v.id==='gita-intro-te-16x9')){console.log('Already assembled');}
  else{
   await writeFile(`${dir}/before-assembly.json`,JSON.stringify(p,null,2));
   const prompts=JSON.parse(await readFile(`${dir}/image-prompts.json`,'utf8')),ordered=[];
   for(const b of state.batches){const source=p.document.scenes.find(s=>s.id===b.id),finished=state.finished[b.id];assert(finished,'Finish voice first');const audio=p.assets.find(a=>a.id===finished.audioId);const words=source.captions.flatMap(c=>c.words||[]);assert(words.length,'Aligned captions missing');assert.deepEqual(words.map(w=>normalize(w.text)),b.text.trim().split(/\s+/u).map(normalize));let offset=0;
    const ranges=b.sections.map(i=>{const n=config.sections[i].text.trim().split(/\s+/u).length,ws=words.slice(offset,offset+n);offset+=n;return {i,ws};});
    const bounds=ranges.map((r,k)=>k?(ranges[k-1].ws.at(-1).end+r.ws[0].start)/2:0);bounds.push(audio.duration);
    for(let k=0;k<ranges.length;k++){const {i,ws}=ranges[k],sec=config.sections[i],start=bounds[k],end=bounds[k+1],relative=ws.map(w=>({...w,start:Math.max(0,w.start-start),end:Math.min(end-start,w.end-start)}));assert(end>start);ordered.push({id:'gita-intro-'+sec.id,title:sec.title,narration:sec.text,visual:'Original symbolic devotional illustration; modern examples are editorial analogies',imagePrompt:prompts.find(x=>x.name===sec.image)?.prompt||'Selected Divine Wisdom logo with spoken welcome',assetId:sec.image==='logo'?state.logoClipId:state.images[sec.image],mediaType:sec.image==='logo'?'video':'image',shortClipPolicy:'freeze',audioId:audio.id,audioStart:start,audioSlice:true,duration:end-start,captions:[{id:crypto.randomUUID(),start:relative[0].start,end:relative.at(-1).end,text:sec.text,words:relative,accuracy:'aligned'}],volume:1.25,voiceId:config.voiceId,providers:{voice:profileId},motion:sec.image==='logo'?'static':i%2?'pan-left':'pan-right',motionEasing:'smooth',strength:sec.image==='logo'?0:.025,focalX:.5,focalY:.5,transition:'cut',overlap:0,fadeIn:0,fadeOut:0,narrationStale:false,captionsStale:false,status:'Narration, visuals and aligned captions ready',promptOverrides:{section:sec.id,audioFinishing:JSON.stringify({...finished,bassDb:3,pitchSemitones:.5,tempo:1})}});}
   }
   const seconds=ordered.reduce((n,s)=>n+s.duration,0);assert(seconds<=390,'Introduction exceeds six and a half minutes; revise script naturally');state.seconds=seconds;
   let at=0;const chapterEntries=ordered.map(s=>{const x={title:s.title,start:at};at+=s.duration;return x;}).filter((x,i,a)=>!i||x.start-a[i-1].start>=10);const chapters=chapterEntries.map(c=>`${stamp(c.start)} ${c.title}`).join('\n');
   const apology='ఈ వీడియోలో శ్లోక పఠనం, ఉచ్చారణ, అనువాదం లేదా వివరణలో ఏదైనా పొరపాటు ఉంటే మనస్ఫూర్తిగా క్షమాపణలు కోరుతున్నాం. దయచేసి సరైన మూలంతో కామెంట్‌లో తెలియజేయండి; పరిశీలించి సరిచేస్తాం.';
   const thumbnailPrompt=await readFile(`${dir}/THUMBNAIL-PROMPT.md`,'utf8');
   const publishing={titles:['భగవద్గీత ఎందుకు? జీవితానికి ఒక మార్గదర్శిని | Divine Wisdom Telugu','జీవితం కోసం గీత — ప్రతి వయసుకు ఒక కొత్త ఆలోచన'],description:`భగవద్గీత ఎందుకు? జీవితానికి ఒక మార్గదర్శిని | Divine Wisdom Telugu\n\nDivine Wisdom కు స్వాగతం. ఈ సిరీస్ పరిచయంలో గీత ఉద్దేశం, పద్దెనిమిది అధ్యాయాలు, ఏడు వందల శ్లోకాలు, కర్మయోగం, జ్ఞానం, భక్తి, సమత్వం మరియు రోజువారీ జీవితానికి వాటి సంబంధాన్ని తెలుసుకుందాం. విద్యార్థులు, ఉద్యోగం కోసం ప్రయత్నిస్తున్న యువత, కుటుంబ సభ్యులు, పెద్దలు ఆలోచించగల ఉదాహరణలు ఉన్నాయి. జీవిత సూచనల పుస్తకం అనే పోలిక మన వివరణ కోసం ఉపయోగించిన ఉపమానం. సమస్యలు ఆటోమేటిక్‌గా మాయమవుతాయని హామీ కాదు.\n\nమన సిరీస్: మొదటి అధ్యాయం, మొదటి శ్లోకం నుంచి క్రమంగా; ఒక్కో వీడియోలో ఒక్క శ్లోకం, సందర్భం, పఠనం, అర్థం, వివరణ, జీవిత ఉదాహరణ, ఒక ఆచరణ.\n\nవీడియో భాగాలు:\n${chapters}\n\nమూలాలు / సూచనలు:\n${config.sources.join('\n')}\nస్వతంత్ర తెలుగు పరిచయం; ఆధునిక ఉదాహరణలు మూల శ్లోకాలు కావు. రచనాకాలంపై పండితుల మధ్య భిన్న అభిప్రాయాలు ఉన్నాయి. ఇందులో పూర్తి శ్లోక పఠనం లేదు; అంశాలకు సంబంధిత శ్లోకాలు 2.47, 2.48, 6.5, 18.63.\n\nమీ జీవితంలో ఇప్పుడు ఏ ప్రశ్నకు మార్గం కావాలి? కామెంట్‌లో చెప్పండి. లైక్ చేయండి, కుటుంబ సభ్యులతో మరియు స్నేహితులతో షేర్ చేయండి, Divine Wisdom ఛానల్‌కు సబ్‌స్క్రైబ్ చేయండి. తర్వాతి వీడియో: భగవద్గీత 1.1.\n\nదృశ్యాలు ఊహాత్మక AI చిత్రాలు; చారిత్రక సంఘటనల ప్రత్యక్ష చిత్రణలు కావు. వాయిస్ ఓవర్ AI సహాయంతో రూపొందించబడింది. సంగీతం లేదు.\n\n#BhagavadGita #BhagavadGitaTelugu #DivineWisdom #భగవద్గీత #తెలుగు\n\n${apology}`,hashtags:'#BhagavadGita #BhagavadGitaTelugu #DivineWisdom #భగవద్గీత #తెలుగు',thumbnailPrompt,chapters};
   const base={fps:30,crf:20,bitrate:'8M',captions:true,wordHighlight:true,highlightColor:'#ffd54a',font:'Noto Sans Telugu',fontSize:96,color:'#ffffff',outline:3,background:true,position:'bottom',captionBottom:.12,encodingPreset:'fast',logoId:state.logoId,logoStart:ordered[0].duration,titleOverlay:'',targetDuration:300,maxDuration:390,sceneIds:ordered.map(s=>s.id),sceneOverrides:{},publishing};
   p.document.scenes.push(...ordered);p.document.variants.push({...base,id:'gita-intro-te-16x9',name:'Divine Wisdom Telugu · గీత సిరీస్ పరిచయం · 16:9',aspect:'landscape'});
   p.document.publishing=publishing;await call('update_project',{projectId:state.projectId,expectedRevision:p.revision,document:p.document});await save();await writeFile(`${dir}/completed-timeline.json`,JSON.stringify(await get(),null,2));await writeFile(`${dir}/description-te.md`,publishing.description);await writeFile(`${dir}/publishing.json`,JSON.stringify(publishing,null,2));console.log(JSON.stringify({assembled:true,seconds,promoSeconds:state.promoSeconds}));
  }
 }
 if(['draft','full'].includes(mode))for(const variantId of ['gita-intro-te-16x9']){const key=variantId+'-'+mode;if(!state.renderJobs[key]){state.renderJobs[key]=(await call('queue_render',{projectId:state.projectId,variantId,draft:mode==='draft'})).id;await save();}console.log(JSON.stringify({key,...await call('get_job',{jobId:state.renderJobs[key]})}));}
 if(mode==='download')for(const variantId of ['gita-intro-te-16x9']){const kind=process.argv[3]||'full',jobId=state.renderJobs[variantId+'-'+kind],j=await call('get_job',{jobId});assert.equal(j.state,'completed');for(const format of ['mp4','srt','vtt']){const r=await fetch(`http://localhost:3000/api/mcp/files/jobs/${jobId}/download?format=${format}`,{headers:{Authorization:`Bearer ${token}`,Connection:'close'}});assert(r.ok);await writeFile(`${dir}/${variantId}-${kind}.${format}`,Buffer.from(await r.arrayBuffer()));}console.log(JSON.stringify({downloaded:variantId,...j.result}));}
 if(mode==='status'){console.log(JSON.stringify({projectId:state.projectId,seconds:state.seconds,promoSeconds:state.promoSeconds}));for(const [key,jobId] of Object.entries({...state.jobs,...state.renderJobs})){const j=await call('get_job',{jobId});console.log(JSON.stringify({key,id:jobId,state:j.state,stage:j.stage,error:j.error}));}}
}finally{await client.close();}



