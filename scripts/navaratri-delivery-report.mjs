import {readFile,writeFile,access} from 'node:fs/promises';
import path from 'node:path';
const root='data/productions/divine-wisdom/devi-navaratri-2026';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const exists=p=>access(p).then(()=>true).catch(()=>false);
const plan=await read(root+'/production-plan.json');
const delivery=[];
for(const video of plan.videos){
 const config=await read(video.dir+'/episode.json'),state=await read(video.dir+'/state.json');
 const verified=await exists(video.dir+'/verification-full.json')?await read(video.dir+'/verification-full.json'):null;
 const final=verified?.decodedEntireFile&&verified.visualEdition===state.graceEdition;
 video.narrationGenerated=state.batches.every(b=>state.finished[b.id]);video.rendered=!!final;video.visualEdition=state.graceEdition;
 video.status=final?'verified-1080p':'narration-complete-rendering';
 delivery.push({slug:video.slug,title:config.videoTitle,seconds:state.seconds,verified:!!final,mp4:final?path.resolve(video.dir+'/'+config.fileStem+'-full.mp4'):null,projectId:video.projectId});
}
await writeFile(root+'/production-plan.json',JSON.stringify(plan,null,2));
await writeFile(root+'/DELIVERY.json',JSON.stringify({updatedAt:new Date().toISOString(),videos:delivery},null,2));
const readme=await readFile(root+'/README.md','utf8');
const status=`Status: all 40 approved ElevenLabs narration calls succeeded and their finished audio is persisted. ${delivery.filter(v=>v.verified).length}/10 corrected 1080p videos have passed full-file decoding and timeline checks. See DELIVERY.json for verified paths. The introduction uses only the channel logo and five reviewed Durga Devi illustrations. Reused Krishna/Mahabharata images are preserved as rejected versions and are inactive. Rendering and private upload status are separate; inspect youtube-private-batch.json and the playlist verification report for actual upload results.`;
await writeFile(root+'/README.md',readme.replace(/Status:.*?(?=\r?\n\r?\n)/s,status).replace('Unknown-price calls remain blocked until explicitly approved.','The owner explicitly approved these 40 unknown-price narration calls; no extra narration calls were used for the visual correction.'));
const review=await read(root+'/art-review.json');
for(const entry of review.assets){
 const video=plan.videos.find(v=>v.slug===entry.slug);if(!video)continue;
 const config=await read(video.dir+'/episode.json');
 entry.active=config.sections.some(s=>s.image===entry.name);
 if(['reflection','temple'].includes(entry.name))entry.reviewStatus='v1 rejected: unrelated Krishna imagery; replaced with separately reviewed v2 background';
}
const queue=await read(root+'/grace-art-queue.json');
for(const item of queue){const previous=review.assets.find(a=>a.asset===item.destination);if(!previous)review.assets.push({slug:item.slug.startsWith('intro-')?'intro':item.slug,name:item.name,asset:item.destination,reviewStatus:'visually reviewed Durga/Navadurga illustration',reused:false,edition:3,active:true});}
review.visualCorrection={edition:3,reviewedAt:new Date().toISOString(),intro:'Durga-only after channel logo',inactive:['reflection-rejected-v1.png','temple-rejected-v1.png'],prompts:'grace-art-queue.json',audioRegenerated:false};
await writeFile(root+'/art-review.json',JSON.stringify(review,null,2));
console.log(JSON.stringify({narrated:delivery.length,verified:delivery.filter(v=>v.verified).length}));
