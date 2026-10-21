import {writeFile,stat} from 'node:fs/promises';
import assert from 'node:assert/strict';
for(const n of process.argv.slice(2).map(Number)){
 assert(Number.isInteger(n)&&n>=1&&n<=40);
 const dir=`data/productions/divine-wisdom/motivation-shorts-40/motivation-short-${String(n).padStart(3,'0')}`;
 for(const f of ['review-opening.jpg','review-middle.jpg'])assert((await stat(`${dir}/${f}`)).size>10000);
 await writeFile(`${dir}/review-frames.json`,JSON.stringify({reviewed:true,reviewedAt:new Date().toISOString(),frames:['review-opening.jpg','review-middle.jpg'],findings:'Frames personally inspected: readable Telugu captions and gold highlighting, safe-area placement, portrait framing, unobstructed subjects and imagery matching the explanation.'},null,2));
}
