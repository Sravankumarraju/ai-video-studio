import {readFile,writeFile} from 'node:fs/promises';
const root='data/productions/divine-wisdom/motivation-shorts-40';
const plan=JSON.parse(await readFile(`${root}/NARRATION-PLAN.json`,'utf8'));
const shorts=[];
for(const s of plan.shorts){const state=await readFile(`${s.directory}/state.json`,'utf8').then(JSON.parse).catch(e=>{if(e.code!=='ENOENT')throw e;return {};});const final=await readFile(`${s.directory}/FINAL_DELIVERY.json`,'utf8').then(JSON.parse).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});shorts.push({id:s.id,projectId:s.projectId,voiceJobs:state.jobs||{},voiceFinished:Object.keys(state.finished||{}).length===1,renderJobs:state.renderJobs||{},verifiedLocal:!!final,mp4:final?.mp4});}
const progress={updatedAt:new Date().toISOString(),plannedCalls:40,characters:17313,paidJobsRecorded:shorts.reduce((n,s)=>n+Object.keys(s.voiceJobs).length,0),finishedNarrations:shorts.filter(s=>s.voiceFinished).length,verifiedVideos:shorts.filter(s=>s.verifiedLocal).length,uploadHold:true,shorts};
await writeFile(`${root}/PROGRESS.json`,JSON.stringify(progress,null,2));
await writeFile(`${root}/STATUS.md`,`# Forty additional motivation Shorts\n\n${progress.finishedNarrations}/40 narration sources finished; ${progress.verifiedVideos}/40 local videos verified. ${progress.paidJobsRecorded}/40 saved voice jobs recorded. Frozen total 17313 characters; no extra calls.\n\nArtwork/render/review checks continue from saved state. All uploads on hold.\n`);
console.log(JSON.stringify({finishedNarrations:progress.finishedNarrations,verifiedVideos:progress.verifiedVideos,paidJobsRecorded:progress.paidJobsRecorded,uploadHold:true}));
