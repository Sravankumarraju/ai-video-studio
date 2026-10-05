import 'dotenv/config';
import {readFile} from 'node:fs/promises';
import {sessionToken} from '../lib/security';
import assert from 'node:assert/strict';
async function main(){
 const config=JSON.parse(await readFile(`${process.argv[2]}/episode.json`,'utf8'));
 const origin=process.env.APP_ORIGIN||'http://localhost:3000';
 const r=await fetch(`${origin}/api/projects/${config.projectId}/series`,{method:'POST',headers:{Cookie:`studio_session=${sessionToken()}`,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({seriesId:'60823952-1e93-462e-a6bc-ce7161e85dd1'})});assert(r.ok);console.log('Project added to existing Bhagavad Gita Telugu series.');
}
main().catch(()=>{console.error('Series grouping failed; sensitive details suppressed');process.exitCode=1;});
