import test from 'node:test';
import assert from 'node:assert/strict';
import {productionPolicy,expectedChapterVerseIntroduction,assertChapterMediaStageReady,assertProductionMediaReady,assertAuthorizedNarrationBatchCount} from './divine-production-policy.mjs';
const complete=()=>({productionKind:'chapter-meaning',sections:Array.from({length:47},(_,i)=>({id:`verse-${i+1}`,verseNumber:i+1}))});
test('an expanded script cannot exceed approved paid narration calls',()=>{
 assert.doesNotThrow(()=>assertAuthorizedNarrationBatchCount({authorizedNarrationCalls:5},{batches:Array(5).fill({})}));
 assert.throws(()=>assertAuthorizedNarrationBatchCount({authorizedNarrationCalls:5},{batches:Array(6).fill({})}));
});
test('individual verses retain five-minute limit despite a requested override',()=>assert.equal(productionPolicy({maximumDuration:7200}).maximumDuration,300));
test('explicit chapter permits natural long-form timing',()=>assert.deepEqual(productionPolicy(complete()),{chapter:true,chapterNumber:1,verseCount:47,maximumDuration:7200}));
test('Chapter 2 requires all 72 meanings instead of reusing Chapter 1 coverage',()=>{
 const chapter2={...complete(),chapterNumber:2};
 assert.throws(()=>productionPolicy(chapter2));
 chapter2.sections=Array.from({length:72},(_,i)=>({id:`verse-${i+1}`,verseNumber:i+1}));
 assert.equal(productionPolicy(chapter2).verseCount,72);
 for(const sections of [chapter2.sections.slice(0,71),chapter2.sections.toReversed(),[...chapter2.sections,{verseNumber:72}]])assert.throws(()=>productionPolicy({...chapter2,sections}));
});
test('chapter verse introductions use the configured chapter number',()=>{
 assert.equal(expectedChapterVerseIntroduction({explicitChapterLabels:true},1,47),'అధ్యాయం 1, శ్లోకం 47.');
 assert.equal(expectedChapterVerseIntroduction({explicitChapterLabels:true},2,72),'అధ్యాయం 2, శ్లోకం 72.');
 assert.equal(expectedChapterVerseIntroduction({},2,11),'శ్లోకం 2.11.');
});
test('missing, repeated or out-of-order chapter verses block production',()=>{for(const sections of [complete().sections.slice(1),[...complete().sections,{verseNumber:47}],complete().sections.toReversed()])assert.throws(()=>productionPolicy({...complete(),sections}));});
test('meaning-only chapter rejects a Sanskrit recitation scene',()=>assert.throws(()=>productionPolicy({...complete(),sections:[...complete().sections,{id:'shloka'}]})));
test('invalid duration is rejected',()=>{for(const maximumDuration of [0,-1,7201,NaN])assert.throws(()=>productionPolicy({...complete(),maximumDuration}));});
test('chapter media persistence waits for audio finishing to prevent checkpoint races',()=>{assert.throws(()=>assertChapterMediaStageReady(complete(),{batches:[{id:'a'}],finished:{}}));assert.doesNotThrow(()=>assertChapterMediaStageReady(complete(),{batches:[{id:'a'}],finished:{a:{audioId:'audio'}}}));});
test('assembly rejects missing logo or scene visuals before render',()=>{const config={sections:[{id:'welcome',image:'logo'},{id:'verse-1',image:'hero'}]};assert.throws(()=>assertProductionMediaReady(config,{images:{}}));assert.throws(()=>assertProductionMediaReady(config,{logoId:'logo',logoClipId:'clip',images:{}}));assert.doesNotThrow(()=>assertProductionMediaReady(config,{logoId:'logo',logoClipId:'clip',images:{hero:'hero'}}));});
