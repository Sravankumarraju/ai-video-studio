import test from 'node:test';
import assert from 'node:assert/strict';
import {chapterThreeMeanings,chapterThreeActs} from './gita-chapter-three-content.mjs';
test('complete Karma Yoga exposition retains each verse individually',()=>{
 assert.deepEqual(chapterThreeMeanings.map(v=>v.verseNumber),Array.from({length:43},(_,i)=>i+1));
 assert(chapterThreeMeanings.every(v=>v.meaning.length>150));
 assert(chapterThreeMeanings[34].meaning.includes('వృత్తి మార్పు'));
 assert(chapterThreeMeanings[13].meaning.includes('వాతావరణ శాస్త్రానికి ప్రత్యామ్నాయ'));
});
test('middle reminder contains all requested viewer actions',()=>{
 const a=chapterThreeActs.find(a=>a.before===22);assert(a);
 for(const word of ['కామెంట్','లైక్','షేర్','సబ్‌స్క్రైబ్'])assert(a.text.includes(word));
});
