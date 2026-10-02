import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const dir='data/productions/divine-wisdom/gita-series-intro',kind=process.argv[2]||'draft';
const config=JSON.parse(await readFile(`${dir}/intro.json`,'utf8')),state=JSON.parse(await readFile(`${dir}/state.json`,'utf8')),p=JSON.parse(await readFile(`${dir}/completed-timeline.json`,'utf8'));
const normalized=t=>t.normalize('NFC').replace(/[\p{P}\p{S}‌‍]/gu,'').trim();
assert(!p.document.musicId&&!p.document.effects.length,'Unexpected music/effects');
assert.deepEqual(p.document.variants.map(v=>v.id),['gita-intro-te-16x9'],'Only long-form introduction is authorized');
const results=[];
for(const v of p.document.variants){
 const scenes=v.sceneIds.map(id=>v.sceneOverrides[id]||p.document.scenes.find(s=>s.id===id));
 assert(scenes.every(s=>s.audioId&&s.narration.trim()&&!s.narrationStale&&!s.captionsStale),'Silent or stale narrated scene');
 assert(v.captions&&v.wordHighlight&&v.highlightColor==='#ffd54a');
 assert(scenes.every(s=>s.transition==='cut'&&!s.overlap&&!s.fadeIn&&!s.fadeOut),'Image cut alters narration');
 assert(scenes.every(s=>s.motion==='static'||(s.motionEasing==='smooth'&&s.strength<=.025)));
 const text=scenes.map(s=>s.narration).join(' '),captionWords=scenes.flatMap(s=>s.captions.flatMap(c=>c.words||[])).map(w=>normalized(w.text));
 assert.deepEqual(captionWords,text.trim().split(/\s+/u).map(normalized),'Caption/script discrepancy');
 if(v.aspect==='landscape'){
  assert.deepEqual(text.trim().split(/\s+/u).map(normalized),config.sections.map(s=>s.text).join(' ').trim().split(/\s+/u).map(normalized));
  for(const b of state.batches){const audioId=state.finished[b.id].audioId,a=p.assets.find(a=>a.id===audioId),used=scenes.filter(s=>s.audioId===audioId).sort((a,b)=>a.audioStart-b.audioStart);assert.equal(used[0].audioStart,0);assert(Math.abs(used.at(-1).audioStart+used.at(-1).duration-a.duration)<.03);for(let i=1;i<used.length;i++)assert(Math.abs(used[i-1].audioStart+used[i-1].duration-used[i].audioStart)<.001);}
 }
 const file=`${dir}/${v.id}-${kind}.mp4`,probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'})),video=probe.streams.find(s=>s.codec_type==='video'),audio=probe.streams.find(s=>s.codec_type==='audio'),seconds=Number(probe.format.duration);
 assert.equal(video.codec_name,'h264');assert.equal(audio.codec_name,'aac');assert(Math.abs(seconds-scenes.reduce((n,s)=>n+s.duration,0))<.15);
 const expected=kind==='draft'?(v.aspect==='landscape'?[640,360]:[360,640]):(v.aspect==='landscape'?[1920,1080]:[1080,1920]);assert.deepEqual([video.width,video.height],expected);
 execFileSync('ffmpeg',['-v','error','-i',file,'-f','null','-'],{stdio:'pipe'});
 results.push({variantId:v.id,kind,seconds,width:video.width,height:video.height,decodedEntireFile:true,alignedCaptionWords:captionWords.length,allScenesNarrated:true,noMusic:true});
}
assert(p.document.scenes.find(s=>s.id==='gita-intro-welcome').narration.includes('భగవద్గీత సిరీస్ పరిచయం'),'Opening title narration missing');
assert(p.document.publishing.description.trim().split('\n').at(-1).includes('క్షమాపణలు'));
await writeFile(`${dir}/verification-${kind}.json`,JSON.stringify(results,null,2));
if(kind==='full'){
 state.status='completed';state.verifiedAt=new Date().toISOString();state.verifiedExports=results;
 await writeFile(`${dir}/state.json`,JSON.stringify(state,null,2));
}
console.log(JSON.stringify(results));
