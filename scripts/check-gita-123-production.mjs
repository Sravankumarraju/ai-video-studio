import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir='data/productions/divine-wisdom/gita-1-2-1-3';
const {document:doc}=JSON.parse(await readFile(`${dir}/completed-timeline.json`,'utf8'));
const normal=s=>s.replace(/\s+/gu,' ').trim();
assert.equal(doc.scenes.length,26);
assert.equal(new Set(doc.scenes.map(s=>s.assetId)).size,26,'Every scene must have a distinct image');
assert.equal(new Set(doc.scenes.map(s=>s.audioId)).size,26,'Every scene must have its own recording');
let cues=0;
for(const scene of doc.scenes){
 assert.ok(scene.assetId&&scene.audioId&&!scene.narrationStale&&!scene.captionsStale,scene.title);
 assert.equal(normal(scene.captions.map(c=>c.text).join(' ')),normal(scene.narration),`Caption text differs: ${scene.title}`);
 assert.equal(scene.overlap,0,'Image transitions must not overlap/fade narration');
 assert.equal(scene.fadeIn,0);assert.equal(scene.fadeOut,0);
 assert.ok(['zoom-in','zoom-out'].includes(scene.motion));
 let end=0;
 for(const cue of scene.captions){
  assert.ok(cue.start>=end-0.001&&cue.end>cue.start&&cue.end<=scene.duration+0.001,`Caption timing: ${scene.title}`);
  assert.ok(!/^[\s\p{P}]+$/u.test(cue.text),'Punctuation must not flash on its own');
  assert.ok(cue.words?.length&&cue.accuracy==='aligned');end=cue.end;cues++;
 }
}
assert.equal(doc.variants[0].font,'Noto Sans Telugu');
assert.ok(doc.variants[0].fontSize>=72&&doc.variants[0].background);
assert.equal(doc.variants[0].aspect,'landscape');
assert.equal(doc.video.generated.metadata.chapters.split('\n').length,8);
const result={passed:true,scenes:26,distinctImages:26,distinctRecordings:26,cues,seconds:doc.scenes.reduce((n,s)=>n+s.duration,0),checks:['complete persisted media','caption text matches narration','nonoverlapping aligned captions','no punctuation-only captions','no narration fading at image cuts','motion on every image','large Telugu caption font','eight measured chapters']};
await writeFile(`${dir}/production-checks.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
