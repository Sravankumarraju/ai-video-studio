import 'dotenv/config';
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile,writeFile,access} from 'node:fs/promises';
import {db} from '../lib/db';
import {storage,storageKey} from '../lib/storage';
import {projectSchema,sceneSchema,variantSchema} from '../lib/schema';
import {json,validateStructure} from '../lib/projects';
const root='output/om-namah-shivaya-108-2026-10-23';
const save=(v:unknown)=>writeFile(`${root}/studio-registration.json`,JSON.stringify(v,null,2));
async function main(){
 const verification=JSON.parse(await readFile(`${root}/VERIFICATION.json`,'utf8'));assert(verification.fullDecodePassed&&verification.repetitions===108);
 const plan=JSON.parse(await readFile(`${root}/production-plan.json`,'utf8'));const title=plan.title;
 let r:any;try{await access(`${root}/studio-registration.json`);r=JSON.parse(await readFile(`${root}/studio-registration.json`,'utf8'));}catch{r={assets:{}};}
 if(!r.projectId){const p=await db.project.create({data:{title,document:json(projectSchema.parse({title,language:'hi',subtitleLanguage:'en'}))}});r.projectId=p.id;await save(r);}
 async function asset(name:string,kind:string,mime:string,duration?:number){
  if(r.assets[name])return r.assets[name];
  const bytes=await readFile(`${root}/${name}`),key=storageKey(r.projectId,path.extname(name).slice(1));await storage.put(key,bytes,mime);
  const a=await db.asset.create({data:{projectId:r.projectId,name,kind,mime,duration,bytes:bytes.length,storageKey:key,metadata:json({source:'Original Om Namah Shivaya 108 production, user approved credit usage',parameters:{productionFolder:root,humanPronunciationListeningReviewPending:true,animatedStillComposite:true},generatedAt:new Date().toISOString()})}});r.assets[name]=a.id;await save(r);return a.id;
 }
 const mp4=await asset('Om-Namah-Shivaya-108-1080p.mp4','video','video/mp4',888);
 await asset('water-flowers-loop.mp4','video','video/mp4',16);await asset('chant-cycle.wav','audio','audio/wav',8);await asset('shiva-lingam.png','image','image/png');
 await asset('Shiva-Water-Flowers-Loop.gif','image','image/gif');const thumb=await asset('preview.jpg','image','image/jpeg');const srt=await asset('Om-Namah-Shivaya-108.srt','text','application/x-subrip');
 const scene=sceneSchema.parse({id:'shiva-master',title:'108 chants with animated abhishekam and flower offerings',duration:888,mediaType:'video',assetId:mp4,motion:'static',transition:'cut',overlap:0,muted:false,shortClipPolicy:'reject',narration:'ॐ नमः शिवाय\n'.repeat(108),visual:plan.visual,status:'Complete master; pronunciation listening review pending'});
 const variant=variantSchema.parse({id:'landscape',name:'108 repetitions · 1080p landscape',aspect:'landscape',sceneIds:[scene.id],targetDuration:888,captions:false,publishing:{titles:[title],description:'108 repetitions of Om Namah Shivaya with original relaxing chant music and animated Shiva lingam water and flower offerings. Salutations to Shiva. Healing and protection express devotional aspirations. AI-created artwork and music; original composite animation.'}});
 const doc=projectSchema.parse({title,category:'Devotional',language:'hi',subtitleLanguage:'en',mode:'manual',targetDuration:888,topic:'Sanskrit Om Namah Shivaya japa with English meaning cards',audience:'Devotional chanting and meditation listeners',sourceClassification:'traditional',sources:plan.sources.join('\n'),script:'ॐ नमः शिवाय\n'.repeat(108),scenes:[scene],variants:[variant],style:'Warm temple, Shiva lingam, flowing water, continuous flower offering animation',pronunciation:'Independent ASR recognized four complete source chants. A complete second cycle is repeated 108 times without tempo or pitch changes. Human listening review pending.',styleGuide:'Original ImageGen artwork with periodic water and jasmine/rose particle compositing. 16-second meaning introduction, 108 eight-second chants, 8-second quiet close. Baked English and Sanskrit lettering.'});validateStructure(doc);
 if(!r.assembled){const current=await db.project.findUniqueOrThrow({where:{id:r.projectId}});await db.projectVersion.create({data:{projectId:r.projectId,revision:current.revision,document:current.document as any}});await db.project.update({where:{id:r.projectId},data:{document:json(doc),revision:{increment:1}}});r.assembled=true;await save(r);}
 const media=await db.asset.findUniqueOrThrow({where:{id:mp4}}),sub=await db.asset.findUniqueOrThrow({where:{id:srt}});
 const data={state:'completed',stage:'Verified original 108-repeat Shiva chant export',snapshot:json({doc,options:{variantId:'landscape',draft:false}}),result:json({mp4Key:media.storageKey,srtKey:sub.storageKey,duration:888,width:1920,height:1080,bytes:media.bytes,variantId:'landscape',draft:false,assetId:mp4,localRender:true,humanPronunciationListeningReviewPending:true})};
 const job=await db.job.upsert({where:{dedupeKey:`shiva-108-${r.projectId}`},create:{projectId:r.projectId,kind:'render',dedupeKey:`shiva-108-${r.projectId}`,...data},update:data});Object.assign(r,{exportAssetId:mp4,thumbnailAssetId:thumb,exportJobId:job.id,published:false});await save(r);console.log(JSON.stringify(r));
}
main().catch(()=>{console.error('Studio registration stopped; inspect saved registration. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
