import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {projectSchema} from '../lib/schema.ts';
const edition=process.argv[3]||'recreated-v3';
const dir=`data/productions/divine-wisdom/gita-1-1/${edition}`;
const state=JSON.parse(await readFile(`${dir}/production-state.json`,'utf8'));
const before=projectSchema.parse(JSON.parse(await readFile(`${dir}/before-recreation.json`,'utf8')).document);
const after=projectSchema.parse(JSON.parse(await readFile(`${dir}/completed-timeline.json`,'utf8')).document);
const v=after.variants.find(v=>v.id===state.variantId);
const scenes=v.sceneIds.map(id=>after.scenes.find(s=>s.id===id));
for(const s of before.scenes)assert.deepEqual(after.scenes.find(n=>n.id===s.id),s,'Original scene changed');
for(const v of before.variants)assert.deepEqual(after.variants.find(n=>n.id===v.id),v,'Original edition changed');
for(let i=0;i<8;i++){
 const s=before.scenes.find(s=>s.id===`gita-1-1-te-section-${i}`),shots=scenes.filter(n=>n.audioId===s.audioId).sort((a,b)=>a.audioStart-b.audioStart);
 let end=s.audioStart;
 for(const n of shots){assert(Math.abs(n.audioStart-end)<1e-6,'Audio source gap or overlap');assert.equal(n.volume,s.volume);assert.equal(n.fadeIn,0);assert.equal(n.fadeOut,0);assert.equal(n.transition,'cut');end+=n.duration;}
 assert(Math.abs(end-s.audioStart-s.duration)<1e-6,'Narration shortened');
}
assert.equal(v.captions,edition==='refined-v4');assert.equal(v.aspect,'landscape');assert(v.logoId);assert.equal(v.logoStart,2.92);
if(edition==='refined-v4'){
 assert.equal(v.wordHighlight,true);assert.equal(v.fontSize,96);assert.equal(v.captionBottom,.12);
 for(const s of scenes.filter(s=>s.mediaType==='image'&&!s.id.endsWith('-shloka')&&!s.id.endsWith('-title'))){assert(s.motion.startsWith('pan'));assert.equal(s.motionEasing,'smooth');assert(s.strength<=.03);}
 assert(v.publishing.description.trim().split('\n').at(-1).includes('క్షమాపణలు'));
}
assert(!after.musicId);assert.equal(after.effects.length,0);
const verse=scenes.find(s=>s.id.endsWith('-shloka'));assert.equal(verse.motion,'static');assert.equal(verse.captions.length,1);assert.equal(verse.captions[0].display,'full-verse');assert.equal(verse.captions[0].start,.02);assert.equal(verse.captions[0].end,10.42);
const closing=scenes.at(-1);assert(closing.narration.includes('షేర్'));assert(closing.narration.includes('కొత్తగా'));assert(closing.audioId);
const kind=process.argv[2]||'draft',file=`${dir}/episode-001-${kind}.mp4`;
const p=JSON.parse(execFileSync(process.env.FFPROBE_PATH||'ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}));
const video=p.streams.find(s=>s.codec_type==='video'),audio=p.streams.find(s=>s.codec_type==='audio');assert.equal(video.codec_name,'h264');assert.equal(audio.codec_name,'aac');assert.equal(video.width,kind==='full'?1920:640);assert.equal(video.height,kind==='full'?1080:360);
const seconds=scenes.reduce((n,s)=>n+s.duration,0);assert(seconds<=300);assert(Math.abs(Number(p.format.duration)-seconds)<.1);
execFileSync(process.env.FFMPEG_PATH||'ffmpeg',['-v','error','-i',file,'-f','null','-'],{stdio:'pipe'});
let at=0;const timeline=scenes.map(s=>{const x={sceneId:s.id,start:at,end:at+s.duration};at=x.end;return x;});
const t=timeline.find(t=>t.sceneId===verse.id);
const result={kind,seconds:Number(p.format.duration),width:video.width,height:video.height,videoCodec:video.codec_name,audioCodec:audio.codec_name,decodedEntireFile:true,oldScenesAndVariantsPreserved:true,originalNarrationRangesPreserved:true,noMusic:true,ordinaryCaptions:v.captions,wordHighlight:v.wordHighlight,verseVisibleFrom:t.start+.02,verseVisibleUntil:t.start+10.42,logoWelcome:true,endingActions:['subscribe','like','share','comment'],timeline};
await writeFile(`${dir}/verification-${kind}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({...result,timeline:undefined}));
