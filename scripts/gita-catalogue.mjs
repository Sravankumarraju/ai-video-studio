import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const counts=[47,72,43,42,29,47,30,28,34,42,55,20,35,27,20,24,28,78];
const verses=counts.flatMap((count,i)=>Array.from({length:count},(_,j)=>({reference:`${i+1}.${j+1}`,chapter:i+1,verse:j+1,sourceUrl:`https://www.holy-bhagavad-gita.org/chapter/${i+1}/verse/${j+1}/`,status:i===1&&j===46?'script-reviewed':'planned',script:'',imagePrompt:'',audioId:null,renderJobId:null})));
assert.equal(verses.length,701);assert.equal(new Set(verses.map(v=>v.reference)).size,701);
await writeFile('data/productions/bhagavad-gita-telugu/gita-verse-catalogue.json',JSON.stringify({researchedDate:'2026-10-01',edition:'Swami Mukundananda website numbering: chapter 13 has 35 verses',countsSource:'https://www.holy-bhagavad-gita.org/index/',scope:'Complete reference index; remaining verse texts and explanations are not individually reviewed',chapters:counts.map((count,i)=>({chapter:i+1,verses:count})),verses},null,2));
console.log('Saved 18-chapter, 701-reference planning catalogue');
