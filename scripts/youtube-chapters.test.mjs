import test from 'node:test';
import assert from 'node:assert/strict';
import {youtubeChapterEntries,youtubeChapterSummaryEntries} from './youtube-chapters.mjs';
test('short welcome and final snippets do not create invalid YouTube chapters',()=>{
 const entries=[{start:0,label:'Welcome'},{start:8.36,label:'Hook'},{start:56,label:'Act'},{start:98.333,required:true,verse:1},{start:129,label:'Closing'}];
 assert.deepEqual(youtubeChapterEntries(entries,137).map(e=>e.start),[0,56,98]);
});
test('integer timestamp formatting cannot turn a nine-second gap into a valid chapter',()=>{
 const entries=[{start:0},{start:9.99},{start:20},{start:40}];
 assert.deepEqual(youtubeChapterEntries(entries,60).map(e=>e.start),[0,20,40]);
});
test('short required verse markers must be resolved rather than silently omitted',()=>{
 assert.throws(()=>youtubeChapterEntries([{start:0},{start:8,required:true},{start:20},{start:40}],60));
});
test('long chapter descriptions keep structural sections instead of every verse marker',()=>{
 const entries=[{start:0,section:{id:'welcome'}},{start:20,section:{id:'verse-1',verseNumber:1}},{start:40,section:{id:'act-11'}},{start:60,section:{id:'verse-11',verseNumber:11}},{start:90,section:{id:'reflection'}},{start:119,section:{id:'closing'}}];
 assert.deepEqual(youtubeChapterSummaryEntries(entries,130).map(e=>e.section.id),['welcome','act-11','reflection','closing']);
});
