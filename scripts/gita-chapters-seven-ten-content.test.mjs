import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chapters,buildChapter} from './prepare-gita-chapters-seven-ten.mjs';
import {productionPolicy,assertAuthorizedNarrationBatchCount} from './divine-production-policy.mjs';
test('Chapters 7–10 cover the primary Sanskrit verse sequence without omission or duplication',async()=>{
 const source=await readFile('data/productions/divine-wisdom/gita-primary-source.html','utf8');
 const digits='०१२३४५६७८९',ascii=s=>[...s].map(x=>digits.indexOf(x)).join('');
 for(const ch of chapters){const b=buildChapter(ch);const numbers=[...source.matchAll(/॥\s*([०-९]+)-([०-९]+)॥/gu)].filter(m=>Number(ascii(m[1]))===ch.number).map(m=>Number(ascii(m[2])));
 assert.deepEqual(ch.meanings.map(v=>v.verseNumber),numbers);
 assert.equal(productionPolicy(b.config).verseCount,numbers.length);
 for(const bad of [b.config.sections.filter(s=>s.verseNumber!==1),[...b.config.sections,{verseNumber:1}],b.config.sections.toReversed()])assert.throws(()=>productionPolicy({...b.config,sections:bad}));
 const names=new Set(b.visuals.map(v=>v.name));for(const s of b.config.sections)if(s.image!=='logo')assert(names.has(s.image),`Missing ${ch.number}:${s.image}`);
 assert.equal(b.batches.reduce((s,x)=>s+x.text.length,0),b.plan.characters);
 assert.throws(()=>assertAuthorizedNarrationBatchCount(b.config,{batches:b.batches}));
 }
});
test('speaker transitions, full-chapter endings and engagement are retained',()=>{
 for(const ch of chapters){const b=buildChapter(ch);
 assert(b.config.sections.filter(s=>s.id.startsWith('next')).map(s=>s.text).join(' ').includes(ch.nextSpoken+' అధ్యాయం'));
 for(const prefix of [b.config.midReminderSection,'closing']){const text=b.config.sections.filter(s=>s.id===prefix||s.id.startsWith(prefix+'-part-')).map(s=>s.text).join(' ');for(const word of ['లైక్','షేర్','కామెంట్','సబ్‌స్క్రైబ్'])assert(text.includes(word));}
 for(const s of b.config.sections)assert(!/[a-z]/i.test(s.text),'Untranslated English in narration');
 }
 for(const ch of chapters.filter(c=>[8,10].includes(c.number))){const range=ch.number===8?[1,2]:[12,13,14,15,16,17,18];for(const n of range)assert(ch.meanings[n-1].meaning.includes('అర్జునుడు'));}
 assert(chapters[1].meanings[26].meaning.includes('అన్ని సమయాల్లో'));
 assert(chapters[2].meanings[29].meaning.includes('ప్రవర్తన మార్పు'));
 assert(chapters[3].meanings[35].meaning.includes('జూదం చేయమనే ఆమోదం కాదు'));
});
