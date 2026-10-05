import assert from 'node:assert/strict';
export function productionPolicy(config){
 const chapter=config.productionKind==='chapter-meaning';
 const chapterNumber=config.chapterNumber??1;
 const verseCounts=[47,72];
 const maximumDuration=chapter?(config.maximumDuration??7200):300;
 assert(Number.isFinite(maximumDuration)&&maximumDuration>0&&maximumDuration<=7200,'Invalid maximum duration');
 if(chapter){
  assert(Number.isInteger(chapterNumber)&&chapterNumber>=1&&chapterNumber<=verseCounts.length,'Chapter coverage has not been verified for this chapter');
  assert.deepEqual(config.sections.filter(s=>s.verseNumber!==undefined).map(s=>s.verseNumber),Array.from({length:verseCounts[chapterNumber-1]},(_,i)=>i+1),`Chapter ${chapterNumber} must cover all ${verseCounts[chapterNumber-1]} verses exactly once and in order`);
  assert(!config.sections.some(s=>s.id==='shloka'),'Meaning-only chapter has no recitation scene');
 }
 return {chapter,chapterNumber,verseCount:verseCounts[chapterNumber-1],maximumDuration};
}
export function expectedChapterVerseIntroduction(config,chapterNumber,verseNumber){
 assert(Number.isInteger(chapterNumber)&&chapterNumber>0,'Invalid chapter number');
 assert(Number.isInteger(verseNumber)&&verseNumber>0,'Invalid verse number');
 return config.explicitChapterLabels?`అధ్యాయం ${chapterNumber}, శ్లోకం ${verseNumber}.`:`శ్లోకం ${chapterNumber}.${verseNumber}.`;
}
export function assertChapterMediaStageReady(config,state){
 if(config.productionKind==='chapter-meaning')assert(state.batches?.length&&state.batches.every(b=>state.finished[b.id]),'Finish all chapter audio before persisting media; stages share one checkpoint');
}
export function assertProductionMediaReady(config,state){
 assert(state.logoId&&state.logoClipId,'Persist logo media before assembly');
 for(const s of config.sections)if(s.image!=='logo')assert(state.images[s.image],`Missing visual for ${s.id}`);
}
export function assertNavaratriVisualReferences(config,state,scenes){
 if(config.productionKind!=='navaratri')return;
 for(const section of config.sections){
  if(config.deviOnlyIntro)assert(['logo','hero','story','grace','blessing','sanctuary'].includes(section.image),'Introduction must contain only reviewed Durga visuals after the logo');
  const scene=scenes.find(s=>s.id===config.prefix+'-'+section.id);
  const expected=section.image==='logo'?state.logoClipId:state.images[section.image];
  assert(scene&&expected&&scene.assetId===expected,`Outdated or missing Navaratri visual for ${section.id}`);
 }
}
export function assertAuthorizedNarrationBatchCount(config,state){
 if(config.productionKind==='navaratri')assert(config.authorizedNarrationCalls!==undefined,'New Navaratri narration needs its own explicit credit approval');
 if(config.authorizedNarrationCalls===undefined)return;
 assert(Number.isInteger(config.authorizedNarrationCalls)&&config.authorizedNarrationCalls>0,'Invalid authorized narration-call limit');
 assert(state.batches?.length&&state.batches.length<=config.authorizedNarrationCalls,'Narration batches exceed the explicitly approved call limit');
}
