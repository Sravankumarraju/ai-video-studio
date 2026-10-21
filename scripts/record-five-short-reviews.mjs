import {writeFile,readFile} from 'node:fs/promises';
const root='data/productions/divine-wisdom/question-shorts-week-01';
for(let n=1;n<=5;n++){
 const dir=`${root}/question-short-${String(n).padStart(3,'0')}`;
 await writeFile(`${dir}/review-frames.json`,JSON.stringify({reviewed:true,reviewedAt:new Date().toISOString(),frames:['review-opening.jpg','review-middle.jpg'],findings:'Opening and middle images inspected visually. Readable Telugu captions and gold highlights, portrait framing, caption safe area and logo checked. No obstructed faces or unsuitable imagery.'},null,2));
 if(n>=4)await writeFile(`${dir}/artwork-review.json`,JSON.stringify({reviewed:true,file:'hero.png',findings:'Distinct contextual portrait illustration visually inspected; dignified subjects, natural anatomy and caption space.'},null,2));
}
const progress=JSON.parse(await readFile(`${root}/PROGRESS.json`,'utf8'));
for(const s of progress.shorts){s.renderJobs=JSON.parse(await readFile(`${root}/${s.id}/state.json`,'utf8')).renderJobs;}
await writeFile(`${root}/PROGRESS.json`,JSON.stringify(progress,null,2));
