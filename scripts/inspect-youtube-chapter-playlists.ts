import 'dotenv/config';
import {googleRequest,youtubeStatus} from '../lib/youtube';
import {db} from '../lib/db';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
async function main(){
 const channel=await youtubeStatus();assert(channel.channelId==='UCZCidygC9i89ye1PEI_nh2Q');
 async function all(resource:string,params:Record<string,string>){const rows:any[]=[];let pageToken='';do{const r=await googleRequest(`https://www.googleapis.com/youtube/v3/${resource}?${new URLSearchParams({...params,maxResults:'50',...(pageToken?{pageToken}:{})})}`,{},channel.channelId);assert(r.ok,`YouTube ${resource}: ${r.status}`);const data=await r.json();rows.push(...data.items);pageToken=data.nextPageToken||'';}while(pageToken);return rows;}
 const playlists=await all('playlists',{part:'snippet,status,contentDetails',mine:'true'});
 const result=[];for(const p of playlists){const items=await all('playlistItems',{part:'snippet,contentDetails',playlistId:p.id});result.push({id:p.id,title:p.snippet.title,privacy:p.status.privacyStatus,items:items.map(i=>({itemId:i.id,videoId:i.contentDetails.videoId,title:i.snippet.title,position:i.snippet.position}))});}
 await writeFile('data/productions/divine-wisdom/YOUTUBE_PLAYLIST_INVENTORY.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
