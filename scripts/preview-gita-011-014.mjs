import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {episodeSections} from './gita-011-014-sections.mjs';
const root='data/productions/divine-wisdom';
const template=JSON.parse(await readFile(`${root}/gita-1-10/devotional-v1/episode.json`,'utf8'));
const episodes=[];
for(const n of [11,12,13,14]){
 const dir=`${root}/gita-1-${n}/devotional-v1`,sections=episodeSections(template,n),batches=[];
 await mkdir(dir,{recursive:true});
 for(const section of sections){
  assert(section.text.length<=1000);
  const last=batches.at(-1);
  if(last&&!last.verse&&section.id!=='shloka'&&(last.text+'\n\n'+section.text).length<=1000)last.text+='\n\n'+section.text;
  else batches.push({text:section.text,verse:section.id==='shloka'});
 }
 await writeFile(`${dir}/REVIEW-SCRIPT.md`,sections.map(s=>`## ${s.title}\n\n${s.text}`).join('\n\n'));
 episodes.push({chapter:1,shloka:n,calls:batches.length,characters:batches.reduce((a,b)=>a+b.text.length,0),words:sections.reduce((a,s)=>a+s.text.split(/\s+/u).length,0)});
}
const plan={episodes,calls:episodes.reduce((a,e)=>a+e.calls,0),characters:episodes.reduce((a,e)=>a+e.characters,0),price:'unknown',status:'scripts and art prepared; no paid calls made'};
await writeFile(`${root}/NARRATION-011-014-PLAN.json`,JSON.stringify(plan,null,2));
console.log(JSON.stringify(plan));
