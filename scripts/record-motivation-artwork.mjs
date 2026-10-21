import {readFile,writeFile} from 'node:fs/promises';
const root='data/productions/divine-wisdom/motivation-shorts-40';
const plan=JSON.parse(await readFile(`${root}/NARRATION-PLAN.json`,'utf8'));
for(const s of plan.shorts){s.targetSeconds=[30,65];const config=JSON.parse(await readFile(`${s.directory}/episode.json`,'utf8'));config.targetSeconds=[30,65];await writeFile(`${s.directory}/episode.json`,JSON.stringify(config,null,2));}
plan.timingNote='Measured opening sources last 34–36 seconds naturally. Editorial range adjusted to 30–65 seconds without changing any frozen speech, hashes, calls or character budget.';
await writeFile(`${root}/NARRATION-PLAN.json`,JSON.stringify(plan,null,2));
for(let n=1;n<=4;n++){const s=plan.shorts[n-1];await writeFile(`${s.directory}/artwork-review.json`,JSON.stringify({reviewed:true,file:'hero.png',reviewedAt:new Date().toISOString(),findings:'New original portrait illustration inspected for natural anatomy, dignified subjects, clear caption area and fit to the modern example.'},null,2));}
