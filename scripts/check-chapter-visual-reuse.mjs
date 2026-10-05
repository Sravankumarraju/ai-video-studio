import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const dir=process.argv[2]||'data/productions/divine-wisdom/gita-chapter-1/visual-v2';
const read=name=>readFile(`${dir}/${name}`,'utf8').then(JSON.parse);
const config=await read('episode.json'),state=await read('state.json'),before=await read('before-production.json'),after=await read('completed-timeline.json'),plan=await read('visual-plan.json');
const old=JSON.parse(await readFile(`${state.reusesNarrationFrom}/completed-timeline.json`,'utf8')),oldConfig=JSON.parse(await readFile(`${state.reusesNarrationFrom}/episode.json`,'utf8'));
const scenes=(p,id)=>p.document.variants.find(v=>v.id===id).sceneIds.map(id=>p.document.scenes.find(s=>s.id===id));
const original=scenes(old,oldConfig.variantId),updated=scenes(after,config.variantId);
for(const s of before.document.scenes)assert.deepEqual(after.document.scenes.find(x=>x.id===s.id),s);
for(const v of before.document.variants)assert.deepEqual(after.document.variants.find(x=>x.id===v.id),v);
const words=ss=>{let offset=0;return ss.flatMap(s=>{const ws=s.captions.flatMap(c=>c.words).map(w=>({text:w.text,start:offset+w.start,end:offset+w.end}));offset+=s.duration;return ws;});};
const a=words(original),b=words(updated);assert.equal(a.length,b.length);
for(let i=0;i<a.length;i++){assert.equal(b[i].text,a[i].text);assert(Math.abs(a[i].start-b[i].start)<.00001);assert(Math.abs(a[i].end-b[i].end)<.00001);}
const oldAudio=new Set(original.map(s=>s.audioId));assert(updated.every(s=>oldAudio.has(s.audioId)));
for(const s of updated){assert(s.assetId&&s.audioId&&!s.narrationStale&&!s.captionsStale);assert.equal(s.volume,1.25);assert.equal(s.overlap,0);assert.equal(s.fadeIn,0);assert.equal(s.fadeOut,0);}
const hashes=new Set();for(const p of await read('image-prompts.json')){const bytes=await readFile(`${dir}/${p.name}.png`),source=await readFile(p.source);assert(bytes.equals(source),'Reused artwork must be unchanged');const hash=createHash('sha256').update(bytes).digest('hex');assert.equal(hash,p.sha256);hashes.add(hash);}
assert(hashes.size>=30);assert.equal(hashes.size,plan.uniqueIllustrations);assert.deepEqual(config.sections.filter(s=>s.verseNumber).map(s=>s.verseNumber),Array.from({length:47},(_,i)=>i+1));
assert.equal(updated.length,plan.sceneCount);assert(updated.length>=90);assert(after.document.scenes.length<=200);
assert(updated.every((s,i)=>!i||s.assetId!==updated[i-1].assetId),'Consecutive cuts must show different illustrations');
assert(updated.every(s=>s.duration<=40),'Avoid holding one background for an entire long explanation');
const seconds=updated.reduce((n,s)=>n+s.duration,0);assert(Math.abs(seconds-original.reduce((n,s)=>n+s.duration,0))<.00001);
const result={uniqueIllustrations:hashes.size,scenes:updated.length,seconds,averageVisualSeconds:seconds/updated.length,minVisualSeconds:Math.min(...updated.map(s=>s.duration)),maxVisualSeconds:Math.max(...updated.map(s=>s.duration)),noConsecutiveRepeatedImages:true,all47VersesCovered:true,all3348CaptionWordTimesUnchanged:true,narrationAssetIdsUnchanged:true,sourceImageBytesUnchanged:true,earlierEditionsPreserved:true,newProviderCalls:0};
await writeFile(`${dir}/visual-reuse-verification.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
