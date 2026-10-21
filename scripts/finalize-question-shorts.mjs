import {readFile,writeFile,copyFile,stat} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const root='data/productions/divine-wisdom/question-shorts-week-01';
const plan=JSON.parse(await readFile(`${root}/NARRATION-PLAN.json`,'utf8'));
const selected=process.argv.slice(2).map(Number);const numbers=selected.length?selected:[1,2,3,4,5];
const deliveries=[];
for(const n of numbers){
 const short=plan.shorts[n-1],dir=short.directory;
 const state=JSON.parse(await readFile(`${dir}/state.json`,'utf8'));
 const verified=JSON.parse(await readFile(`${dir}/verification-full.json`,'utf8'));
 const browser=JSON.parse(await readFile(`${dir}/browser-full-verification.json`,'utf8'));
 const review=JSON.parse(await readFile(`${dir}/review-frames.json`,'utf8'));
 assert(verified.decodedEntireFile&&verified.target45to60&&review.reviewed);
 assert.equal(browser.renderJobId,state.renderJobs.full);assert(browser.samples.length===3&&browser.samples.every(s=>!s.error&&!s.paused&&s.currentTime>s.requested));
 assert((await stat(`${dir}/${short.id}-full.mp4`)).size>1000000);
 const delivery={id:short.id,title:short.title,reference:short.reference,projectId:short.projectId,renderJobId:state.renderJobs.full,seconds:verified.seconds,voiceCalls:1,characters:short.characters,mp4:resolve(`${dir}/${short.id}-full.mp4`),fullFileDecoded:true,portrait1080p:true,browserStartMiddleEnd:true,framesReviewed:true,youtubeUploaded:false,uploadHold:true,completedAt:new Date().toISOString()};
 await copyFile(`${dir}/hero.png`,`${dir}/thumbnail.png`);
 await writeFile(`${dir}/FINAL_DELIVERY.json`,JSON.stringify(delivery,null,2));
 await writeFile(`${dir}/README.md`,`${short.title}\n\nReference: ${short.reference}\n${verified.seconds.toFixed(1)} seconds, 1080×1920, original Telugu explanation and example, saved voice, readable highlighted captions.\nMP4: ${delivery.mp4}\nAll-file decoding, visual review and actual browser playback verified.\nNo YouTube upload; uploads remain held.\n`);
 execFileSync('python',['scripts/package-question-short.py',dir],{stdio:'pipe'});
 deliveries.push(delivery);
}
if(numbers.length===5){await writeFile(`${root}/FINAL_DELIVERY.json`,JSON.stringify({status:'verified_local',calls:5,characters:2980,uploadHold:true,deliveries},null,2));await writeFile(`${root}/FINAL_DELIVERY.md`,['# Five verified Telugu question Shorts','','All five original Shorts are 1080p portrait, 45–60 seconds, fully decoded, visually reviewed and played at start/middle/end in Story Studio. Five approved voice calls / 2,980 characters completed. All uploads remain on hold.','',...deliveries.map(d=>`- [${d.title} — ${Math.round(d.seconds)} seconds](<${d.mp4.replaceAll('\\','/')}> )`)].join('\n'));}
console.log(JSON.stringify({verifiedLocalShorts:deliveries.length,uploads:0}));
