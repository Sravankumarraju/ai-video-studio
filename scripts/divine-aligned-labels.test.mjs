import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreVerseLabels} from './divine-aligned-labels.mjs';
const words=(a)=>a.map((text,i)=>({text,start:i,end:i+.8}));
test('split numeric verse labels are restored with complete timing',()=>{const r=restoreVerseLabels(words(['శ్లోకం','1','10','అర్థం']),'శ్లోకం 1.10. అర్థం');assert.deepEqual(r.map(x=>x.text),['శ్లోకం','1.10.','అర్థం']);assert.equal(r[1].start,1);assert.equal(r[1].end,2.8);assert.equal(r[2].start,3);});
test('wrong verse number is rejected',()=>assert.throws(()=>restoreVerseLabels(words(['శ్లోకం','1','9']),'శ్లోకం 1.10.')));
test('lexical changes and missing words are rejected',()=>{assert.throws(()=>restoreVerseLabels(words(['తప్పు']),'సరైన'));assert.throws(()=>restoreVerseLabels([],'శ్లోకం'));});
test('unexpected extra aligned words are rejected',()=>assert.throws(()=>restoreVerseLabels(words(['శ్లోకం','అదనం']),'శ్లోకం')));
