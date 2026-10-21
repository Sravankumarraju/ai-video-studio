import 'dotenv/config';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {readFile,writeFile,access} from 'node:fs/promises';
import {db} from '../lib/db';
import {storage,storageKey} from '../lib/storage';
import {projectSchema,sceneSchema,variantSchema} from '../lib/schema';
import {validateStructure,json} from '../lib/projects';
import {portableDocument,safeProvenance} from '../lib/backup';
const maleFull=false;
const root='data/productions/divine-wisdom/govinda-namalu-full-2026-10-20';
const read=async(name:string)=>JSON.parse(await readFile(`${root}/${name}.json`,'utf8'));
const save=(name:string,value:unknown)=>writeFile(`${root}/${name}.json`,JSON.stringify(value,null,2));
async function main(){
 const timeline=await read('timeline'),captions=await read('captions'),audit=await read('caption-audit');assert(!audit.issues.length);
 const title='శ్రీ గోవింద నామాలు | పూర్తి 108 నామాలు • Female Voice';
 let record:any;
 try{await access(`${root}/studio-registration.json`);record=await read('studio-registration');}catch{record={assets:{}};}
 if(!record.projectId){
   const prior=await db.project.findUnique({where:{id:'1ab8bb36-9e54-4f24-ba2f-adaada237924'},select:{seriesId:true}});
   const project=await db.project.create({data:{title,seriesId:prior?.seriesId,document:json(projectSchema.parse({title,language:'te',subtitleLanguage:'te'}))}});
   record.projectId=project.id;await save('studio-registration',record);
 }
 async function asset(file:string,kind:string,mime:string,duration?:number){
   if(record.assets[file])return record.assets[file];
   const bytes=await readFile(`${root}/${file}`);const key=storageKey(record.projectId,path.extname(file).slice(1));await storage.put(key,bytes,mime);
   const a=await db.asset.create({data:{projectId:record.projectId,name:path.basename(file),kind,mime,bytes:bytes.length,storageKey:key,duration,
     metadata:json({source:'Divine Wisdom Telugu Govinda Namalu production: existing original channel illustrations reused, ElevenLabs single female chant and approved instrumental backing; not published',model:kind==='image'?'Built-in ImageGen':kind==='audio'?'ElevenLabs music_v2_5 and eleven_v4':undefined,generatedAt:new Date().toISOString(),parameters:{productionFolder:root,noTempoProcessing:true}})}});
   record.assets[file]=a.id;await save('studio-registration',record);return a.id;
 }
 const audio=await asset('finished-audio-master.mp3','audio','audio/mpeg',timeline.seconds);
 const logo=await asset('channel-logo.png','image','image/png');
 const images:Record<string,string>={};for(const s of timeline.scenes)if(!images[s.image])images[s.image]=await asset(`art/${s.image}.png`,'image','image/png');
 const scenes=timeline.scenes.map((s:any)=>sceneSchema.parse({id:`screen-${String(s.index).padStart(2,'0')}`,title:s.kind==='prayer'?`గోవింద నామావళి • భాగం ${s.index}`:s.kind==='welcome'?'ఛానల్ స్వాగతం':'ముగింపు • సబ్‌స్క్రైబ్ లైక్ షేర్ కామెంట్',
   narration:captions.words.filter((w:any)=>w.start>=s.start&&w.start<s.end).map((w:any)=>w.text).join(' '),
   visual:`${s.image}; original devotional illustration. Standalone MP4 uses gentle 0.3-second fades through dark between screens.`,
   imagePrompt:`See art-prompts.json for original generation records: ${s.image}`,
   duration:s.seconds,assetId:images[s.image],audioId:audio,audioStart:s.start,audioSlice:true,
   motion:s.index%2===0?'zoom-in':'zoom-out',strength:.025,transition:'cut',overlap:0,
   captions:captions.pages.filter((p:any)=>p.start<s.end&&p.end>s.start).map((p:any)=>({id:randomUUID(),start:Math.max(0,p.start-s.start),end:Math.min(s.seconds,p.end-s.start),text:p.lines.map((line:any[])=>line.map(w=>w.text).join(' ')).join('\n'),accuracy:'aligned',display:p.display,
     words:p.words.map((w:any)=>({text:w.text,start:Math.max(0,w.start-s.start),end:Math.min(s.seconds,w.end-s.start)})).filter((w:any)=>w.end>w.start)})),
   status:'Original media and aligned captions ready; listening review pending'}));
 const variant=variantSchema.parse({id:'full-1080p',name:'పూర్తి గోవింద నామాలు • 1080p',aspect:'landscape',sceneIds:scenes.map((s:any)=>s.id),fps:24,crf:19,bitrate:'8M',captions:true,font:'Noto Sans Telugu',fontSize:maleFull?82:100,color:'#ffffff',background:true,position:'bottom',...(maleFull?{captionBottom:.07}:{}),wordHighlight:true,highlightColor:'#ffd54a',logoId:logo,maxDuration:7200,titleOverlay:'శ్రీ గోవింద నామాలు'});
 const doc=projectSchema.parse({title,category:'Devotional',language:'te',subtitleLanguage:'te',mode:'manual',targetDuration:timeline.seconds,
   topic:'Complete 108 Govinda Namalu in Telugu with opening and closing refrains; single female melodic chant, short breaths, quiet devotional music and channel bookends',
   sources:'https://stotranidhi.com/sri-govinda-namalu/',sourceClassification:'traditional',
   script:await readFile(`${root}/complete-lyrics-telugu.txt`,'utf8'),scenes,variants:[variant],logoId:logo,
   style:'Original devotional illustrations; mural, bronze shrine and watercolor variants; warm gold and deep indigo',
   pronunciation:'Independent transcription, retained music timestamps and forced alignment of repaired stanzas completed. Human listening review of Telugu/Sanskrit name pronunciation and musical continuity remains pending.',
   styleGuide:maleFull?'Complete two/four-line numbered shlokam held throughout each verse. 72–82 px Noto Sans Telugu, active sung word gold, punctuation and verse number white. One continuous pitch-refined male audio master, no tempo processing; short natural joins. No publishing authorization.':'104 px Telugu ASS in standalone export; Studio cap is 100 px. One continuous finished audio master, captions below sacred features. No publishing authorization.'});
 validateStructure(doc);
 const existing=await db.project.findUniqueOrThrow({where:{id:record.projectId}});
 if(record.assembled)await db.projectVersion.create({data:{projectId:record.projectId,revision:existing.revision,document:existing.document as any}});
 await db.project.update({where:{id:record.projectId},data:{document:json(doc),revision:{increment:1}}});
 record.assembled=true;record.sceneCount=scenes.length;record.publishApproved=false;await save('studio-registration',record);
 await save('editable-studio-project',{projectId:record.projectId,document:doc,assets:record.assets});
 if(process.argv.includes('--portable')){
   const selected=new Set([audio,logo,...Object.values(images)]);const assets=[];
   for(const id of selected){const a=await db.asset.findUniqueOrThrow({where:{id}});assets.push({id:a.id,name:a.name,metadata:safeProvenance(a.metadata),base64:(await storage.get(a.storageKey)).toString('base64')});}
   await save('portable-story-studio-project',{schemaVersion:1,document:portableDocument(doc),assets});
 }
 if(process.argv.includes('--register-export')){
   const video=await asset('Sri-Govinda-Namalu-Telugu-1080p.mp4','video','video/mp4',timeline.seconds);
   const thumb=await asset('thumbnail.jpg','image','image/jpeg');record.exportAssetId=video;record.thumbnailAssetId=thumb;await save('studio-registration',record);
   if(true){
     const srt=await asset('telugu-captions.srt','text','application/x-subrip');const vtt=await asset('telugu-captions.vtt','text','text/vtt');
     const media=await db.asset.findMany({where:{id:{in:[video,srt,vtt]}}});const item=(id:string)=>media.find(a=>a.id===id)!;
     const data={state:'completed',stage:'Verified local Govinda Namalu export',snapshot:json({doc,options:{variantId:variant.id,draft:false}}),result:json({mp4Key:item(video).storageKey,srtKey:item(srt).storageKey,vttKey:item(vtt).storageKey,duration:timeline.seconds,width:1920,height:1080,bytes:item(video).bytes,variantId:variant.id,draft:false,assetId:video,localRender:true,pronunciationListeningReviewPending:true})};
     const job=await db.job.upsert({where:{dedupeKey:`govinda-namalu-female-full-${record.projectId}`},create:{projectId:record.projectId,kind:'render',dedupeKey:`govinda-namalu-female-full-${record.projectId}`,...data},update:data});
     record.exportJobId=job.id;await save('studio-registration',record);
   }
 }
 console.log(JSON.stringify({projectId:record.projectId,scenes:scenes.length,assets:Object.keys(record.assets).length}));
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:'Studio registration stopped; inspect local saved record. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
