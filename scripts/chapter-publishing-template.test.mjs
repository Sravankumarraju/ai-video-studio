import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
test('Chapter 3 publishing does not inherit Chapter 2 title, tags or summary',async()=>{
 const source=await readFile('scripts/prepare-chapter-publishing.mjs','utf8');
 const start=source.indexOf('const apology='),end=source.indexOf("execFileSync('ffmpeg'");assert(start>=0&&end>start);
 const config={chapterTitle:'కర్మ యోగం',videoTitle:'భగవద్గీత అధ్యాయం 3 కర్మ యోగం',sources:['https://sanskritdocuments.org/doc_giitaa/bhagvadnew.html'],originalMusic:true};
 const result=runInNewContext(source.slice(start,end)+'\n({metadata,description})',{config,compactChapters:'00:00 Welcome\n01:00 Duty\n02:00 Reflection',Buffer,assert,chapterNumber:3,verseCount:43});
 assert(result.description.includes('అధ్యాయం 3, శ్లోకాలు 1 నుంచి 43'));
 assert(result.description.includes('#KarmaYoga'));assert(result.description.includes('లోక సంగ్రహం'));
 assert(!result.description.includes('#SankhyaYoga'));assert(result.metadata.tags.includes('Karma Yoga'));assert(!result.metadata.tags.includes('Sankhya Yoga'));
});

test('Chapter 4 publishing uses its own yoga, 42 meanings and learning summary',async()=>{
 const source=await readFile('scripts/prepare-chapter-publishing.mjs','utf8');
 const start=source.indexOf('const apology='),end=source.indexOf("execFileSync('ffmpeg'");
 const config={chapterTitle:'జ్ఞాన కర్మ సన్యాస యోగం',videoTitle:'భగవద్గీత అధ్యాయం 4',sources:['https://sanskritdocuments.org/doc_giitaa/bhagvadnew.html'],originalMusic:true};
 const result=runInNewContext(source.slice(start,end)+'\n({metadata,description})',{config,compactChapters:'00:00 Welcome\n01:00 Knowledge\n02:00 Reflection',Buffer,assert,chapterNumber:4,verseCount:42});
 assert(result.description.includes('అధ్యాయం 4, శ్లోకాలు 1 నుంచి 42'));
 assert(result.description.includes('#JnanaKarmaSannyasaYoga'));
 assert(result.description.includes('గురువును ప్రశ్నించడం'));
 assert(result.metadata.tags.includes('Jnana Karma Sannyasa Yoga'));
 assert(!result.metadata.tags.includes('Karma Yoga'));
 assert(!result.description.includes('స్వధర్మం, కామ క్రోధ నియమం'));
});

test('Chapter 4 resumable wrapper prepares saved batches before narration',async()=>{
 const source=await readFile('scripts/finish-gita-chapter-four.ps1','utf8');
 assert(source.includes("@('prepare','voice','finish')"));
 assert(source.includes('authorizedNarrationCalls -ne 25'));
});
