import 'dotenv/config';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {googleRequest,youtubeStatus} from '../lib/youtube';
import {db} from '../lib/db';
async function main(){
 const playlistId=process.argv[2];assert(playlistId&&/^[A-Za-z0-9_-]+$/.test(playlistId));
 const expectedChannelId='UCZCidygC9i89ye1PEI_nh2Q';
 const channel=await youtubeStatus();assert.equal(channel.channelId,expectedChannelId);
 async function get(resource:string,params:Record<string,string>){const r=await googleRequest(`https://www.googleapis.com/youtube/v3/${resource}?${new URLSearchParams(params)}`,{},expectedChannelId);assert(r.ok,`YouTube ${resource} verification failed (${r.status})`);return r.json();}
 const playlist=(await get('playlists',{part:'snippet,status',id:playlistId})).items?.[0];assert(playlist);assert.equal(playlist.snippet.channelId,channel.channelId);assert.equal(playlist.status.privacyStatus,'private');
 const items:any[]=[];let pageToken='';do{const response=await get('playlistItems',{part:'snippet,contentDetails',playlistId,maxResults:'50',...(pageToken?{pageToken}:{})});items.push(...response.items);pageToken=response.nextPageToken||'';}while(pageToken);
 const videoIds=items.map(i=>i.contentDetails.videoId);
 const videos=videoIds.length?(await get('videos',{part:'snippet,status,processingDetails',id:videoIds.join(',')})).items:[];
 assert.equal(new Set(videoIds).size,videoIds.length,'Duplicate playlist videos');
 assert.equal(videos.length,videoIds.length,'Every playlist video must be readable by its owner');
 const result={playlistId,title:playlist.snippet.title,privacyStatus:playlist.status.privacyStatus,url:`https://www.youtube.com/playlist?list=${playlistId}`,verifiedAt:new Date().toISOString(),videos:videos.map((v:any)=>({videoId:v.id,title:v.snippet.title,privacyStatus:v.status.privacyStatus,processingStatus:v.processingDetails?.processingStatus})),positions:items.map(i=>({videoId:i.contentDetails.videoId,position:i.snippet.position}))};
 assert(result.videos.every((v:any)=>v.privacyStatus==='private'));
 await writeFile(process.argv[3]||'data/productions/divine-wisdom/youtube-playlist-verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
