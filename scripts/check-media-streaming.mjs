import 'dotenv/config';
import { createHmac } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir='data/productions/divine-wisdom/gita-chapter-1/story-v4';
const state=JSON.parse(await readFile(`${dir}/state.json`,'utf8'));
const url=`http://localhost:3000/api/jobs/${state.renderJobs.full}/download`;
const exp=String(Date.now()+3600000);
const cookie=`studio_session=${exp}.${createHmac('sha256',process.env.SESSION_SECRET).update(exp).digest('hex')}`;
const samples=[];
const size=1060761608;
for(const range of ['bytes=0-1023','bytes=530000000-530001023','bytes=-1024']){
 const began=Date.now();const r=await fetch(url,{headers:{cookie,range},signal:AbortSignal.timeout(15000)});
 const bytes=(await r.arrayBuffer()).byteLength;assert.equal(r.status,206);assert.equal(bytes,1024);
 assert.equal(r.headers.get('content-length'),'1024');assert(r.headers.get('content-range').endsWith('/'+size));
 samples.push({range,status:r.status,bytes,milliseconds:Date.now()-began});
}
const invalid=await fetch(url,{headers:{cookie,range:`bytes=${size}-`}});assert.equal(invalid.status,416);
const unauthenticated=await fetch(url,{headers:{range:'bytes=0-1023'}});assert.equal(unauthenticated.status,401);
const result={renderJobId:state.renderJobs.full,samples,invalidStatus:invalid.status,unauthenticatedStatus:unauthenticated.status};
await writeFile(`${dir}/streaming-verification.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
