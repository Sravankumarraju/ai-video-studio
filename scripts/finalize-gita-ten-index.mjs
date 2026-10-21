import {readFile,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root='data/productions/divine-wisdom',counts=[47,72,43,42,29,47,30,28,34,42];
const names=['అర్జున విషాద యోగం','సాంఖ్య యోగం','కర్మ యోగం','జ్ఞాన కర్మ సన్యాస యోగం','కర్మ సన్యాస యోగం','ఆత్మ సంయమ యోగం','జ్ఞాన విజ్ఞాన యోగం','అక్షర బ్రహ్మ యోగం','రాజ విద్యా రాజ గుహ్య యోగం','విభూతి యోగం'];
const chapters=[];
const readJson=async file=>JSON.parse((await readFile(file,'utf8')).replace(/^\uFEFF/,''));
for(let number=1;number<=10;number++){
 const dir=`${root}/gita-chapter-${number}/${number===1?'audio-corrected-v5':'story-v1'}`;
 const verified=await readJson(`${dir}/verification-full.json`);
 assert(verified.decodedEntireFile||verified.completeDecodePassed);assert.equal(verified.width,1920);assert.equal(verified.height,1080);
 const file=`${dir}/gita-chapter-${number}-full.mp4`;const info=await stat(file);assert(info.size>1000000);
 if(number>=7){const final=await readJson(`${dir}/FINAL_DELIVERY.json`);assert.equal(final.status,'final');assert.equal(final.verseCount,counts[number-1]);assert(final.browserStartMiddleEndVerified);}
 const seconds=verified.seconds,duration=`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
 chapters.push({chapter:number,title:names[number-1],verseCount:counts[number-1],duration,seconds,video:path.resolve(file),bytes:info.size,verification:path.resolve(`${dir}/verification-full.json`),finalDelivery:path.resolve(`${dir}/FINAL_DELIVERY.md`),...(number>=7?{package:path.resolve(`${dir}/publishing-package.zip`)}:{})});
}
const manifest={status:'Chapters 1–10 complete',language:'Telugu',width:1920,height:1080,totalVerseMeanings:counts.reduce((a,b)=>a+b,0),newChapters:[7,8,9,10],approvedNarrationBatches:72,narrationRecordings:72,extraApprovedAlignmentRequests:1,newChaptersPublishedToYouTube:false,chapters,completedAt:new Date().toISOString()};
await writeFile(`${root}/CHAPTERS-1-10-DELIVERY.json`,JSON.stringify(manifest,null,2));
const link=p=>p.replaceAll('\\','/');
await writeFile(`${root}/CHAPTERS-1-10-DELIVERY.md`,`# Bhagavad Gita Telugu · Chapters 1–10\n\nAll ten local 1080p chapter videos are complete. Chapters 7–10 are newly produced; Chapters 1–6 retain their saved final editions. Together they cover ${manifest.totalVerseMeanings} verse meanings in chapter order.\n\n| Chapter | Title | Verses | Duration | Final video |\n|---|---|---:|---:|---|\n${chapters.map(c=>`| ${c.chapter} | ${c.title} | ${c.verseCount} | ${c.duration} | [MP4](<${link(c.video)}>)${c.package?` / [Package](<${link(c.package)}>)`:""} |`).join('\n')}\n\nThe four new chapters include Telugu narration, large aligned word-highlight captions, original devotional artwork with gentle pans, branded opening, voice-ducked original music, midpoint and closing reminders, and the next full chapter preview. Complete-file decoding and browser playback checks passed. Separate scripts, subtitles, thumbnails, descriptions and verification records accompany each new chapter in its publishing package.\n\nThe 72 approved source batches produced 72 narration recordings. One interrupted recording was recovered from provider history without regeneration; one separately approved alignment request repaired its caption timing. The new chapters have not been uploaded to YouTube.\n`);
console.log(JSON.stringify({status:manifest.status,totalVerseMeanings:manifest.totalVerseMeanings,index:path.resolve(`${root}/CHAPTERS-1-10-DELIVERY.md`)}));
