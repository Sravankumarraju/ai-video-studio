import {youtubeChapterEntries} from './youtube-chapters.mjs';
import {replaceNarrationSourcesWithFinalScenes} from './project-scene-limit.mjs';
import {navaratriPublishing} from './navaratri-publishing.mjs';
// Resumable, single-verse long-form production. No Shorts or credential changes.
import 'dotenv/config';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {readFile,writeFile,mkdir,copyFile,rename} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
import {productionPolicy,assertChapterMediaStageReady,assertProductionMediaReady,assertAuthorizedNarrationBatchCount} from './divine-production-policy.mjs';
import {restoreVerseLabels} from './divine-aligned-labels.mjs';
const [dir,mode='status',kind='full']=process.argv.slice(2);
assert(dir,'Usage: divine-long-episode.mjs <episode-dir> <prepare|voice|media|finish|assemble|draft|full|status|download>');
const config=JSON.parse(await readFile(`${dir}/episode.json`,'utf8')),profileId='7e994f10-1088-464c-91fb-79297b8fd6cb';
const fileStem=config.fileStem||'episode-002';
const {chapter,chapterNumber,verseCount,maximumDuration}=productionPolicy(config);
await mkdir(dir,{recursive:true});
const state=await readFile(`${dir}/state.json`,'utf8').then(JSON.parse).catch(e=>{if(e.code!=='ENOENT')throw e;return {projectId:config.projectId,variantId:config.variantId,jobs:{},images:{},finished:{},renderJobs:{}};});
const save=()=>writeFile(`${dir}/state.json`,JSON.stringify(state,null,2)),token=process.env.STORY_STUDIO_MCP_TOKEN;
assert(token,'Connector token unavailable');
const client=new Client({name:'divine-long-episode',version:'1.0'});
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${token}`,Connection:'close'}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args}),t=r.content.find(c=>c.type==='text')?.text;assert(!r.isError,t);return JSON.parse(t);}
const get=()=>call('get_project',{projectId:state.projectId});
async function asset(file){const bytes=await readFile(file);if(bytes.length>8*1024*1024){return JSON.parse(execFileSync(process.execPath,['--import','tsx','scripts/upload-owner-asset.ts',state.projectId,file],{encoding:'utf8'})).id;}return (await call('import_asset',{projectId:state.projectId,name:path.basename(file),base64:bytes.toString('base64')})).id;}
const normalized=t=>t.normalize('NFC').replace(/[\p{P}\p{S}‌‍]/gu,'').trim();
const stamp=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
try{
 if(mode==='prepare'){
  if(!state.batches){
   const p=await get();assert(!p.document.musicId&&!p.document.effects.length,'Keep this version free of project-wide music');
   await writeFile(`${dir}/before-production.json`,JSON.stringify(p,null,2));
   const batches=[];config.sections.forEach((s,i)=>{assert(s.text.length<=1000);const last=batches.at(-1);if(last&&!last.verse&&s.id!=='shloka'&&(last.text+'\n\n'+s.text).length<=1000){last.text+='\n\n'+s.text;last.sections.push(i);}else batches.push({id:`${config.prefix}-source-${batches.length}`,text:s.text,sections:[i],verse:s.id==='shloka'});});
   state.batches=batches;
   p.document.scenes.push(...batches.map(b=>({id:b.id,title:config.title+' · narration source '+b.sections.join('+'),narration:b.text,voiceId:config.voiceId,providers:{voice:profileId},modes:{voice:'api'},duration:60,status:'Reviewed original Telugu script'})));
   p.document.title=config.title;p.document.script=config.sections.map(s=>s.text).join('\n\n');p.document.outline=config.sections.map(s=>s.title).join('\n');p.document.sources=config.sources.join('\n');p.document.styleGuide=config.sourceNotes;
   await call('update_project',{projectId:state.projectId,expectedRevision:p.revision,document:p.document});await save();
  }
  await writeFile(`${dir}/script-te.md`,'# '+config.title+'\n\n'+config.sections.map(s=>'## '+s.title+'\n\n'+s.text).join('\n\n')+'\n\n## Source and interpretation notes\n\n'+config.sourceNotes+'\n\n'+config.sources.join('\n'));
  console.log(JSON.stringify({projectId:state.projectId,batches:state.batches.map(b=>({id:b.id,characters:b.text.length}))}));
 }
 if(mode==='voice'){
  assertAuthorizedNarrationBatchCount(config,state);
  for(const b of state.batches){let p=await get();if(p.document.scenes.find(s=>s.id===b.id).audioId)continue;
   if(!state.jobs[b.id]){state.jobs[b.id]=(await call('queue_generation',{projectId:state.projectId,sceneId:b.id,kind:'voice',profileId,paidConfirmed:true})).id;await save();}
   for(;;){const j=await call('get_job',{jobId:state.jobs[b.id]});if(j.state==='completed'){assert(j.result?.applied!==false,'Project changed; recover saved recording before proceeding');console.log(JSON.stringify({source:b.id,state:j.state}));break;}assert(!['failed','cancelled','waiting-for-input','stale'].includes(j.state),j.error||j.state);await new Promise(r=>setTimeout(r,4000));}
  }
 }
 if(mode==='media'){
  assertChapterMediaStageReady(config,state);
  for(const p of JSON.parse(await readFile(`${dir}/image-prompts.json`,'utf8'))){if(!state.images[p.name]){state.images[p.name]=await asset(`${dir}/${p.name}.png`);await save();}}
  if(!state.logoId){state.logoId=await asset('data/branding/divine-wisdom/logo-samples/01-lotus-book.png');await save();}
  if(!state.logoClipId){await copyFile('data/productions/divine-wisdom/gita-1-1/recreated-v3/logo-welcome.mp4',`${dir}/logo-welcome.mp4`);state.logoClipId=await asset(`${dir}/logo-welcome.mp4`);await save();}
  if(!state.thumbnailId){state.thumbnailId=await asset(`${dir}/thumbnail.png`);await save();}
  console.log('Media persisted');
 }
 if(mode==='finish'){
  for(const b of state.batches){const p=await get(),s=p.document.scenes.find(s=>s.id===b.id);assert(s.audioId&&!s.narrationStale,'Narration not ready');
   if(!state.finished[b.id]){const r=await fetch(`http://localhost:3000/api/mcp/files/assets/${s.audioId}`,{headers:{Authorization:`Bearer ${token}`,Connection:'close'}});assert(r.ok);const raw=`${dir}/${b.id}-raw.mp3`,out=`${dir}/${b.id}-finished.wav`;await writeFile(raw,Buffer.from(await r.arrayBuffer()));const rate=Number(JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-of','json',raw],{encoding:'utf8'})).streams.find(s=>s.codec_type==='audio').sample_rate),ratio=2**(.5/12);
    execFileSync('ffmpeg',['-hide_banner','-v','error','-y','-i',raw,'-af',`asetrate=${rate}*${ratio},aresample=48000,atempo=${1/ratio},bass=g=3:f=110:w=0.6`,'-c:a','pcm_s16le',out],{stdio:'pipe'});state.finished[b.id]={audioId:await asset(out),rawAudioId:s.audioId};await save();}
  }console.log('Voice finishing persisted');
 }
 if(mode==='assemble'){
  assertProductionMediaReady(config,state);
  const p=await get();if(p.document.variants.some(v=>v.id===config.variantId))console.log('Already assembled');else{
   if(chapter)p.document.targetDuration=config.targetDuration||2400;
   const prompts=JSON.parse(await readFile(`${dir}/image-prompts.json`,'utf8')),ordered=[];
   const sourceArchivePath=`${dir}/narration-sources.json`,liveSources=p.document.scenes.filter(s=>state.batches.some(b=>b.id===s.id));
   if(liveSources.length===state.batches.length)await writeFile(sourceArchivePath,JSON.stringify(liveSources,null,2));
   const sourceScenes=liveSources.length===state.batches.length?liveSources:JSON.parse(await readFile(sourceArchivePath,'utf8'));
   assert.equal(sourceScenes.length,state.batches.length,'Narration source archive incomplete');
   const sourceById=new Map(sourceScenes.map(s=>[s.id,s]));
   for(const b of state.batches){const source=sourceById.get(b.id),finished=state.finished[b.id],audio=p.assets.find(a=>a.id===finished?.audioId);assert(source,'Narration source missing');assert(audio?.duration,'Finish narration first');const rawWords=source.captions.flatMap(c=>c.words||[]),words=chapter?restoreVerseLabels(rawWords,b.text):rawWords;assert.deepEqual(words.map(w=>normalized(w.text)),b.text.trim().split(/\s+/u).map(normalized));let offset=0;
    const ranges=b.sections.map(i=>{const n=config.sections[i].text.trim().split(/\s+/u).length,ws=words.slice(offset,offset+n);offset+=n;return {i,ws};}),bounds=ranges.map((r,k)=>k?(ranges[k-1].ws.at(-1).end+r.ws[0].start)/2:0);bounds.push(audio.duration);
    for(let k=0;k<ranges.length;k++){const {i,ws}=ranges[k],sec=config.sections[i],start=bounds[k],end=bounds[k+1],relative=ws.map(w=>({...w,start:Math.max(0,w.start-start),end:Math.min(end-start,w.end-start)})),verse=sec.id==='shloka';
     ordered.push({id:config.prefix+'-'+sec.id,title:sec.title,narration:sec.text,imagePrompt:prompts.find(x=>x.name===sec.image)?.prompt||'Approved logo and complete spoken channel welcome',visual:'Symbolic devotional art; modern examples are original illustrations',assetId:sec.image==='logo'?state.logoClipId:state.images[sec.image],mediaType:sec.image==='logo'?'video':'image',shortClipPolicy:'freeze',audioId:audio.id,audioStart:start,audioSlice:true,duration:end-start,captions:[{id:crypto.randomUUID(),start:relative[0].start,end:relative.at(-1).end,text:verse?config.verseDisplay:sec.text,words:relative,accuracy:'aligned',...(verse?{display:'full-verse'}:{})}],volume:1.25,voiceId:config.voiceId,providers:{voice:profileId},motion:verse||sec.image==='logo'?'static':i%2?'pan-left':'pan-right',motionEasing:'smooth',strength:verse||sec.image==='logo'?0:.025,focalX:.5,focalY:.5,transition:'cut',overlap:0,fadeIn:0,fadeOut:0,narrationStale:false,captionsStale:false,status:'Ready: narration, held shloka and clear Telugu captions',promptOverrides:{section:sec.id,audioFinishing:JSON.stringify({...finished,bassDb:3,pitchSemitones:.5,tempo:1})}});
    }
   }
   state.seconds=ordered.reduce((n,s)=>n+s.duration,0);assert(state.seconds<=maximumDuration,'Exceeds configured natural-duration limit; revise script before export');
   let at=0;const candidates=ordered.map(s=>{const x={title:s.title,start:at,required:s.id===config.prefix+'-shloka'};at+=s.duration;return x;}),entries=youtubeChapterEntries(candidates,at),chapters=entries.map(x=>`${stamp(x.start)} ${x.title}`).join('\n');
   const apology='ఈ వీడియోలో శ్లోక పఠనం, ఉచ్చారణ, అనువాదం లేదా వివరణలో ఏదైనా పొరపాటు ఉంటే మనస్ఫూర్తిగా క్షమాపణలు కోరుతున్నాం. దయచేసి సరైన మూలంతో కామెంట్‌లో తెలియజేయండి; పరిశీలించి సరిచేస్తాం.';
   const publishing={titles:['భగవద్గీత 1.2 — సవాలు ఎదురైతే ఎలా స్పందించాలి? | Divine Wisdom Telugu'],description:`Divine Wisdom Telugu ఛానల్‌కు స్వాగతం.\n\nఎపిసోడ్: 002\nగ్రంథం: భగవద్గీత\nఅధ్యాయం: 1 — అర్జున విషాద యోగం\nశ్లోకం: 1.2\nభాష: తెలుగు\n\nపాండవ సైన్యాన్ని చూసిన దుర్యోధనుడు ద్రోణాచార్యుని సమీపించిన సందర్భం, పూర్తి శ్లోక పఠనం, సులభమైన అర్థం, ముఖ్యమైన పదాలు మరియు విద్యార్థి జీవిత ఉదాహరణను తెలుసుకుందాం. వ్యాఖ్యాన భావాన్ని మూల శ్లోకం నుంచి వేరుగా వివరించాం. సహాయం కోరడం తప్పు కాదు; స్పష్టంగా ఆలోచించి సిద్ధమవడం మన ఆచరణ అంశం.\n\nశ్లోకం:\n${config.verseDisplay}\n\nవీడియో భాగాలు:\n${chapters}\n\nమూలాలు / సూచనలు:\n${config.sources.join('\n')}\nముద్రణను బట్టి పేజీ సంఖ్య మారుతుంది; అధ్యాయం మరియు శ్లోకం సూచనను ఉపయోగిస్తున్నాం. తెలుగు అర్థం, వివరణ మరియు ఆధునిక ఉదాహరణ స్వతంత్ర విద్యాపరమైన రచన.\n\nతర్వాతి వీడియో: భగవద్గీత 1.3.\nఈ రోజు కొత్తగా ఏం నేర్చుకున్నారు? కామెంట్ చేయండి. లైక్, షేర్ చేయండి. Divine Wisdom Telugu ఛానల్‌కు సబ్‌స్క్రైబ్ చేయండి.\n\nదృశ్యాలు ఊహాత్మక AI చిత్రాలు; ప్రత్యక్ష చారిత్రక చిత్రణలు కావు. వాయిస్ ఓవర్ AI సహాయంతో రూపొందించబడింది. సంగీతం లేదు.\n\n#BhagavadGita #BhagavadGitaTelugu #DivineWisdom #భగవద్గీత #తెలుగు\n\n${apology}`,hashtags:'#BhagavadGita #BhagavadGitaTelugu #DivineWisdom #భగవద్గీత #తెలుగు',chapters,thumbnailPrompt:await readFile(`${dir}/THUMBNAIL-PROMPT.md`,'utf8')};
   if(config.productionKind==='navaratri')Object.assign(publishing,navaratriPublishing(config,chapters,publishing.thumbnailPrompt));
   if(config.videoTitle)publishing.titles=[config.videoTitle];
   if(config.episodeNumber)publishing.description=publishing.description.replace('ఎపిసోడ్: 002',`ఎపిసోడ్: ${config.episodeNumber}`);
   if(config.verseRef)publishing.description=publishing.description.replace('శ్లోకం: 1.2',`శ్లోకం: ${config.verseRef}`);
   if(config.nextVerseRef)publishing.description=publishing.description.replace('తర్వాతి వీడియో: భగవద్గీత 1.3.',`తర్వాతి వీడియో: భగవద్గీత ${config.nextVerseRef}.`);
   if(config.descriptionSummary&&config.productionKind!=='navaratri'){const begin=publishing.description.indexOf('\n\nపాండవ సైన్యాన్ని'),end=publishing.description.indexOf('\n\nశ్లోకం:',begin);assert(begin>=0&&end>begin);publishing.description=publishing.description.slice(0,begin)+'\n\n'+config.descriptionSummary+publishing.description.slice(end);}
   if(chapter)publishing.description=`Divine Wisdom Telugu\nభగవద్గీత మొదటి అధ్యాయం — అర్జున విషాద యోగం\nశ్లోకాలు 1.1 నుంచి 1.47 వరకు: సులభమైన తెలుగు అర్థం, సందర్భం, తాత్పర్యం. సంస్కృత పఠనం లేదు.\n\n${config.descriptionSummary}\n\nవీడియో భాగాలు:\n${chapters}\n\nమూలాలు:\n${config.sources.join('\n')}\n\nతెలుగు వివరణ స్వతంత్ర విద్యాపరమైన రచన. పాత్రల వాదనలు, మూల భావం, ఆధునిక అన్వయాలను వేరు చేసి వివరించాం. చిత్రాలు ఊహాత్మక AI కళ; చారిత్రక ఫొటోలు కావు. వాయిస్ AI సహాయంతో రూపొందింది. సంగీతం లేదు.\n\nDivine Wisdom Telugu ఛానల్‌కు సబ్‌స్క్రైబ్ చేయండి. లైక్, షేర్ చేయండి. మీరు నేర్చుకున్న కొత్త విషయాన్ని కామెంట్ చేయండి. తరువాత రెండవ అధ్యాయంలో కృష్ణుని బోధ తెలుసుకుందాం.\n\n${publishing.hashtags}\n\n${apology}`;
   p.document.scenes=replaceNarrationSourcesWithFinalScenes(p.document.scenes,state.batches.map(b=>b.id),ordered);p.document.variants.push({id:config.variantId,name:chapter?'Divine Wisdom Telugu · Complete Chapter 1 · Telugu meanings · 16:9':`Divine Wisdom Telugu · Episode ${config.episodeNumber||'002'} · ${config.verseRef||'1.2'} · 16:9`,aspect:'landscape',sceneIds:ordered.map(s=>s.id),sceneOverrides:{},framing:{},fps:30,crf:20,bitrate:'8M',captions:true,wordHighlight:true,highlightColor:'#ffd54a',font:'Noto Sans Telugu',fontSize:96,color:'#ffffff',outline:3,background:true,position:'bottom',captionBottom:.12,encodingPreset:'fast',logoId:state.logoId,logoStart:ordered[0].duration,titleOverlay:'Divine Wisdom Telugu',targetDuration:chapter?(config.targetDuration||2400):240,maxDuration:maximumDuration,publishing});p.document.publishing=publishing;
   if(chapter&&chapterNumber!==1){
    assert(config.chapterTitle&&config.nextChapterTitle,'Complete chapter title and next-chapter title required');
    publishing.description=`Divine Wisdom Telugu\nభగవద్గీత అధ్యాయం ${chapterNumber} — ${config.chapterTitle}\nశ్లోకాలు ${chapterNumber}.1 నుంచి ${chapterNumber}.${verseCount} వరకు: సులభమైన తెలుగు అర్థం, సందర్భం, తాత్పర్యం. సంస్కృత పఠనం లేదు.\n\n${config.descriptionSummary}\n\nవీడియో భాగాలు:\n${chapters}\n\nమూలాలు:\n${config.sources.join('\n')}\n\nఆధునిక ఉదాహరణలు స్వతంత్ర విద్యాపరమైన అన్వయాలు. దృశ్యాలు ఊహాత్మక AI కళ; చారిత్రక ఫొటోలు కావు. వాయిస్ AI సహాయంతో రూపొందింది. సంగీతం లేదు.\n\nతదుపరి సంపూర్ణ అధ్యాయం: అధ్యాయం ${chapterNumber+1} — ${config.nextChapterTitle}.\nDivine Wisdom Telugu ఛానల్‌కు సబ్‌స్క్రైబ్ చేయండి. లైక్, షేర్ చేయండి. ఈ రోజు నేర్చుకున్న విషయాన్ని కామెంట్ చేయండి.\n\n${publishing.hashtags}\n\n${apology}`;
    p.document.variants.at(-1).name=`Divine Wisdom Telugu · Complete Chapter ${chapterNumber} · Telugu meanings · 16:9`;
   }
   if(config.variantName)p.document.variants.at(-1).name=config.variantName;
   if(config.visualEdition)p.document.variants.at(-1).name='Divine Wisdom Telugu · Chapter 1 · 34 illustrations · Visual V2';
   if(config.storyEdition)p.document.variants.at(-1).name='Divine Wisdom Telugu · Chapter 1 · Story edition · 16:9';
   if(config.originalMusic){publishing.description=publishing.description.replace('సంగీతం లేదు.','సున్నితమైన స్వతంత్ర వాయిద్య నేపథ్య సంగీతం ఉంది; వాయిస్ సమయంలో తగ్గుతుంది.');p.document.variants.at(-1).publishing=publishing;p.document.publishing=publishing;}
   await writeFile(`${dir}/assembly-candidate.json`,JSON.stringify(p,null,2));
   await call('update_project',{projectId:state.projectId,expectedRevision:p.revision,document:p.document});await save();await writeFile(`${dir}/completed-timeline.json`,JSON.stringify(await get(),null,2));await writeFile(`${dir}/description-te.md`,publishing.description);await writeFile(`${dir}/publishing.json`,JSON.stringify(publishing,null,2));await writeFile(`${dir}/CHAPTERS.txt`,chapters);console.log(JSON.stringify({assembled:true,seconds:state.seconds}));
  }
 }
 if(['draft','full'].includes(mode)){if(!state.renderJobs[mode]){state.renderJobs[mode]=(await call('queue_render',{projectId:state.projectId,variantId:config.variantId,draft:mode==='draft'})).id;await save();}console.log(JSON.stringify(await call('get_job',{jobId:state.renderJobs[mode]})));}
 if(mode==='status')for(const [key,id] of Object.entries({...state.jobs,...state.renderJobs})){const j=await call('get_job',{jobId:id});console.log(JSON.stringify({key,id,state:j.state,stage:j.stage,error:j.error}));}
 if(mode==='download'){const j=await call('get_job',{jobId:state.renderJobs[kind]});assert.equal(j.state,'completed');for(const format of ['mp4','srt','vtt']){const r=await fetch(`http://localhost:3000/api/mcp/files/jobs/${j.id}/download?format=${format}`,{headers:{Authorization:`Bearer ${token}`,Connection:'close'}});assert(r.ok);const output=`${dir}/${fileStem}-${kind}.${format}`;if(chapter){assert(r.body);await pipeline(Readable.fromWeb(r.body),createWriteStream(output+'.partial'));await rename(output+'.partial',output);}else await writeFile(output,Buffer.from(await r.arrayBuffer()));}console.log(JSON.stringify(j.result));}
}finally{await client.close();}
