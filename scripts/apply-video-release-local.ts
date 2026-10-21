import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {googleRequest} from '../lib/youtube';
import {db} from '../lib/db';
async function main(){
 const path=process.argv[2];assert(path);const plan=JSON.parse((await readFile(path,'utf8')).replace(/^\uFEFF/,''));const channelId='UCZCidygC9i89ye1PEI_nh2Q';
 for(const e of plan.videos){
  const read=await googleRequest('https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id='+e.videoId,{},channelId);assert(read.ok);const v=(await read.json()).items?.[0];assert(v&&v.snippet.channelId===channelId);assert.equal(v.status.privacyStatus,'private');assert(!v.status.publishAt||v.status.publishAt===e.publishAt||e.allowReschedule,'Existing schedule differs');
  if(v.status.publishAt!==e.publishAt){const status:any={privacyStatus:'private',publishAt:e.publishAt};for(const k of ['selfDeclaredMadeForKids','containsSyntheticMedia','embeddable','publicStatsViewable','license'])if(v.status[k]!==undefined)status[k]=v.status[k];const update=await googleRequest('https://www.googleapis.com/youtube/v3/videos?part=status',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:v.id,status})},channelId);if(!update.ok){const b=await update.json();throw Error('Schedule HTTP '+update.status+' '+(b.error?.errors?.[0]?.reason||''));}}
  const verify=await googleRequest('https://www.googleapis.com/youtube/v3/videos?part=status&id='+e.videoId,{},channelId);assert(verify.ok);const status=(await verify.json()).items?.[0]?.status;assert.equal(status.privacyStatus,'private');assert.equal(status.publishAt,e.publishAt);e.verifiedAt=new Date().toISOString();e.state='scheduled';await writeFile(path,JSON.stringify(plan,null,2));console.log(JSON.stringify({id:e.videoId,publishAt:e.publishAt,state:e.state}));
 }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
