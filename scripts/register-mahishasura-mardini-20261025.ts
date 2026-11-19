import 'dotenv/config';
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {sessionToken} from '../lib/security';
import {projectSchema,sceneSchema,variantSchema} from '../lib/schema';
import {db} from '../lib/db';
import {json} from '../lib/projects';
import {storage,storageKey} from '../lib/storage';
const root='data/productions/divine-wisdom/mahishasura-mardini-2026-10-25';
const origin=process.env.APP_ORIGIN||'http://localhost:3000';
const load=async(n:string)=>JSON.parse(await readFile(`${root}/${n}.json`,'utf8'));
const save=(n:string,v:unknown)=>writeFile(`${root}/${n}.json`,JSON.stringify(v,null,2));
async function main(){
 const p=await load('plan'),t=await load('timeline'),verification=await load('VERIFICATION'),metadata=await load('youtube-metadata');
 assert(verification.fullDecodePassed&&verification.all21VersesInCaptionOrder);
 let state:any;try{state=await load('studio-registration');}catch(e:any){if(e.code!=='ENOENT')throw e;state={projectId:'3244d863-6717-43a8-91a6-b6a6ccf743b0',assets:{}};}
 const headers={Cookie:`studio_session=${sessionToken()}`,Origin:origin};
 async function api(url:string,method='GET',body?:any){const r=await fetch(`${origin}/api/${url}`,{method,redirect:'manual',headers:{...headers,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(120000)});assert(r.ok,`Studio HTTP ${r.status}`);return r.json();}
 async function asset(name:string,file:string){
  if(state.assets[name])return state.assets[name];
  const bytes=await readFile(file);assert(bytes.length<100*1024*1024,'Asset exceeds studio limit');
  const form=new FormData();form.set('projectId',state.projectId);form.set('file',new File([new Uint8Array(bytes)],path.basename(file)));
  const r=await fetch(`${origin}/api/assets`,{method:'POST',headers,body:form,signal:AbortSignal.timeout(180000)});assert(r.ok,`Asset import HTTP ${r.status}`);
  const a=await r.json();state.assets[name]=a.id;await save('studio-registration',state);return a.id;
 }
 async function subtitleAsset(name:string,file:string,mime:string){
  if(state.assets[name])return state.assets[name];
  const bytes=await readFile(file),key=storageKey(state.projectId,path.extname(file).slice(1));
  await storage.put(key,bytes,mime);
  const a=await db.asset.create({data:{projectId:state.projectId,name:path.basename(file),kind:'text',mime,bytes:bytes.length,storageKey:key,metadata:json({source:'Provider-aligned Telugu-script captions; human pronunciation review pending'})}});
  state.assets[name]=a.id;await save('studio-registration',state);return a.id;
 }
 const audio=await asset('audio',`${root}/finished-audio-master.mp3`),hero=await asset('hero',p.art),logo=await asset('logo',p.logo);
 const film=await asset('film',`${root}/Mahishasura-Mardini-Telugu-1080p-DRAFT.mp4`);
 await asset('thumbnail',`${root}/thumbnail.jpg`);const srt=await subtitleAsset('srt',`${root}/telugu-captions.srt`,'application/x-subrip'),vtt=await subtitleAsset('vtt',`${root}/telugu-captions.vtt`,'text/vtt');
 if(!state.assembled){
  const current=await api(`projects/${state.projectId}`);assert(current.document.scenes.length===0,'Project changed; preserve edits and merge manually');
  const doc=projectSchema.parse(current.document);
  const scenes=t.scenes.map((s:any)=>sceneSchema.parse({id:`mahishasura-mardini-${s.index}`,title:s.index===0?'ఛానల్ స్వాగతం':s.index===22?'ముగింపు':`శ్లోకం ${s.index}`,narration:s.text,duration:s.duration,assetId:hero,mediaType:'image',audioId:audio,audioStart:s.start,audioSlice:true,motion:s.index%2?'zoom-out':'zoom-in',strength:.02,transition:'cut',overlap:0,volume:1,voiceId:p.voiceId,status:'Recorded draft; new voice and Sanskrit pronunciation listening review pending',captions:s.pages.map((pg:any,i:number)=>({id:`caption-${s.index}-${i}`,text:pg.text,start:pg.start-s.start,end:pg.end-s.start,display:'phrases',accuracy:'aligned',words:pg.words.map((w:any)=>({text:w.text,start:w.start-s.start,end:w.end-s.start}))}))}));
  const master=sceneSchema.parse({id:'mahishasura-mardini-master',title:'Verified 1080p draft master',duration:t.seconds,assetId:film,mediaType:'video',motion:'static',volume:1,captions:[],status:'Full decode passed; pronunciation review pending'});
  doc.outline='Recorded Telugu welcome, complete 21-stanza Sanskrit prayer in Telugu script, and closing. Actual recording determines all timings.';doc.styleGuide='Durga-with-lion channel artwork; large white Telugu captions, gold active words, gentle movement. Recording authorized within 10000 existing credits; human pronunciation review pending.';doc.stages={...doc.stages,script:true,audio:true,captions:true,render:true};
  doc.category='Devotional';doc.scenes=[...scenes,master];doc.logoId=logo;doc.targetDuration=t.seconds;
  doc.script=await readFile(`${root}/recitation-telugu-script.txt`,'utf8');
  doc.publishing={titles:[p.title],description:metadata.description,chapters:await readFile(`${root}/chapters.txt`,'utf8'),hashtags:'#AigiriNandini #MahishasuraMardini #TeluguDevotional #DivineWisdomTelugu',thumbnailPrompt:'Durga-with-lion channel illustration; Aigiri Nandini title and 21-verse label'};
  doc.variants=[variantSchema.parse({id:'editable-1080p',name:'Editable 21-verse recitation',aspect:'landscape',sceneIds:scenes.map((s:any)=>s.id),logoId:logo,captions:true,wordHighlight:true,font:'Noto Sans Telugu',fontSize:88,background:true,position:'bottom',fps:24,crf:22,targetDuration:Math.round(t.seconds),maxDuration:1800}),variantSchema.parse({id:'draft-master',name:'Verified local 1080p draft',aspect:'landscape',sceneIds:[master.id],logoId:null,captions:false,fps:24,targetDuration:Math.round(t.seconds),maxDuration:1800})];
  const saved=await api(`projects/${state.projectId}`,'PATCH',{revision:current.revision,document:projectSchema.parse(doc)});state.assembled=true;state.revision=saved.revision;await save('studio-registration',state);
 }
 const project=await api(`projects/${state.projectId}`);assert(project.document.scenes.length===24);
 const assets=await db.asset.findMany({where:{id:{in:[film,srt,vtt]}}});const find=(id:string)=>assets.find(x=>x.id===id)!;
 const data={state:'completed',stage:'Local 1080p render and full decode passed; voice review pending',snapshot:json({doc:project.document,options:{variantId:'draft-master',draft:true}}),result:json({mp4Key:find(film).storageKey,srtKey:find(srt).storageKey,vttKey:find(vtt).storageKey,duration:t.seconds,width:1920,height:1080,bytes:find(film).bytes,variantId:'draft-master',draft:true,assetId:film,localRender:true,pronunciationListeningReviewPending:true})};
 const job=await db.job.upsert({where:{dedupeKey:`mahishasura-draft-${state.projectId}`},create:{projectId:state.projectId,kind:'render',dedupeKey:`mahishasura-draft-${state.projectId}`,...data},update:data});
 state.exportJobId=job.id;state.exportAssetId=film;state.published=false;await save('studio-registration',state);await save('editable-studio-project',project);
 console.log(JSON.stringify({projectId:state.projectId,scenes:24,exportJobId:job.id,seconds:t.seconds}));
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:e.name==='ZodError'?JSON.stringify(e.issues.map((x:any)=>({path:x.path,code:x.code}))):'Studio registration stopped; credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
