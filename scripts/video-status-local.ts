import 'dotenv/config';
import {writeFile} from 'node:fs/promises';
import {googleRequest} from '../lib/youtube';
import {db} from '../lib/db';
async function main(){
 const channelId='UCZCidygC9i89ye1PEI_nh2Q';
 async function get(resource:string,params:Record<string,string>){const r=await googleRequest('https://www.googleapis.com/youtube/v3/'+resource+'?'+new URLSearchParams(params),{},channelId);if(!r.ok)throw Error(resource+' HTTP '+r.status);return r.json();}
 const channel=(await get('channels',{part:'snippet,contentDetails',id:channelId})).items[0];
 const ids:string[]=[];let pageToken='';do{const page=await get('playlistItems',{part:'contentDetails',playlistId:channel.contentDetails.relatedPlaylists.uploads,maxResults:'50',...(pageToken?{pageToken}:{})});ids.push(...page.items.map((i:any)=>i.contentDetails.videoId));pageToken=page.nextPageToken||'';}while(pageToken);
 const uniqueIds=[...new Set([...ids,'_V7fZnMxddM','5S0DDNdCQCA','8IhxLOpdfw0'])];
 const videos:any[]=[];for(let i=0;i<uniqueIds.length;i+=50){const page=await get('videos',{part:'snippet,status,contentDetails,processingDetails',id:uniqueIds.slice(i,i+50).join(',')});videos.push(...page.items.map((v:any)=>({id:v.id,title:v.snippet.title,privacy:v.status.privacyStatus,publishAt:v.status.publishAt||null,duration:v.contentDetails.duration,processing:v.processingDetails?.processingStatus})));}
 const result={checkedAt:new Date().toISOString(),channel:channel.snippet.title,total:videos.length,public:videos.filter(v=>v.privacy==='public').length,private:videos.filter(v=>v.privacy==='private').length,scheduled:videos.filter(v=>v.publishAt).length,videos};
 await writeFile('data/productions/divine-wisdom/VIDEO_STATUS_LIVE_2026-10-08.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
