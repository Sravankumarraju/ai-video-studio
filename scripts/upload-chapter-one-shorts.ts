import 'dotenv/config';
import {readFile,writeFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {googleRequest,youtubeStatus} from '../lib/youtube';
import {db} from '../lib/db';

const dir='data/productions/divine-wisdom/gita-chapter-1/chapter-shorts-v1';
const channelId='UCZCidygC9i89ye1PEI_nh2Q';
const file=`${dir}/YOUTUBE_UPLOADS.json`;
async function main(){
 const channel=await youtubeStatus();assert(channel.connected&&channel.channelId===channelId,'Expected connected Divine Wisdom Telugu channel');
 const plan=JSON.parse(await readFile(`${dir}/FINAL_DELIVERY.json`,'utf8'));
 const saved=await readFile(file,'utf8').then(JSON.parse).catch(e=>{if(e.code!=='ENOENT')throw e;return {channelId,playlistId:'PLd8wODJuttZU',privacy:'private',authorization:'User: push this to youtube and create playlist for shorts',videos:[]};});
 async function get(resource:string,params:Record<string,string>){const r=await googleRequest(`https://www.googleapis.com/youtube/v3/${resource}?${new URLSearchParams(params)}`,{},channelId);if(!r.ok)throw Error(`YouTube ${resource} failed (${r.status})`);return r.json();}
 const liveChannel=(await get('channels',{part:'id,snippet,contentDetails',mine:'true'})).items?.find((c:any)=>c.id===channelId);assert(liveChannel,'Live connected channel mismatch');
 const recentItems=(await get('playlistItems',{part:'snippet,contentDetails',playlistId:liveChannel.contentDetails.relatedPlaylists.uploads,maxResults:'50'})).items||[];
 const save=()=>writeFile(file,JSON.stringify(saved,null,2));
 for(const d of plan.deliveries){
  assert(d.fullyDecoded&&d.width===1080&&d.height===1920&&d.seconds<60);await stat(d.mp4);
  const meta=JSON.parse(await readFile(`${dir}/${d.id}/publishing.json`,'utf8'));
  const title=`${d.title} | భగవద్గీత 1 #Shorts`;
  let item=saved.videos.find((x:any)=>x.id===d.id);
  if(!item){item={id:d.id,title,state:'prepared',mp4:d.mp4};saved.videos.push(item);await save();}
  if(!item.videoId){
   const match=recentItems.filter((v:any)=>v.snippet.title===title);assert(match.length<=1,'Multiple matching videos; review before uploading');
   if(match.length){item.videoId=match[0].contentDetails.videoId;item.state='recovered_existing';await save();}
   else{
    assert(item.state==='prepared','Prior upload outcome unknown; review YouTube before retrying');
    const bytes=await readFile(d.mp4);item.sha256=createHash('sha256').update(bytes).digest('hex');
    const metadata={snippet:{title,description:meta.description+'\n\nమూలం: https://www.holy-bhagavad-gita.org/chapter/1/\nఉచ్చారణ లేదా వివరణలో పొరపాటు ఉంటే సరైన మూలంతో తెలియజేయండి; పరిశీలించి సరిచేస్తాం.',tags:['Bhagavad Gita Telugu','Divine Wisdom Telugu','Arjuna','Gita Chapter 1','Shorts'],categoryId:'27',defaultLanguage:'te',defaultAudioLanguage:'te'},status:{privacyStatus:'private',selfDeclaredMadeForKids:false,containsSyntheticMedia:true}};
    assert([...title].length<=100);assert(Buffer.byteLength(metadata.snippet.description)<=5000);
    const boundary='chapter_one_shorts_'+d.id;
    const body=Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`),bytes,Buffer.from(`\r\n--${boundary}--\r\n`)]);
    item.state='upload_request_started';await save();
    const r=await googleRequest('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status&notifySubscribers=false',{method:'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body},channelId);
    if(!r.ok){item.state='upload_rejected';item.httpStatus=r.status;await save();throw Error(`Upload rejected (${r.status})`);}
    const result=await r.json();assert(result.id);item.videoId=result.id;item.state='uploaded';item.uploadedAt=new Date().toISOString();await save();
   }
  }
  const v=(await get('videos',{part:'snippet,status,processingDetails',id:item.videoId})).items?.[0];assert(v&&v.snippet.channelId===channelId&&v.status.privacyStatus==='private');
  item.url=`https://www.youtube.com/shorts/${item.videoId}`;item.privacy=v.status.privacyStatus;item.processingStatus=v.processingDetails?.processingStatus;item.syntheticMediaDeclared=v.status.containsSyntheticMedia;item.state='verified_private';item.verifiedAt=new Date().toISOString();await save();console.log(JSON.stringify(item));
 }
 console.log(JSON.stringify({playlistId:saved.playlistId,videos:saved.videos.map((v:any)=>({id:v.id,videoId:v.videoId,url:v.url,state:v.state}))}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
