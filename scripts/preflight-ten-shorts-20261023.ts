import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {setDefaultResultOrder} from 'node:dns';
import {db} from '../lib/db';
import {googleRequest,youtubeStatus} from '../lib/youtube';
setDefaultResultOrder('ipv4first');
async function main(){
 const c=await youtubeStatus();assert(c.connected&&c.channelId==='UCZCidygC9i89ye1PEI_nh2Q');
 const get=async(resource:string,params:any)=>{const r=await googleRequest('https://www.googleapis.com/youtube/v3/'+resource+'?'+new URLSearchParams(params),{},c.channelId!);assert(r.ok,'YouTube read failed '+r.status);return r.json();};
 const all=async(resource:string,params:any)=>{const rows:any[]=[];let pageToken='';do{const d=await get(resource,{...params,maxResults:'50',...(pageToken?{pageToken}:{})});rows.push(...d.items);pageToken=d.nextPageToken||'';}while(pageToken);return rows;};
 const items=await all('playlistItems',{part:'contentDetails',playlistId:'UUZCidygC9i89ye1PEI_nh2Q'});const live:any[]=[];
 for(let i=0;i<items.length;i+=50)live.push(...(await get('videos',{part:'snippet,status,contentDetails,processingDetails',id:items.slice(i,i+50).map(v=>v.contentDetails.videoId).join(',')})).items);
 const plan=JSON.parse(await readFile('data/productions/divine-wisdom/motivation-shorts-40/PENDING_UPLOAD_SCHEDULE_2026-10-21.json','utf8'));
 const pending=plan.videos.filter((v:any)=>!live.some(l=>l.snippet.title===v.title));
 const summary={checkedAt:new Date().toISOString(),cadence:plan.cadence,live:live.map(v=>({id:v.id,title:v.snippet.title,publishAt:v.status.publishAt,privacy:v.status.privacyStatus,duration:v.contentDetails.duration})),pending};
 await writeFile('.tmp/ten-shorts-live-preflight-20261023.json',JSON.stringify(summary,null,2));
 console.log(JSON.stringify({cadence:plan.cadence,pendingCount:pending.length,pending:pending.map((v:any)=>({id:v.id,title:v.title,publishAt:v.publishAt})),shortSchedules:summary.live.filter(v=>v.duration.startsWith('PT')&&!v.duration.includes('H')&&(/PT\d+S$/.test(v.duration)||/^PT[12]M/.test(v.duration))).filter(v=>v.publishAt)}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
