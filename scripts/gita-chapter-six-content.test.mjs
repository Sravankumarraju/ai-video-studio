import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {chapterSixMeanings,chapterSixActs} from './gita-chapter-six-content.mjs';
import {productionPolicy,assertAuthorizedNarrationBatchCount} from './divine-production-policy.mjs';
const dir='data/productions/divine-wisdom/gita-chapter-6/story-v1';
test('Chapter6 retains all47 meanings and rejects skipped, duplicate and reordered coverage',()=>{
 const config={productionKind:'chapter-meaning',chapterNumber:6,sections:chapterSixMeanings};
 assert.equal(productionPolicy(config).verseCount,47);
 for(const sections of [config.sections.slice(1),config.sections.toReversed(),[...config.sections,config.sections[46]]])assert.throws(()=>productionPolicy({...config,sections}));
 for(const n of [33,34,37,38,39])assert(chapterSixMeanings[n-1].meaning.includes('అర్జునుడు'));
 assert(chapterSixMeanings[40].meaning.includes('పునర్జన్మ'));assert(chapterSixMeanings[41].meaning.includes('జన్మ'));
 assert(chapterSixMeanings[46].meaning.includes('భజించేవాడే'));
});
test('Chapter6 no recitation, next fullChapter7 and midpoint/end engagement retained',async()=>{
 const config=JSON.parse(await readFile(`${dir}/episode.json`,'utf8'));
 assert.equal(productionPolicy(config).verseCount,47);assert(!config.sections.some(s=>s.id==='shloka'));
 assert(config.sections.filter(s=>s.id.startsWith('next')).map(s=>s.text).join(' ').includes('ఏడవ అధ్యాయం'));
 for(const text of [chapterSixActs.find(a=>a.before===24).text,config.sections.filter(s=>s.id.startsWith('closing')).map(s=>s.text).join(' ')])for(const word of ['లైక్','షేర్','కామెంట్','సబ్‌స్క్రైబ్'])assert(text.includes(word));
});
test('Chapter6 wrapper preserves batch preparation and exact approved limit',async()=>{
 const wrapper=await readFile('scripts/finish-gita-chapter-six.ps1','utf8');
 assert(wrapper.includes("@('prepare','voice','finish')"));assert(wrapper.includes('authorizedNarrationCalls -ne 27'));
 assert.throws(()=>assertAuthorizedNarrationBatchCount({authorizedNarrationCalls:27},{batches:Array(28).fill({})}));
});
test('Chapter6 metadata has47 meanings and its own yoga/summary rather than oldchapters',async()=>{
 const source=await readFile('scripts/prepare-chapter-publishing.mjs','utf8');
 const config=JSON.parse(await readFile(`${dir}/episode.json`,'utf8'));
 const result=runInNewContext(source.slice(source.indexOf('const apology='),source.indexOf("execFileSync('ffmpeg'"))+'\n({metadata,description})',{config,compactChapters:'00:00 Welcome\n01:00 Meditation\n02:00 Reflection',Buffer,assert,chapterNumber:6,verseCount:47});
 assert(result.description.includes('అధ్యాయం 6, శ్లోకాలు 1 నుంచి 47'));
 assert(result.description.includes('#AtmaSamyamaYoga'));assert(result.description.includes('అభ్యాసం వైరాగ్యం'));
 assert(result.metadata.tags.includes('Atma Samyama Yoga'));assert(!result.description.includes('తామరాకు ఉపమానం'));
});
