import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {googleRequest,youtubeStatus} from '../lib/youtube';
import {db} from '../lib/db';
const root='data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12';
const title='శ్రీ లలితా సహస్రనామం | Sri Lalita Sahasranamam';
const save=(v:unknown)=>writeFile(`${root}/YOUTUBE-PLAYLIST.json`,JSON.stringify(v,null,2));
async function main(){
 const channel=await youtubeStatus();assert.equal(channel.channelId,'UCZCidygC9i89ye1PEI_nh2Q');
 const existing=[];let token='';do{const r=await googleRequest('https://www.googleapis.com/youtube/v3/playlists?'+new URLSearchParams({part:'snippet,status',mine:'true',maxResults:'50',...(token?{pageToken:token}:{})}),{},channel.channelId!);assert(r.ok);const d=await r.json();existing.push(...d.items);token=d.nextPageToken||'';}while(token);
 let playlist=existing.find(p=>p.snippet.title===title);
 if(!playlist){
  let old:any;try{old=JSON.parse(await readFile(`${root}/YOUTUBE-PLAYLIST.json`,'utf8'));}catch(e:any){if(e.code!=='ENOENT')throw e;}
  assert(!old||old.state==='explicitly_rejected','Uncertain existing creation must be checked before another POST');
  await save({state:'creation_submitted',title,visibility:'private',authorization:'User requested create playlist and upload on YouTube.'});
  const r=await googleRequest('https://www.googleapis.com/youtube/v3/playlists?part=snippet,status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({snippet:{title,description:'Sri Lalita Sahasranamam: Telugu background, complete Sanskrit recitation in Telugu script, and Telugu devotional understanding.'},status:{privacyStatus:'private'}})},channel.channelId!);
  const d=await r.json();if(!r.ok){const reasons=(d.error?.errors||[]).map((e:any)=>e.reason).filter((s:any)=>typeof s==='string'&&/^[A-Za-z_]{1,100}$/.test(s));await save({state:'explicitly_rejected',httpStatus:r.status,reasons,title,visibility:'private',note:'Stored upload/read-only OAuth scopes may not allow playlist creation. No permissions were expanded.'});console.log(JSON.stringify({state:'explicitly_rejected',httpStatus:r.status,reasons}));return;}playlist=d;
 }
 const report:any={state:'created',playlistId:playlist.id,title:playlist.snippet.title,visibility:playlist.status.privacyStatus,url:`https://www.youtube.com/playlist?list=${playlist.id}`};
 await save(report);
 const upload=JSON.parse(await readFile(`${root}/video-01-background/word-highlight-v2/YOUTUBE_UPLOAD.json`,'utf8'));
 assert.equal(upload.channelId,channel.channelId);
 const videoId=upload.videoId;assert(/^[A-Za-z0-9_-]{11}$/.test(videoId));
 const listUrl='https://www.googleapis.com/youtube/v3/playlistItems?'+new URLSearchParams({part:'snippet',playlistId:playlist.id,videoId,maxResults:'50'});
 async function membership(){const r=await googleRequest(listUrl,{},channel.channelId!);assert(r.ok,'Could not verify playlist membership');return (await r.json()).items?.find((i:any)=>i.snippet.resourceId.videoId===videoId);}
 let item=await membership();
 if(!item){
  const r=await googleRequest('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({snippet:{playlistId:playlist.id,position:0,resourceId:{kind:'youtube#video',videoId}}})},channel.channelId!);
  if(!r.ok){report.membershipState='rejected';report.httpStatus=r.status;await save(report);throw Error('Playlist membership rejected');}
  item=await r.json();
 }
 assert(await membership(),'Playlist membership not confirmed');
 report.state='completed';report.videoId=videoId;report.playlistItemId=item.id;report.membershipVerified=true;await save(report);console.log(JSON.stringify(report));
}
main().catch(()=>{console.error('Playlist stage stopped; saved state retained, credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
