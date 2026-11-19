import 'dotenv/config';
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {db} from '../lib/db';
import {storage,storageKey} from '../lib/storage';
import {projectSchema,sceneSchema,variantSchema} from '../lib/schema';
import {validateStructure,json} from '../lib/projects';
const root='data/productions/divine-wisdom/dakshinamurthy-2026-10-23';
const load=async(n:string)=>JSON.parse(await readFile(`${root}/${n}.json`,'utf8'));
const save=(n:string,v:unknown)=>writeFile(`${root}/${n}.json`,JSON.stringify(v,null,2));
async function main(){
 const t=await load('timeline'),c=await load('captions'),p=await load('plan'),verification=await load('VERIFICATION');
 assert(verification.fullDecodePassed&&verification.allMainVersesInOrder);
 let state:any;
 try{state=await load('studio-registration');}catch(e:any){if(e.code!=='ENOENT')throw e;state={assets:{}};}
 const title='శ్రీ దక్షిణామూర్తి స్తోత్రం | తెలుగు సాహిత్యంతో';
 if(!state.projectId){
  const prior=JSON.parse(await readFile('data/productions/divine-wisdom/govinda-namalu-full-2026-10-20/studio-registration.json','utf8'));
  const original=await db.project.findUniqueOrThrow({where:{id:prior.projectId},select:{seriesId:true}});
  const project=await db.project.create({data:{title,seriesId:original.seriesId,document:json(projectSchema.parse({title,language:'te',subtitleLanguage:'te'}))}});
  state.projectId=project.id;await save('studio-registration',state);
 }
 async function asset(file:string,kind:string,mime:string,duration?:number){
  if(state.assets[file])return state.assets[file];
  const bytes=await readFile(`${root}/${file}`),key=storageKey(state.projectId,path.extname(file).slice(1));
  await storage.put(key,bytes,mime);
  const a=await db.asset.create({data:{projectId:state.projectId,name:path.basename(file),kind,mime,bytes:bytes.length,storageKey:key,duration,metadata:json({source:kind==='image'&&file.startsWith('art/')?'Original built-in ImageGen devotional artwork':kind==='audio'?'Original ElevenLabs music_v2_5 chant and eleven_v4 channel bookends':'Divine Wisdom Telugu production',parameters:{productionFolder:root,pronunciationListeningReviewPending:true},generatedAt:new Date().toISOString()})}});
  state.assets[file]=a.id;await save('studio-registration',state);return a.id;
 }
 const audio=await asset('finished-audio-master.mp3','audio','audio/mpeg',t.seconds),logo=await asset('channel-logo.png','image','image/png');
 const images:Record<string,string>={};for(const s of t.scenes)if(!images[s.image])images[s.image]=await asset(`art/${s.image}.png`,'image','image/png');
 const scenes=t.scenes.map((s:any)=>sceneSchema.parse({id:`dakshina-screen-${s.index}`,title:s.kind==='welcome'?'ఛానల్ స్వాగతం':s.kind==='closing'?'సబ్‌స్క్రైబ్ · లైక్ · షేర్ · కామెంట్':`శ్లోకం ${s.verse}`,duration:s.seconds,assetId:images[s.image],audioId:audio,audioSlice:true,audioStart:s.start,narration:s.kind==='prayer'?p.units[s.verse-1].text:p.welcomeAndClosing[s.kind==='welcome'?0:1].text,visual:s.image,mediaType:'image',motion:s.index%2?'zoom-out':'zoom-in',strength:.02,transition:'cut',overlap:0,
 captions:c.pages.filter((pg:any)=>pg.start<s.end&&pg.end>s.start).map((pg:any,index:number)=>({id:`caption-${s.index}-${index}`,text:pg.display,start:Math.max(0,pg.start-s.start),end:Math.min(s.seconds,pg.end-s.start),accuracy:'aligned',words:pg.words.map((w:any)=>({text:w.text,start:Math.max(0,w.start-s.start),end:Math.min(s.seconds,w.end-s.start)})).filter((w:any)=>w.end>w.start)})),status:'Rendered; source coverage and technical checks passed; pronunciation listening review pending'}));
 const variant=variantSchema.parse({id:'full-1080p',name:'శ్రీ దక్షిణామూర్తి స్తోత్రం • 1080p',aspect:'landscape',sceneIds:scenes.map((s:any)=>s.id),fps:24,crf:19,font:'Noto Sans Telugu',fontSize:88,captions:true,background:true,position:'bottom',wordHighlight:false,logoId:logo,maxDuration:900,targetDuration:Math.round(t.seconds),titleOverlay:'శ్రీ దక్షిణామూర్తి స్తోత్రం'});
 const doc=projectSchema.parse({title,language:'te',subtitleLanguage:'te',category:'Devotional',mode:'manual',targetDuration:t.seconds,topic:'Complete ten-verse Sri Dakshinamurthy Stotram, original female melodic devotional chant, Telugu lyrics, channel welcome and closing',script:await readFile(`${root}/lyrics-telugu.txt`,'utf8'),sourceClassification:'traditional',sources:p.source+'\nStyle reference: '+p.reference,style:'Three original Dakshinamurthy illustrations: golden banyan grove, blue moonlit mural, bronze temple shrine. Gentle motion and existing channel branding.',styleGuide:'16:9 Full HD; original traditional text in Telugu script; acoustic line timings; channel name and logo; spoken welcome and subscribe, like, share and comment ending.',pronunciation:'Source order checked against provider lyric metadata. Human Sanskrit pronunciation listening review remains pending; alignment does not prove correct singing.',logoId:logo,scenes,variants:[variant]});
 validateStructure(doc);
 if(!state.assembled){
  const existing=await db.project.findUniqueOrThrow({where:{id:state.projectId}});
  await db.projectVersion.create({data:{projectId:state.projectId,revision:existing.revision,document:existing.document as any}});
  await db.project.update({where:{id:state.projectId},data:{document:json(doc),revision:{increment:1}}});state.assembled=true;await save('studio-registration',state);
 }
 const video=await asset('Sri-Dakshinamurthy-Stotram-Telugu-1080p.mp4','video','video/mp4',t.seconds),thumb=await asset('thumbnail.jpg','image','image/jpeg'),srt=await asset('telugu-captions.srt','text','application/x-subrip'),vtt=await asset('telugu-captions.vtt','text','text/vtt');
 const assets=await db.asset.findMany({where:{id:{in:[video,srt,vtt]}}});const find=(id:string)=>assets.find(a=>a.id===id)!;
 const data={state:'completed',stage:'Full HD render and technical verification complete; pronunciation review pending',snapshot:json({doc,options:{variantId:variant.id,draft:false}}),result:json({mp4Key:find(video).storageKey,srtKey:find(srt).storageKey,vttKey:find(vtt).storageKey,duration:t.seconds,width:1920,height:1080,bytes:find(video).bytes,variantId:variant.id,draft:false,assetId:video,localRender:true,pronunciationListeningReviewPending:true})};
 const job=await db.job.upsert({where:{dedupeKey:`dakshina-full-${state.projectId}`},create:{projectId:state.projectId,kind:'render',dedupeKey:`dakshina-full-${state.projectId}`,...data},update:data});
 state.exportJobId=job.id;state.exportAssetId=video;state.thumbnailAssetId=thumb;state.published=false;await save('studio-registration',state);await save('editable-studio-project',{projectId:state.projectId,document:doc});
 console.log(JSON.stringify({projectId:state.projectId,scenes:scenes.length,exportJobId:job.id}));
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:'Studio registration stopped; credentials suppressed.',e.name);process.exitCode=1;}).finally(()=>db.$disconnect());
