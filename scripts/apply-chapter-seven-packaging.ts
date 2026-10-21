import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {googleRequest} from '../lib/youtube';
import {db} from '../lib/db';
const channelId='UCZCidygC9i89ye1PEI_nh2Q',videoId='QnX7ywUwHp4',playlistId='PLf479MIAg730';
const dir='data/productions/divine-wisdom/gita-chapter-7/story-v1';
const thumbnail=path.resolve(`${dir}/thumbnail-created-2026-10-21.jpg`),reportFile=`${dir}/PACKAGING_APPLIED_2026-10-21.json`;
async function get(resource:string,params:Record<string,string>){const r=await googleRequest(`https://www.googleapis.com/youtube/v3/${resource}?${new URLSearchParams(params)}`,{},channelId);assert(r.ok,`Read HTTP ${r.status}`);return r.json();}
async function main(){
 const v=(await get('videos',{part:'snippet,status',id:videoId})).items?.[0];assert(v?.snippet.channelId===channelId&&v.snippet.title.includes('అధ్యాయం 7'),'Chapter 7 ownership mismatch');
 const p=(await get('playlists',{part:'snippet',id:playlistId})).items?.[0];assert(p?.snippet.channelId===channelId&&p.snippet.title.includes('పూర్తి అధ్యాయాలు'),'Full-chapters playlist ownership mismatch');
 let report:any={videoId,channelId,playlistId,playlistTitle:p.snippet.title,thumbnailFile:thumbnail};
 try{const old=JSON.parse(await readFile(reportFile,'utf8'));assert.equal(old.videoId,videoId);report={...report,...old};}catch(e:any){if(e.code!=='ENOENT')throw e;}
 const save=()=>writeFile(reportFile,JSON.stringify(report,null,2));
 let items=(await get('playlistItems',{part:'contentDetails',playlistId,videoId,maxResults:'50'})).items||[];
 if(!items.some((i:any)=>i.contentDetails.videoId===videoId)){
  const r=await googleRequest('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({snippet:{playlistId,resourceId:{kind:'youtube#video',videoId}}})},channelId);assert(r.ok,`Playlist assignment HTTP ${r.status}`);
 }
 items=(await get('playlistItems',{part:'contentDetails',playlistId,videoId,maxResults:'50'})).items||[];assert(items.some((i:any)=>i.contentDetails.videoId===videoId),'Playlist verification failed');report.playlistApplied=true;report.playlistVerifiedAt=new Date().toISOString();await save();
 if(!report.thumbnailApplied){const bytes=await readFile(thumbnail);assert(bytes.length<2*1024*1024);const r=await googleRequest(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}&uploadType=media`,{method:'POST',headers:{'Content-Type':'image/jpeg'},body:bytes},channelId);assert(r.ok,`Thumbnail application HTTP ${r.status}`);const response=await r.json();report.thumbnailApplied=true;report.thumbnailAppliedAt=new Date().toISOString();report.thumbnailResponse=response.items;await save();}
 console.log(JSON.stringify({videoId,thumbnailApplied:report.thumbnailApplied,playlistApplied:report.playlistApplied,playlistTitle:report.playlistTitle}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
