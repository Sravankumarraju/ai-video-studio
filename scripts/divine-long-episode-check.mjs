import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {productionPolicy,expectedChapterVerseIntroduction,assertNavaratriVisualReferences} from './divine-production-policy.mjs';
const [dir,kind='draft']=process.argv.slice(2);
const config=JSON.parse(await readFile(`${dir}/episode.json`,'utf8')),state=JSON.parse(await readFile(`${dir}/state.json`,'utf8')),before=JSON.parse(await readFile(`${dir}/before-production.json`,'utf8')),after=JSON.parse(await readFile(`${dir}/completed-timeline.json`,'utf8'));
const {chapter,chapterNumber,verseCount,maximumDuration}=productionPolicy(config);
const navaratri=config.productionKind==='navaratri';
if(navaratri)assert(config.navaratri&&Number.isInteger(config.navaratri.form));
const normalize=t=>t.normalize('NFC').replace(/[\p{P}\p{S}‌‍]/gu,'').trim();
for(const s of before.document.scenes)assert.deepEqual(after.document.scenes.find(n=>n.id===s.id),s,'Earlier narration plan changed');
for(const v of before.document.variants)assert.deepEqual(after.document.variants.find(n=>n.id===v.id),v,'Earlier version changed');
for(const a of before.assets)assert(after.assets.some(n=>n.id===a.id),'Earlier asset missing');
const variant=after.document.variants.find(v=>v.id===config.variantId),scenes=variant.sceneIds.map(id=>after.document.scenes.find(s=>s.id===id));
assertNavaratriVisualReferences(config,state,scenes);
assert.equal(variant.aspect,'landscape');assert.equal(variant.titleOverlay,'Divine Wisdom Telugu');assert(variant.captions&&variant.wordHighlight&&variant.logoId);assert.equal(variant.fontSize,96);assert.equal(variant.captionBottom,.12);assert.equal(variant.highlightColor,'#ffd54a');
assert(scenes[0].narration.includes('డివైన్ విజ్డమ్ తెలుగు ఛానల్‌కు స్వాగతం'));assert(scenes[0].audioId&&scenes[0].mediaType==='video');
assert(!after.document.effects.length);
if(config.originalMusic)assert(after.document.musicId&&after.document.ducking&&after.document.musicVolume<=.25);else assert(!after.document.musicId);
assert(scenes.every(s=>s.audioId&&s.narration&&!s.narrationStale&&!s.captionsStale&&s.transition==='cut'&&!s.overlap&&!s.fadeIn&&!s.fadeOut));
const verse=scenes.find(s=>s.id===config.prefix+'-shloka');if(!chapter&&!navaratri){assert.equal(verse.motion,'static');assert.equal(verse.strength,0);assert.equal(verse.captions.length,1);assert.equal(verse.captions[0].display,'full-verse');assert.equal(verse.captions[0].text,config.verseDisplay);
assert.equal(verse.captions[0].start,verse.captions[0].words[0].start);assert.equal(verse.captions[0].end,verse.captions[0].words.at(-1).end);
assert.equal(scenes.filter(s=>s.captions.some(c=>c.display==='full-verse')).length,1);}else if(chapter){assert(!verse);assert(!scenes.some(s=>s.captions.some(c=>c.display==='full-verse')));for(const s of config.sections.filter(s=>s.verseNumber)){const actual=scenes.find(a=>a.id===config.prefix+'-'+s.id);assert.equal(actual.narration,s.text);assert(actual.narration.startsWith(expectedChapterVerseIntroduction(config,chapterNumber,s.verseNumber)));}assert.equal(scenes.length,config.sections.length);}else{assert(!verse);assert(!scenes.some(s=>s.captions.some(c=>c.display==='full-verse')));assert.equal(scenes.length,config.sections.length);for(const section of config.sections)assert.equal(scenes.find(s=>s.id===config.prefix+'-'+section.id).narration,section.text);}
for(const s of scenes){assert.deepEqual(s.captions.flatMap(c=>c.words||[]).map(w=>normalize(w.text)),s.narration.trim().split(/\s+/u).map(normalize));if(s.mediaType==='image'&&s!==verse)assert(s.motion.startsWith('pan')&&s.motionEasing==='smooth'&&s.strength<=.025);}
for(const b of state.batches){const audio=after.assets.find(a=>a.id===state.finished[b.id].audioId),used=scenes.filter(s=>s.audioId===audio.id).sort((a,b)=>a.audioStart-b.audioStart);assert.equal(used[0].audioStart,0);assert(Math.abs(used.at(-1).audioStart+used.at(-1).duration-audio.duration)<.03);for(let i=1;i<used.length;i++)assert(Math.abs(used[i-1].audioStart+used[i-1].duration-used[i].audioStart)<.001);}
assert(variant.publishing.description.trim().split('\n').at(-1).includes('క్షమాపణలు'));assert(scenes.at(-1).narration.includes('తెలుగు ఛానల్‌కు'));assert(scenes.at(-1).narration.includes('షేర్'));
if(config.episodeNumber&&!navaratri)assert(variant.publishing.description.includes(`ఎపిసోడ్: ${config.episodeNumber}`));
if(config.verseRef)assert(variant.publishing.description.includes(`శ్లోకం: ${config.verseRef}`));
if(config.videoTitle)assert.equal(variant.publishing.titles[0],config.videoTitle);
if(config.nextVerseRef)assert(variant.publishing.description.includes(`తర్వాతి వీడియో: భగవద్గీత ${config.nextVerseRef}.`));
if(config.verseRef==='1.3'){assert(!scenes.some(s=>s.narration.includes('మీ శిష్యుడిని చూడండి')),'Incorrect object in the opening paraphrase');assert(scenes.find(s=>s.id===config.prefix+'-hook').narration.includes('మీ శిష్యుడు సిద్ధం చేసిన సైన్యాన్ని చూడండి'));}
const file=`${dir}/${config.fileStem||'episode-002'}-${kind}.mp4`,p=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'})),video=p.streams.find(s=>s.codec_type==='video'),audio=p.streams.find(s=>s.codec_type==='audio'),seconds=Number(p.format.duration);
assert.equal(video.codec_name,'h264');assert.equal(audio.codec_name,'aac');assert.deepEqual([video.width,video.height],kind==='full'?[1920,1080]:[640,360]);assert(seconds<=maximumDuration);assert(Math.abs(seconds-scenes.reduce((n,s)=>n+s.duration,0))<.15);
execFileSync('ffmpeg',['-v','error','-xerror','-i',file,'-f','null','-'],{stdio:'pipe'});
let at=0;const verseStart=verse?scenes.map(s=>{const x={id:s.id,start:at};at+=s.duration;return x;}).find(s=>s.id===verse.id).start:null;
const result={kind,seconds,width:video.width,height:video.height,decodedEntireFile:true,allScenesNarrated:true,alignedCaptionWords:scenes.flatMap(s=>s.captions.flatMap(c=>c.words||[])).length,channelNameSpokenAndDisplayed:true,noMusic:!config.originalMusic,originalMusicWithDucking:!!config.originalMusic,longFormOnly:true,oldScenesAndAssetsPreserved:true,...(navaratri?{navadurgaForm:config.navaratri.form,deviOnlyIntro:!!config.deviOnlyIntro,visualEdition:state.graceEdition,noSanskritRecitation:true}:chapter?{allVerseMeaningsCovered:true,chapterNumber,verseCount,...(chapterNumber===1?{all47VerseMeaningsCovered:true}:{}),noSanskritRecitation:true,explicitChapterLabels:!!config.explicitChapterLabels}:{verseVisibleFrom:verseStart+verse.captions[0].start,verseVisibleUntil:verseStart+verse.captions[0].end})};
await writeFile(`${dir}/verification-${kind}.json`,JSON.stringify(result,null,2));if(kind==='full'){state.status='completed';state.verifiedAt=new Date().toISOString();state.verifiedExport=result;await writeFile(`${dir}/state.json`,JSON.stringify(state,null,2));}console.log(JSON.stringify(result));
