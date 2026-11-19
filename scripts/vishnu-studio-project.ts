import 'dotenv/config';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {readFile,writeFile,access} from 'node:fs/promises';
import {db} from '../lib/db';
import {storage,storageKey} from '../lib/storage';
import {projectSchema,sceneSchema,variantSchema} from '../lib/schema';
import {validateStructure,json} from '../lib/projects';
const root='data/productions/divine-wisdom/vishnu-sahasranamam-2026-10-22';
const load=async(n:string)=>JSON.parse(await readFile(`${root}/${n}.json`,'utf8'));
const save=(n:string,v:unknown)=>writeFile(`${root}/${n}.json`,JSON.stringify(v,null,2));
async function main(){
 const t=await load('timeline'),c=await load('captions'),audit=await load('caption-audit'),plan=await load('plan');assert.equal(audit.issues.length,0);
 const title='శ్రీ విష్ణు సహస్రనామం పూర్తి | తెలుగు సాహిత్యంతో';
 let record:any;try{await access(`${root}/studio-registration.json`);record=await load('studio-registration');}catch{record={assets:{}};}
 if(!record.projectId){
  const prior=JSON.parse(await readFile('data/productions/divine-wisdom/govinda-namalu-full-2026-10-20/studio-registration.json','utf8'));
  const series=await db.project.findUnique({where:{id:prior.projectId},select:{seriesId:true}});
  const project=await db.project.create({data:{title,seriesId:series?.seriesId,document:json(projectSchema.parse({title,language:'te',subtitleLanguage:'te'}))}});
  record.projectId=project.id;await save('studio-registration',record);
 }
 async function asset(file:string,kind:string,mime:string,duration?:number){
  if(record.assets[file]){
   if(process.argv.includes('--refresh-export')&&file.endsWith('.mp4')){
    const saved=await db.asset.findUniqueOrThrow({where:{id:record.assets[file]}});const bytes=await readFile(`${root}/${file}`);await storage.put(saved.storageKey,bytes,mime);await db.asset.update({where:{id:saved.id},data:{bytes:bytes.length,duration}});
   }
   return record.assets[file];
  }
  const bytes=await readFile(`${root}/${file}`);const key=storageKey(record.projectId,path.extname(file).slice(1));await storage.put(key,bytes,mime);
  const a=await db.asset.create({data:{projectId:record.projectId,name:path.basename(file),kind,mime,bytes:bytes.length,storageKey:key,duration,metadata:json({source:'Original Divine Wisdom Telugu Vishnu Sahasranamam production. Seven original illustrations, saved female melodic chant, existing channel branding. Traditional text edition recorded in plan.json.',model:kind==='image'?'Built-in ImageGen':kind==='audio'?'ElevenLabs music_v2_5 and eleven_v4':undefined,parameters:{productionFolder:root,humanPronunciationListeningReviewPending:true,noTempoOrPitchProcessing:true},generatedAt:new Date().toISOString()})}});
  record.assets[file]=a.id;await save('studio-registration',record);return a.id;
 }
 const audio=await asset('finished-audio-master.mp3','audio','audio/mpeg',t.seconds),logo=await asset('channel-logo.png','image','image/png');
 const images:Record<string,string>={};for(const s of t.scenes)if(!images[s.image])images[s.image]=await asset(`art/${s.image}.png`,'image','image/png');
 const scenes=t.scenes.map((s:any)=>sceneSchema.parse({id:`vishnu-screen-${String(s.index).padStart(2,'0')}`,title:s.kind==='welcome'?'డివైన్ విజ్డమ్ తెలుగు • స్వాగతం':s.kind==='closing'?'ముగింపు • సబ్‌స్క్రైబ్ లైక్ షేర్ కామెంట్':`శ్రీ విష్ణు సహస్రనామం • భాగం ${s.index}`,
  narration:c.words.filter((w:any)=>w.start>=s.start&&w.start<s.end).map((w:any)=>w.text).join(' '),visual:`Original devotional illustration ${s.image}. Full export uses quiet zoom and short fades through dark at whole-verse boundaries.`,imagePrompt:`See art-prompts.json: art/${s.image}.png`,
  duration:s.seconds,assetId:images[s.image],audioId:audio,audioStart:s.start,audioSlice:true,motion:s.index%2===0?'zoom-in':'zoom-out',strength:.018,transition:'cut',overlap:0,
  captions:c.pages.filter((p:any)=>p.start<s.end&&p.end>s.start).map((p:any,index:number)=>({id:`caption-${s.index}-${index}`,start:Math.max(0,p.start-s.start),end:Math.min(s.seconds,p.end-s.start),text:p.ranges.map(([a,b]:number[])=>p.display.slice(a,b).trim()).join('\n'),display:p.completeShlokaAlwaysVisible?'full-verse':'phrases',accuracy:'aligned',
   words:p.words.map((w:any)=>({text:w.text,start:Math.max(0,w.start-s.start),end:Math.min(s.seconds,w.end-s.start)})).filter((w:any)=>w.end>w.start)})),status:'Original media and full-verse captions ready; human listening review pending'}));
 const variant=variantSchema.parse({id:'full-1080p',name:'పూర్తి విష్ణు సహస్రనామం • 1080p',aspect:'landscape',sceneIds:scenes.map((s:any)=>s.id),fps:24,crf:19,bitrate:'8M',captions:true,font:'Noto Sans Telugu',fontSize:88,color:'#ffffff',background:true,position:'bottom',wordHighlight:true,highlightColor:'#ffd54a',logoId:logo,maxDuration:7200,targetDuration:Math.round(t.seconds),titleOverlay:'శ్రీ విష్ణు సహస్రనామ స్తోత్రం'});
 const doc=projectSchema.parse({title,category:'Devotional',language:'te',subtitleLanguage:'te',mode:'manual',targetDuration:t.seconds,topic:'Complete traditional Vishnu Sahasranamam including Purvapeethika, nyasa, dhyana, all 108 numbered stotram verses and Phalashruti, with female melodic chanting and channel bookends',sources:plan.source,sourceClassification:'traditional',script:await readFile(`${root}/complete-lyrics-telugu.txt`,'utf8'),scenes,variants:[variant],logoId:logo,
  style:'Seven original Vishnu devotional illustrations in warm antique gold and deep indigo; existing Govinda Namalu full-verse format and channel logo',pronunciation:'Saved music timestamp text matches every source word in order. Independent transcription and forced-alignment attempts timed out with unknown provider outcomes. Original timings retained; compressed spans share the adjacent word highlight. Human pronunciation and synchronization listening review remains pending.',styleGuide:'Full Telugu shloka held on screen; current word gold. Caption size 58–88 px in standalone MP4 with original verse numbers and punctuation. Seven illustrations, gentle motion, continuous audio master without tempo or pitch change. Channel opening and subscribe, like, share, comment ending.'});
 validateStructure(doc);
 const fingerprint=createHash('sha256').update(JSON.stringify(doc)).digest('hex');
 if(record.documentFingerprint!==fingerprint){
  const existing=await db.project.findUniqueOrThrow({where:{id:record.projectId}});
  if(record.assembled)await db.projectVersion.create({data:{projectId:record.projectId,revision:existing.revision,document:existing.document as any}});
  await db.project.update({where:{id:record.projectId},data:{document:json(doc),revision:{increment:1}}});record.assembled=true;record.documentFingerprint=fingerprint;record.sceneCount=scenes.length;record.publishApproved=false;await save('studio-registration',record);
 }
 await save('editable-studio-project',{projectId:record.projectId,document:doc,assets:record.assets});
 if(process.argv.includes('--register-export')){
  const verify=await load('VERIFICATION');assert(verify.fullDecodePassed&&verify.allMainVersesInOrder);
  const video=await asset('Sri-Vishnu-Sahasranamam-Complete-Telugu-1080p.mp4','video','video/mp4',t.seconds),thumb=await asset('thumbnail.jpg','image','image/jpeg'),srt=await asset('telugu-captions.srt','text','application/x-subrip'),vtt=await asset('telugu-captions.vtt','text','text/vtt');
  const media=await db.asset.findMany({where:{id:{in:[video,srt,vtt]}}});const item=(id:string)=>media.find(a=>a.id===id)!;
  const data={state:'completed',stage:'Technically verified complete Vishnu Sahasranamam local export',snapshot:json({doc,options:{variantId:variant.id,draft:false}}),result:json({mp4Key:item(video).storageKey,srtKey:item(srt).storageKey,vttKey:item(vtt).storageKey,duration:t.seconds,width:1920,height:1080,bytes:item(video).bytes,variantId:variant.id,draft:false,assetId:video,localRender:true,pronunciationListeningReviewPending:true})};
  const job=await db.job.upsert({where:{dedupeKey:`vishnu-sahasranamam-full-${record.projectId}`},create:{projectId:record.projectId,kind:'render',dedupeKey:`vishnu-sahasranamam-full-${record.projectId}`,...data},update:data});
  record.exportAssetId=video;record.thumbnailAssetId=thumb;record.exportJobId=job.id;await save('studio-registration',record);
 }
 console.log(JSON.stringify({projectId:record.projectId,scenes:scenes.length,assets:Object.keys(record.assets).length,exportJobId:record.exportJobId}));
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:'Vishnu Studio registration stopped; inspect saved record. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
