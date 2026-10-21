import 'dotenv/config';
import {readFile,writeFile,stat,open} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {googleRequest,youtubeStatus} from '../lib/youtube';
import {encrypt,decrypt} from '../lib/security';
import {db} from '../lib/db';
const root='data/productions/divine-wisdom';
const progressFile=`${root}/CHAPTERS_5_6_AND_QUESTION_SHORTS_UPLOADS.json`;
const channelId='UCZCidygC9i89ye1PEI_nh2Q';
const json=async(f:string)=>JSON.parse((await readFile(f,'utf8')).replace(/^\uFEFF/,''));
async function main(){
 assert.equal((await youtubeStatus()).channelId,channelId);
 async function get(resource:string,params:Record<string,string>){const r=await googleRequest(`https://www.googleapis.com/youtube/v3/${resource}?${new URLSearchParams(params)}`,{},channelId);assert(r.ok,`YouTube ${resource}: ${r.status}`);return r.json();}
 const channel=(await get('channels',{part:'contentDetails',mine:'true'})).items.find((c:any)=>c.id===channelId);assert(channel);
 const recent=(await get('playlistItems',{part:'snippet,contentDetails',playlistId:channel.contentDetails.relatedPlaylists.uploads,maxResults:'50'})).items;
 const entries:any[]=[];
 // Small Shorts first; chapter uploads then use resumable 8 MiB chunks.
 const shorts=await json(`${root}/question-shorts-week-01/FINAL_DELIVERY.json`);
 for(const s of shorts.deliveries){assert(s.fullFileDecoded&&s.framesReviewed&&s.browserStartMiddleEnd);const dir=`${root}/question-shorts-week-01/${s.id}`;const p=await json(`${dir}/publishing.json`);entries.push({id:s.id,kind:'question-short',dir,mp4:s.mp4,title:p.titles[0],description:p.description,tags:p.tags,playlistId:'PLd8wODJuttZU'});}
 for(const n of [5,6]){const dir=`${root}/gita-chapter-${n}/story-v1`,d=await json(`${dir}/FINAL_DELIVERY.json`),m=await json(`${dir}/youtube-private-batch.json`);assert(d.entireFileDecoded&&d.browserStartMiddleEndVerified&&d.allVerseMeaningsCovered);entries.push({id:`chapter-${n}`,kind:'chapter',dir,mp4:resolve(`${dir}/gita-chapter-${n}-full.mp4`),thumbnail:`${dir}/thumbnail-upload.jpg`,...m.videos[0].metadata,playlistId:'PLf479MIAg730'});}
 const saved=await json(progressFile).catch(e=>{if(e.code!=='ENOENT')throw e;return {channelId,privacy:'private',authorizedBy:'User: Full Chapters 1–6 upload all videos, and Question Shorts in shorts playlist',videos:[]};});
 const save=()=>writeFile(progressFile,JSON.stringify(saved,null,2));
 for(const e of entries){
  const info=await stat(e.mp4);assert(info.size>0);assert([...e.title].length<=100);assert(Buffer.byteLength(e.description)<=5000);
  let row=saved.videos.find((x:any)=>x.id===e.id);if(!row){row={id:e.id,kind:e.kind,title:e.title,playlistId:e.playlistId,mp4:e.mp4,totalBytes:info.size,state:'prepared'};saved.videos.push(row);await save();}
  if(!row.videoId){
   const match=recent.filter((v:any)=>v.snippet.title===e.title);assert(match.length<=1,'Duplicate title found; manual review needed');
   if(match.length){row.videoId=match[0].contentDetails.videoId;row.state='existing';await save();}
  }
  if(!row.videoId){
   if(!row.encryptedSession){
    assert(row.state==='prepared','Session creation outcome uncertain; review before retrying');
    row.state='session_creation_started';await save();
    const metadata={snippet:{title:e.title,description:e.description,tags:e.tags||['Bhagavad Gita Telugu','Divine Wisdom Telugu','Shorts'],categoryId:'27',defaultLanguage:'te',defaultAudioLanguage:'te'},status:{privacyStatus:'private',selfDeclaredMadeForKids:false,containsSyntheticMedia:true}};
    const r=await googleRequest('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status&notifySubscribers=false',{method:'POST',headers:{'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Length':String(info.size),'X-Upload-Content-Type':'video/mp4'},body:JSON.stringify(metadata)},channelId);
    if(!r.ok){row.state='session_rejected';row.httpStatus=r.status;await save();throw Error(`Session rejected (${r.status})`);}
    const url=r.headers.get('location');assert(url);assert.equal(new URL(url).hostname,'www.googleapis.com');row.encryptedSession=encrypt(url);row.bytesUploaded=0;row.state='uploading';await save();
   }
   const url=decrypt(row.encryptedSession);
   const checkpoint=await googleRequest(url,{method:'PUT',headers:{'Content-Length':'0','Content-Range':`bytes */${info.size}`}},channelId);
   if(checkpoint.ok){const v=await checkpoint.json();assert(v.id);row.videoId=v.id;row.state='uploaded';await save();}
   else{assert.equal(checkpoint.status,308,`Upload checkpoint failed (${checkpoint.status}); review saved session`);const range=checkpoint.headers.get('range');row.bytesUploaded=range?Number(range.match(/-(\d+)$/)?.[1])+1:0;await save();}
   const f=await open(e.mp4,'r');try{while(!row.videoId&&row.bytesUploaded<info.size){
    const start=row.bytesUploaded,length=Math.min(8*1024*1024,info.size-start),bytes=Buffer.alloc(length);const read=await f.read(bytes,0,length,start);assert.equal(read.bytesRead,length);
    const r=await googleRequest(url,{method:'PUT',headers:{'Content-Type':'video/mp4','Content-Length':String(length),'Content-Range':`bytes ${start}-${start+length-1}/${info.size}`},body:bytes},channelId);
    if(r.status===308){const range=r.headers.get('range');assert(range);row.bytesUploaded=Number(range.match(/-(\d+)$/)?.[1])+1;await save();if(row.bytesUploaded%(80*1024*1024)===0)console.log(JSON.stringify({id:e.id,percent:Math.round(row.bytesUploaded/info.size*100)}));}
    else{assert(r.ok,`Chunk upload failed (${r.status}); resume saved session`);const v=await r.json();assert(v.id);row.videoId=v.id;row.bytesUploaded=info.size;row.state='uploaded';row.uploadedAt=new Date().toISOString();await save();}
   }}finally{await f.close();}
  }
  if(e.thumbnail&&!row.thumbnailApplied){const bytes=await readFile(e.thumbnail);assert(bytes.length<2*1024*1024);const r=await googleRequest(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${row.videoId}&uploadType=media`,{method:'POST',headers:{'Content-Type':'image/jpeg'},body:bytes},channelId);assert(r.ok,`Thumbnail failed (${r.status})`);row.thumbnailApplied=true;await save();}
  const v=(await get('videos',{part:'snippet,status,processingDetails',id:row.videoId})).items[0];assert(v&&v.snippet.channelId===channelId&&v.status.privacyStatus==='private');row.privacy=v.status.privacyStatus;row.processingStatus=v.processingDetails?.processingStatus;row.url=`https://www.youtube.com/${e.kind==='chapter'?'watch?v=':'shorts/'}${row.videoId}`;row.state='verified_private';row.verifiedAt=new Date().toISOString();await save();console.log(JSON.stringify({id:row.id,title:row.title,videoId:row.videoId,url:row.url,processing:row.processingStatus}));
  await writeFile(`${e.dir}/YOUTUBE_DIRECT_UPLOAD.json`,JSON.stringify({videoId:row.videoId,url:row.url,title:row.title,state:row.state,privacy:row.privacy,processingStatus:row.processingStatus,thumbnailApplied:row.thumbnailApplied,verifiedAt:row.verifiedAt},null,2));
 }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
