import 'dotenv/config';
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {sessionToken} from '../lib/security';
import {projectSchema,sceneSchema,variantSchema} from '../lib/schema';
import {db} from '../lib/db';
import {json} from '../lib/projects';
import {storage,storageKey} from '../lib/storage';
const root='data/productions/divine-wisdom/mahishasura-mardini-2026-10-25/female-full-v3';
const origin=process.env.APP_ORIGIN||'http://localhost:3000';
const load=async(n:string)=>JSON.parse(await readFile(`${root}/${n}.json`,'utf8'));
const save=(n:string,v:unknown)=>writeFile(`${root}/${n}.json`,JSON.stringify(v,null,2));
async function main(){
 const p=await load('full-production-plan'),t=await load('timeline'),v=await load('VERIFICATION'),metadata=await load('youtube-metadata');
 assert(v.fullDecodePassed&&v.completeShlokaAlwaysVisible&&v.allFourClosingPrompts);
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

 const audio=await asset('female-audio',`${root}/finished-audio-master.mp3`),hero=await asset('hero',p.art),logo=await asset('transparent-logo',p.logo);
 const film=await asset('female-v3-film',`${root}/Aigiri-Nandini-Female-Chant-Full-Shlokas-1080p.mp4`);
 const welcome=await asset('welcome-card',`${root}/welcome-card.png`),closing=await asset('closing-card',`${root}/closing-card.png`);
 await asset('thumbnail',`${root}/thumbnail.jpg`);
 const srt=await subtitleAsset('srt',`${root}/telugu-captions.srt`,'application/x-subrip'),vtt=await subtitleAsset('vtt',`${root}/telugu-captions.vtt`,'text/vtt');
 if(!state.assembled){
  const current=await api(`projects/${state.projectId}`);const doc=projectSchema.parse(current.document);
  assert(!doc.scenes.some(s=>s.id.startsWith('female-v3-')),'Revision already present; inspect instead of replacing edits');
  const scenes=t.scenes.map((s:any)=>sceneSchema.parse({id:`female-v3-${s.index}`,title:s.kind==='verse'?`పూర్తి శ్లోకం ${s.number}`:s.kind==='welcome'?'ఛానల్ స్వాగతం':'సబ్‌స్క్రైబ్ • లైక్ • షేర్ • కామెంట్',narration:s.text,duration:s.duration,assetId:s.kind==='verse'?hero:s.kind==='welcome'?welcome:closing,mediaType:'image',audioId:audio,audioStart:s.start,audioSlice:true,motion:s.kind==='verse'?'zoom-in':'static',strength:s.kind==='verse'?.015:0,transition:'cut',overlap:0,volume:1,status:'Female chant; quiet music; full pronunciation review pending',captions:s.kind==='verse'?[{id:`female-v3-caption-${s.number}`,text:s.text,start:0,end:s.duration,display:'full-verse',accuracy:'aligned',words:s.words}]:[]}));
  const master=sceneSchema.parse({id:'female-v3-master',title:'Female chant • full shlokas • verified 1080p master',duration:t.seconds,assetId:film,mediaType:'video',motion:'static',volume:1,captions:[],status:'Verified draft; full pronunciation listening review pending'});
  // Preserve earlier scenes, assets, locks and variants; add the approved revision in front.
  doc.scenes=[...scenes,master,...doc.scenes];doc.logoId=logo;doc.targetDuration=t.seconds;
  doc.script=await readFile(`${root}/recitation-telugu-script.txt`,'utf8');
  doc.outline='Female melodic chant: welcome, all 21 complete shlokas, and subscribe/like/share/comment closing. Actual audio timing; no speed changes.';
  doc.styleGuide='Full four-line shloka always visible; gold active words; transparent full channel logo; gentle Durga image motion. Locally separated accompaniment reduced about 14 dB, vocal gain +2.3 dB before peak safety and mastering. Bookend cards show full logo.';
  doc.stages={...doc.stages,script:true,audio:true,captions:true,render:true};
  doc.publishing={...doc.publishing,titles:[p.title],description:metadata.description,chapters:await readFile(`${root}/chapters.txt`,'utf8'),hashtags:'#AigiriNandini #MahishasuraMardini #TeluguDevotional #DivineWisdomTelugu'};
  doc.variants=[variantSchema.parse({id:'female-v3-master',name:'Female chant • completed 1080p master',aspect:'landscape',sceneIds:[master.id],logoId:null,captions:false,fps:24,targetDuration:Math.round(t.seconds),maxDuration:1800}),variantSchema.parse({id:'female-v3-editable',name:'Female chant • editable full shlokas',aspect:'landscape',sceneIds:scenes.map(s=>s.id),logoId:logo,captions:true,wordHighlight:true,font:'Noto Sans Telugu',fontSize:66,background:true,position:'bottom',fps:24,crf:23,targetDuration:Math.round(t.seconds),maxDuration:1800}),...doc.variants];
  const saved=await api(`projects/${state.projectId}`,'PATCH',{revision:current.revision,document:projectSchema.parse(doc)});state.assembled=true;state.revision=saved.revision;await save('studio-registration',state);
 }
 const project=await api(`projects/${state.projectId}`);assert(project.document.variants.some((x:any)=>x.id==='female-v3-master'));
 const assets=await db.asset.findMany({where:{id:{in:[film,srt,vtt]}}});const find=(id:string)=>assets.find(x=>x.id===id)!;
 const data={state:'completed',stage:'Female chant, full shlokas, quiet music; technical checks passed',snapshot:json({doc:project.document,options:{variantId:'female-v3-master',draft:true}}),result:json({mp4Key:find(film).storageKey,srtKey:find(srt).storageKey,vttKey:find(vtt).storageKey,duration:t.seconds,width:1920,height:1080,bytes:find(film).bytes,variantId:'female-v3-master',draft:true,assetId:film,localRender:true,fullPronunciationReviewPending:true})};
 const job=await db.job.upsert({where:{dedupeKey:`mahishasura-female-v3-${state.projectId}`},create:{projectId:state.projectId,kind:'render',dedupeKey:`mahishasura-female-v3-${state.projectId}`,...data},update:data});
 state.exportJobId=job.id;state.published=false;await save('studio-registration',state);await save('editable-studio-project',project);
 console.log(JSON.stringify({projectId:state.projectId,revision:project.revision,exportJobId:job.id,newScenes:24,seconds:t.seconds}));
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:e.name==='ZodError'?JSON.stringify(e.issues.map((x:any)=>({path:x.path,code:x.code}))):'Studio registration stopped; credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
