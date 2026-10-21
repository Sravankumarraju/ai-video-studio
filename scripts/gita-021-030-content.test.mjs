import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nextVerseContent} from './gita-021-030-content.mjs';
test('Ten distinct individual verses preserve speaker changes and emotional progression',()=>{
 assert.deepEqual(Object.keys(nextVerseContent).map(Number),[21,22,23,24,25,26,27,28,29,30]);
 assert(nextVerseContent[24].words.includes('గుడాకేశుడు'));
 assert(nextVerseContent[26].detail.includes('పాండు'));
 assert(nextVerseContent[27].words.includes('రెండు వైపులా'));
 assert(nextVerseContent[28].verse.includes('కృపయా'));
 assert(nextVerseContent[29].detail.includes('వైద్య'));
 assert(nextVerseContent[30].detail.includes('తరువాతి'));
 assert.equal(new Set(Object.values(nextVerseContent).map(d=>d.example)).size,10);
});
test('Frozen batch totals bound provider calls for these ten episodes only',()=>{
 const p=JSON.parse(readFileSync('data/productions/divine-wisdom/NARRATION-021-030-PLAN.json','utf8'));
 assert.equal(p.episodes.length,10);assert.equal(p.calls,48);assert.equal(p.characters,26793);
 assert.equal(p.episodes.reduce((a,e)=>a+e.calls,0),48);
 for(const e of p.episodes){const c=JSON.parse(readFileSync(`${e.dir}/episode.json`,'utf8'));assert.equal(c.verseRef,`1.${e.shloka}`);assert.equal(c.authorizedNarrationCalls,e.calls);assert.equal(c.youtubeUploadAuthorized,true);assert(c.sections.find(s=>s.id==='shloka').text===nextVerseContent[e.shloka].verse);}
});
