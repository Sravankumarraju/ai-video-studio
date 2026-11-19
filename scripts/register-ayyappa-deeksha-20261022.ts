import 'dotenv/config';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readFile,writeFile,access} from 'node:fs/promises';
import {db} from '../lib/db';
import {storage,storageKey} from '../lib/storage';
import {projectSchema,sceneSchema,variantSchema} from '../lib/schema';
import {json,validateStructure} from '../lib/projects';
const root='data/productions/divine-wisdom/ayyappa-deeksha-2026-10-22';
const load=async(n:string)=>JSON.parse(await readFile(`${root}/${n}.json`,'utf8'));
const save=(n:string,v:unknown)=>writeFile(`${root}/${n}.json`,JSON.stringify(v,null,2));
async function main(){
 const t=await load('timeline'),c=await load('captions'),audit=await load('caption-audit'),plan=await load('plan'),verify=await load('VERIFICATION'),yt=await load('youtube-package/youtube-metadata');
 assert(verify.fullDecodePassed&&verify.targetRangeMet&&verify.fiveIllustrations);assert.equal(audit.issues.length,0);
 let record:any;try{await access(`${root}/studio-registration.json`);record=await load('studio-registration');}catch(e:any){assert.equal(e.code,'ENOENT');record={assets:{}};}
 if(!record.projectId){
  const prior=JSON.parse(await readFile('data/productions/divine-wisdom/govinda-namalu-full-2026-10-20/studio-registration.json','utf8'));
  const series=await db.project.findUnique({where:{id:prior.projectId},select:{seriesId:true}});
  const p=await db.project.create({data:{title:plan.title,seriesId:series?.seriesId,document:json(projectSchema.parse({title:plan.title,language:'te',subtitleLanguage:'te',category:'Devotional'}))}});
  record.projectId=p.id;await save('studio-registration',record);
 }
 async function asset(file:string,kind:string,mime:string,duration?:number){
  if(record.assets[file])return record.assets[file] as string;
  const bytes=await readFile(`${root}/${file}`),key=storageKey(record.projectId,path.extname(file).slice(1));await storage.put(key,bytes,mime);
  const a=await db.asset.create({data:{projectId:record.projectId,name:path.basename(file),kind,mime,bytes:bytes.length,storageKey:key,duration,metadata:json({source:'Original Divine Wisdom Telugu Ayyappa Deeksha explainer. Included-account narration; five Built-in ImageGen illustrations; original saved channel logo.',parameters:{productionFolder:root,generatedMedia:true,published:false,manualListeningVerified:false},generatedAt:new Date().toISOString()})}});
  record.assets[file]=a.id;await save('studio-registration',record);return a.id;
 }
 const audio=await asset('narration-master.wav','audio','audio/wav',t.seconds),logo=await asset('channel-logo.png','image','image/png');
 const art:Record<string,string>={};for(const s of t.scenes)if(!art[s.image])art[s.image]=await asset(`art/${s.image}.png`,'image','image/png');
 const scenes=t.scenes.map((s:any)=>sceneSchema.parse({id:`ayyappa-deeksha-${s.id}`,title:s.title,narration:s.text,visual:`${s.classification}. Original illustration; ${s.image}.mp4 standalone export adds channel header, classification label, Telugu phrase captions and gentle motion.`,duration:s.seconds,assetId:art[s.image],audioId:audio,audioStart:s.start,audioSlice:true,motion:s.index%2===0?'zoom-in':'zoom-out',strength:.035,transition:'cut',overlap:0,voiceId:plan.voiceId,
  captions:c.pages.filter((p:any)=>p.section===s.index).map((p:any,index:number)=>({id:`caption-${s.id}-${index}`,start:Math.max(0,p.start-s.start),end:Math.min(s.seconds,p.end-s.start),text:p.text,display:'phrases',accuracy:'aligned',words:p.words.map((w:any)=>({text:w.text,start:Math.max(0,w.start-s.start),end:Math.min(s.seconds,w.end-s.start)})).filter((w:any)=>w.end>w.start)})),status:'Narration, illustrations and aligned Telugu captions ready; listening review pending'}));
 const variant=variantSchema.parse({id:'ayyappa-deeksha-1080p',name:'అయ్యప్ప దీక్ష • పూర్తి 1080p',aspect:'landscape',sceneIds:scenes.map((s:any)=>s.id),fps:24,crf:19,bitrate:'8M',captions:true,font:'Noto Sans Telugu',fontSize:62,color:'#ffffff',background:true,position:'bottom',logoId:logo,maxDuration:540,targetDuration:520,titleOverlay:''});
 const doc=projectSchema.parse({title:plan.title,topic:'Why observe Ayyappa Deeksha for 41 days? Separate established Sabarimala practice, local variation and spiritual interpretation. No unsupported scientific or medical claims.',category:'Devotional',language:'te',subtitleLanguage:'te',mode:'manual',targetDuration:t.seconds,sourceClassification:'interpretation',sources:plan.sources.map((s:any)=>`${s.title}: ${s.url}\n${s.scope}`).join('\n\n'),script:await readFile(`${root}/final-script-telugu.txt`,'utf8'),scenes,variants:[variant],logoId:logo,style:'Five original gold and indigo devotional illustrations, restrained motion, original channel logo, Telugu phrase captions',audience:'Telugu speaking general audience interested in Ayyappa devotion and customs',pronunciation:'Saved native Telugu narration voice. Source text matches provider character alignment exactly, no compressed words. Audio speed unchanged. Human listening review pending.',styleGuide:'Standalone final MP4 includes chapter headings, practice/variation/interpretation badges, spoken channel welcome and final subscribe/like/share/comment appeal. The editable studio timeline contains the matching media and aligned captions.',publishing:{titles:[yt.title,...yt.alternativeTitles],description:yt.description,hashtags:yt.hashtags.join(' '),chapters:yt.chapters.map((x:any)=>`${x.timestamp} ${x.title}`).join('\n'),thumbnailPrompt:'Ayyappa deity at right; deep indigo left; Telugu ayyappa deeksha / 41 days / why; original channel logo. See generated thumbnail and art-prompts.json.'}});
 validateStructure(doc);const fingerprint=createHash('sha256').update(JSON.stringify(doc)).digest('hex');
 if(record.documentFingerprint!==fingerprint){
  const prior=await db.project.findUniqueOrThrow({where:{id:record.projectId}});if(record.assembled)await db.projectVersion.create({data:{projectId:record.projectId,revision:prior.revision,document:prior.document as any}});
  await db.project.update({where:{id:record.projectId},data:{document:json(doc),revision:{increment:1}}});record.documentFingerprint=fingerprint;record.assembled=true;record.sceneCount=scenes.length;record.published=false;await save('studio-registration',record);
 }
 await save('editable-studio-project',{projectId:record.projectId,document:doc,assets:record.assets});
 const video=await asset('Ayyappa-Deeksha-41-Days-Telugu-1080p.mp4','video','video/mp4',t.seconds),srt=await asset('telugu-captions.srt','text','application/x-subrip'),vtt=await asset('telugu-captions.vtt','text','text/vtt');
 for(const [file,kind,mime] of [['youtube-package/thumbnail-youtube.jpg','image','image/jpeg'],['youtube-package/youtube-details.txt','text','text/plain'],['youtube-package/youtube-metadata.json','text','application/json'],['Ayyappa-Deeksha-YouTube-Package.zip','file','application/zip']])await asset(file,kind,mime);
 const media=await db.asset.findMany({where:{id:{in:[video,srt,vtt]}}}),item=(id:string)=>media.find(a=>a.id===id)!;
 const data={state:'completed',stage:'Verified 8m40s Ayyappa Deeksha explainer',snapshot:json({doc,options:{variantId:variant.id,draft:false}}),result:json({mp4Key:item(video).storageKey,srtKey:item(srt).storageKey,vttKey:item(vtt).storageKey,duration:t.seconds,width:1920,height:1080,bytes:item(video).bytes,variantId:variant.id,draft:false,assetId:video,localRender:true,pronunciationListeningReviewPending:true})};
 const job=await db.job.upsert({where:{dedupeKey:`ayyappa-deeksha-${record.projectId}`},create:{projectId:record.projectId,kind:'render',dedupeKey:`ayyappa-deeksha-${record.projectId}`,...data},update:data});
 record.exportAssetId=video;record.thumbnailAssetId=record.assets['youtube-package/thumbnail-youtube.jpg'];record.exportJobId=job.id;record.youtubePackageFolder='youtube-package';await save('studio-registration',record);
 console.log(JSON.stringify({projectId:record.projectId,scenes:scenes.length,assets:Object.keys(record.assets).length,seconds:t.seconds,exportJobId:job.id,published:false}));
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:e.name==='ZodError'?e.issues:JSON.stringify({error:'Studio registration stopped; credentials suppressed.',type:e.name,code:e.code,clientVersion:e.clientVersion,errorCode:e.errorCode}));process.exitCode=1;}).finally(()=>db.$disconnect());
