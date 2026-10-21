import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {chapterFiveMeanings,chapterFiveActs} from './gita-chapter-five-content.mjs';
import {productionPolicy,assertAuthorizedNarrationBatchCount} from './divine-production-policy.mjs';
const directory='data/productions/divine-wisdom/gita-chapter-5/story-v1';
test('Chapter 5 retains all 29 meanings separately and rejects incomplete or unordered coverage',()=>{
 const config={productionKind:'chapter-meaning',chapterNumber:5,sections:chapterFiveMeanings};
 assert.equal(productionPolicy(config).verseCount,29);
 assert.deepEqual(chapterFiveMeanings.map(v=>v.verseNumber),Array.from({length:29},(_,i)=>i+1));
 for(const sections of [config.sections.slice(1),config.sections.toReversed(),[...config.sections,config.sections[28]]])assert.throws(()=>productionPolicy({...config,sections}));
 for(const n of [8,9,27,28])assert(chapterFiveMeanings.find(v=>v.verseNumber===n)?.meaning.length>100);
});
test('Prepared Chapter 5 stays in full-chapter series with Chapter 6 next and midpoint/end engagement',async()=>{
 const config=JSON.parse(await readFile(`${directory}/episode.json`,'utf8'));
 assert.equal(productionPolicy(config).verseCount,29);
 assert(!config.sections.some(s=>s.id==='shloka'));
 assert(config.sections.filter(s=>s.id.startsWith('next')).map(s=>s.text).join(' ').includes('ఆరవ అధ్యాయం'));
 const midpoint=chapterFiveActs.find(a=>a.before===16).text;
 const closing=config.sections.filter(s=>s.id.startsWith('closing')).map(s=>s.text).join(' ');
 for(const word of ['లైక్','షేర్','కామెంట్','సబ్‌స్క్రైబ్'])for(const text of [midpoint,closing])assert(text.includes(word));
});
test('Chapter 5 paid narration remains guarded and resume prepares batches first',async()=>{
 const wrapper=await readFile('scripts/finish-gita-chapter-five.ps1','utf8');
 assert(wrapper.includes("@('prepare','voice','finish')"));
 assert(wrapper.includes('authorizedNarrationCalls -ne 19'));
 assert.throws(()=>assertAuthorizedNarrationBatchCount({authorizedNarrationCalls:0},{batches:[{}]}));
 assert.throws(()=>assertAuthorizedNarrationBatchCount({authorizedNarrationCalls:19},{batches:Array(20).fill({})}));
});
test('Chapter 5 publishing uses its own 29 meanings, yoga title, tags and summary',async()=>{
 const source=await readFile('scripts/prepare-chapter-publishing.mjs','utf8');
 const config=JSON.parse(await readFile(`${directory}/episode.json`,'utf8'));
 const start=source.indexOf('const apology='),end=source.indexOf("execFileSync('ffmpeg'");
 assert(start>=0&&end>start);
 const result=runInNewContext(source.slice(start,end)+'\n({metadata,description})',{config,compactChapters:'00:00 Welcome\n01:00 Lotus\n02:00 Reflection',Buffer,assert,chapterNumber:5,verseCount:29});
 assert(result.description.includes('అధ్యాయం 5, శ్లోకాలు 1 నుంచి 29'));
 assert(result.description.includes('#KarmaSannyasaYoga'));
 assert(result.description.includes('తామరాకు ఉపమానం'));
 assert(result.metadata.tags.includes('Karma Sannyasa Yoga'));
 assert(!result.description.includes('స్వధర్మం, కామ క్రోధ నియమం'));
 assert.equal(config.youtubeUploadAuthorized,false);
});
