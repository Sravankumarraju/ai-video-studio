import test from 'node:test';
import assert from 'node:assert/strict';
import {storySections} from './chapter-one-story-content.mjs';
test('story rewrite covers all 47 meanings in order with explicit chapter and shloka introductions',()=>{
 const verses=storySections.filter(s=>s.verseNumber);
 assert.deepEqual(verses.map(s=>s.verseNumber),Array.from({length:47},(_,i)=>i+1));
 for(const s of verses)assert(s.text.startsWith(`అధ్యాయం 1, శ్లోకం ${s.verseNumber}.`));
 assert.equal(storySections.filter(s=>s.id.startsWith('act-')).length,6);
});
test('branded opening is brief and all four engagement requests occur at middle and end',()=>{
 assert(storySections[0].text.split(/\s+/u).length<25);
 for(const id of ['act-28','closing']){
  const text=storySections.find(s=>s.id===id).text;
  for(const word of ['లైక్','షేర్','కామెంట్','సబ్‌స్క్రైబ్'])assert(text.includes(word),`${id} is missing ${word}`);
 }
});
test('historical and interpretive context survives the story rewrite',()=>{
 const text=n=>storySections.find(s=>s.verseNumber===n).text;
 assert(text(10).includes('మరో పఠనంలో'));
 assert(text(41).includes('వర్ణసంకరం')&&text(41).includes('చారిత్రక'));
 assert(text(42).includes('పిండం')&&text(43).includes('జాతి'));
 assert(text(44).includes('విన్నాను'));
 assert(text(46).includes('సూచనగా తీసుకోకూడదు'));
});
