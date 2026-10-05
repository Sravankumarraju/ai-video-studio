import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import {sessionToken} from '../lib/security';
import assert from 'node:assert/strict';
async function main(){
 const origin=process.env.APP_ORIGIN||'http://localhost:3000';
 const headers={Cookie:`studio_session=${sessionToken()}`,Origin:origin,'Content-Type':'application/json'};
 const records=[];
 for(const n of [7,8,9,10]){
  const dir=`data/productions/divine-wisdom/gita-1-${n}/devotional-v1`;
  const config=JSON.parse(await readFile(`${dir}/episode.json`,'utf8'));
  const r=await fetch(`${origin}/api/projects/${config.projectId}/series`,{method:'POST',headers,body:JSON.stringify({seriesId:'60823952-1e93-462e-a6bc-ce7161e85dd1'})});assert(r.ok,await r.text());
  records.push({episode:config.verseRef,projectId:config.projectId,directory:dir,status:'script-and-visuals-ready-awaiting-narration-pricing-approval',youtubePrivacy:'private',uploaded:false});
  await writeFile(`${dir}/README.md`,`# ${config.title}\n\n${config.videoTitle}\n\nScript and eight scene illustrations are persisted in Story Studio. New hero and thumbnail generated with built-in image generation; approved logo, verse background and supporting illustrations reused. Actual narration, timing, full render and private upload are pending. Exact price unavailable: new projects retain block policy until owner authorizes allow within $10 / 50 calls. No paid call succeeded for these projects yet.\n\nResume using divine-long-episode.mjs stages voice, finish, media, assemble, draft, full, download. Saved IDs prevent duplicate generations.\n\n${config.sourceNotes}\n\nSources:\n${config.sources.join('\n')}\n`);
 }
 await writeFile('data/productions/divine-wisdom/episodes-007-010-progress.json',JSON.stringify({episodes:records},null,2));
 console.log(JSON.stringify({grouped:records.length,series:'Bhagavad Gita · Telugu'}));
}
void main().catch(e=>{console.error(e.message);process.exitCode=1;});
