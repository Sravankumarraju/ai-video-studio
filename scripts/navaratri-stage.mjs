import 'dotenv/config';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const mode=process.argv[2]||'status',selection=process.argv.slice(3);
assert(['prepare','media','voice','finish','assemble','draft','full','download','status'].includes(mode));
const plan=JSON.parse(await readFile('data/productions/divine-wisdom/devi-navaratri-2026/production-plan.json','utf8'));
for(const video of plan.videos.filter(v=>!selection.length||selection.includes(v.slug))){
 console.log(JSON.stringify({slug:video.slug,stage:mode}));
 execFileSync(process.execPath,['scripts/divine-long-episode.mjs',video.dir,mode],{stdio:'inherit',env:process.env});
}
