import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='data/productions/divine-wisdom/gita-chapter-1',read=f=>readFile(f,'utf8').then(JSON.parse);
const old=await read(`${root}/story-v4/completed-timeline.json`),next=await read(`${root}/audio-corrected-v5/completed-timeline.json`);
function scenes(p,id){const v=p.document.variants.find(v=>v.id===id),map=new Map(p.document.scenes.map(s=>[s.id,s]));assert(v);return v.sceneIds.map(id=>v.sceneOverrides[id]||map.get(id));}
const before=scenes(old,'gita-chapter-1-te-story-v4'),after=scenes(next,'gita-chapter-1-te-audio-corrected-v5');
const unchanged=scenes(next,'gita-chapter-1-te-story-v4');assert.deepEqual(unchanged,before,'Original edition changed');
const verseNumbers=after.filter(s=>/-verse-\d+$/.test(s.id)).map(s=>Number(s.id.match(/-verse-(\d+)$/)[1]));assert.deepEqual(verseNumbers,Array.from({length:47},(_,i)=>i+1));
for(const s of before.filter(s=>s.id.includes('-verse-'))){const n=after.find(n=>n.id===s.id);assert.equal(n.narration,s.narration);if(s.id.endsWith('-verse-22-part-2'))assert.notEqual(n.audioId,s.audioId);else {assert.equal(n.audioId,s.audioId);assert.equal(n.audioStart,s.audioStart);assert.equal(n.duration,s.duration);}}
assert(after[1].narration.includes('అర్జున విషాద యోగం'));assert(after.some(s=>s.narration.includes('రెండవ అధ్యాయం, సాంఖ్య యోగం')));
assert(!after.some(s=>/శ్లోకం పదకొండును|ఒక్కో శ్లోకం సిరీస్/.test(s.narration)));
for(const s of after){assert(!s.narrationStale&&!s.captionsStale);assert(s.audioId);assert(s.captions.every(c=>c.start>=0&&c.end<=s.duration+.05));}
const prompt=await readFile('data/productions/divine-wisdom/GITA-FULL-CHAPTER-SERIES-PROMPT.md','utf8');assert(prompt.includes('next chapter'));assert(prompt.includes('Do not skip any explanation'));
const grouped=await read('data/productions/divine-wisdom/GITA-FULL-CHAPTER-SERIES.json');assert.notEqual(grouped.seriesId,'60823952-1e93-462e-a6bc-ce7161e85dd1');assert(!grouped.youtubeModified);
const result={all47MeaningsPreserved:true,originalEditionUnchanged:true,reportedAudioReplaced:true,nextChapterOnly:true,alignedCaptionsWithinBounds:true,separateLocalSeries:true,youtubeChanged:false};await writeFile(`${root}/audio-corrected-v5/regression-check.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
