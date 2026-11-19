import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile, writeFile, stat, open} from 'node:fs/promises';
import path from 'node:path';
import {setDefaultResultOrder} from 'node:dns';
import {request as httpsRequest, Agent} from 'node:https';
import {db} from '../lib/db';
import {googleRequest, youtubeStatus, youtubeToken} from '../lib/youtube';
import {encrypt, decrypt} from '../lib/security';
import {privateVideoMetadata, validUploadSession, acknowledgedOffset, uploadMetadata} from '../lib/youtube-policy';
setDefaultResultOrder('ipv4first');

const root='data/productions/divine-wisdom';
const selection=process.argv.find(v=>v.startsWith('--selection='))?.split('=')[1];
assert(!selection||/^(chapter-[789]|chapter-10|shorts-[0-3])$/.test(selection),'Invalid batch selection');
const suffix=(selection?`_${selection}`:'')+(process.argv.includes('--only-final')?'_final':'');
const progressFile=`${root}/TEN_SHORTS_UPLOAD_PROGRESS_2026-10-23${suffix}.json`;
const channelId='UCZCidygC9i89ye1PEI_nh2Q';
const json=async(p:string)=>JSON.parse((await readFile(p,'utf8')).replace(/^\uFEFF/,''));
async function safeError(r:Response){const b=await r.json().catch(()=>({}));return `YouTube HTTP ${r.status}: ${(b.error?.errors||[]).map((e:any)=>e.reason).filter((s:any)=>typeof s==='string'&&/^[\w-]+$/.test(s)).join(',')||'request_rejected'}`;}
async function request(resource:string,params:Record<string,string>){const r=await googleRequest(`https://www.googleapis.com/youtube/v3/${resource}?${new URLSearchParams(params)}`,{},channelId);if(!r.ok)throw Error(await safeError(r));return r.json();}
async function all(resource:string,params:Record<string,string>){const rows:any[]=[];let token='';do{const p=await request(resource,{...params,maxResults:'50',...(token?{pageToken:token}:{})});rows.push(...(p.items||[]));token=p.nextPageToken||'';}while(token);return rows;}
const transferAgent=new Agent({keepAlive:true,maxSockets:1,family:4});
async function transfer(url:string,init:RequestInit){
 validUploadSession(url);
 const send=async(force:boolean)=>{
  const token=await youtubeToken(force,channelId);
  return new Promise<Response>((resolve,reject)=>{
   const req=httpsRequest(url,{method:init.method,agent:transferAgent,headers:{...init.headers,Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(300000)},res=>{
    const chunks:Buffer[]=[];res.on('data',b=>chunks.push(b));res.on('error',reject);res.on('end',()=>{
     const headers=new Headers();for(const [key,value] of Object.entries(res.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(', '):value);
     const body=Buffer.concat(chunks);resolve(new Response(body.length?body:null,{status:res.statusCode,headers}));
    });
   });
   req.on('error',reject);req.end(init.body||undefined);
  });
 };
 const r=await send(false);return r.status===401?send(true):r;
}

async function main(){
 const connection=await youtubeStatus();assert(connection.connected&&connection.channelId===channelId,'Expected Divine Wisdom Telugu');
 const channel=(await request('channels',{part:'snippet,contentDetails',mine:'true'})).items.find((v:any)=>v.id===channelId);assert(channel,'Channel ownership mismatch');
 const items=await all('playlistItems',{part:'contentDetails',playlistId:channel.contentDetails.relatedPlaylists.uploads});
 const live:any[]=[];for(let i=0;i<items.length;i+=50){const p=await request('videos',{part:'snippet,status,processingDetails,contentDetails',id:items.slice(i,i+50).map((v:any)=>v.contentDetails.videoId).join(',')});live.push(...p.items);}
 const playlists=await all('playlists',{part:'snippet,status',mine:'true'});
 const chapterPlaylist=playlists.filter((p:any)=>/chapter|అధ్యాయ/i.test(p.snippet.title)&&!/short/i.test(p.snippet.title));
 const shortsPlaylist=playlists.filter((p:any)=>/short/i.test(p.snippet.title)&&/gita|గీత/i.test(p.snippet.title));

 const shortPlan=await json('.tmp/ten-pending-shorts-plan-20261023.json');assert.equal(shortPlan.videos.length,10);
 let progress:any;
 try{progress=await json(progressFile);}catch(e:any){if(e.code!=='ENOENT')throw e;progress={channelId,authorizedBy:'User requested uploading ten pending Shorts and scheduling them using the existing Tuesday, Thursday, Sunday 19:00 IST pattern',createdAt:new Date().toISOString(),videos:[]};}
 assert.equal(progress.channelId,channelId);
 const save=()=>writeFile(progressFile,JSON.stringify(progress,null,2));
 let entries=shortPlan.videos.map((v:any)=>({...v,kind:'short',metadata:{title:v.title,description:v.description,tags:v.tags}}));
 if(selection?.startsWith('chapter-'))entries=entries.filter(e=>e.id===selection);
 if(selection?.startsWith('shorts-'))entries=entries.filter(e=>e.kind==='short').filter((_,i)=>i%4===Number(selection.slice(-1)));
 if(process.argv.includes('--only-final'))entries=entries.filter(e=>e.id==='motivation-short-015');
 const occupied=new Set(live.filter(v=>v.status.publishAt).map(v=>Date.parse(v.status.publishAt)));
 for(const e of entries){
  const bytes=(await stat(e.file)).size;assert.equal(bytes,e.bytes,`File changed: ${e.id}`);uploadMetadata.parse(e.metadata);
  let row=progress.videos.find((r:any)=>r.id===e.id);
  if(!row){row={id:e.id,kind:e.kind,file:e.file,totalBytes:bytes,metadata:e.metadata,publishAt:e.publishAt,thumbnail:e.thumbnail||null,state:'prepared',bytesUploaded:0};progress.videos.push(row);}
  row.thumbnail=e.thumbnail;
  const matches=live.filter(v=>v.snippet.title===e.metadata.title);assert(matches.length<=1,`Duplicate titles require review: ${e.id}`);
  if(!row.videoId&&!row.encryptedSession&&matches.length){row.videoId=matches[0].id;row.state='existing';}
  const existing=live.find(v=>v.id===row.videoId);
  if(existing?.status.privacyStatus==='public'){row.state='already_public';row.processing=existing.processingDetails?.processingStatus;row.url=`https://www.youtube.com/watch?v=${row.videoId}`;continue;}
  if(existing?.status.publishAt)row.publishAt=existing.status.publishAt;
  else if(!row.videoId){let d=new Date(row.publishAt);while(occupied.has(d.getTime())){d.setUTCDate(d.getUTCDate()+1);while(!(e.kind==='chapter'?[6]:[0,2,4]).includes(d.getUTCDay()))d.setUTCDate(d.getUTCDate()+1);}row.publishAt=d.toISOString();occupied.add(d.getTime());}
  assert(Date.parse(row.publishAt)>Date.now(),`Past release date: ${row.id}`);
  const candidates=e.kind==='chapter'?chapterPlaylist:shortsPlaylist;
  if(candidates.length===1)row.playlistId=candidates[0].id;
 }
 progress.liveCheckedAt=new Date().toISOString();progress.liveTotal=live.length;
 progress.channelTitle=channel.snippet.title;
 await save();
 await writeFile(`${root}/TEN_SHORTS_LIVE_PREFLIGHT_2026-10-23.json`,JSON.stringify({checkedAt:progress.liveCheckedAt,channel:channel.snippet.title,videos:live.map(v=>({id:v.id,title:v.snippet.title,privacy:v.status.privacyStatus,publishAt:v.status.publishAt||null,processing:v.processingDetails?.processingStatus,duration:v.contentDetails.duration})),playlists:playlists.map(p=>({id:p.id,title:p.snippet.title}))},null,2));
 console.log(JSON.stringify({channel:channel.snippet.title,liveVideos:live.length,selection,entries:progress.videos.map((r:any)=>({id:r.id,state:r.state,videoId:r.videoId,publishAt:r.publishAt}))}));
 if(process.argv.includes('--check'))return;
 const limitArg=process.argv.find(v=>v.startsWith('--limit='));const limit=limitArg?Number(limitArg.split('=')[1]):Infinity;let done=0;
 for(const row of progress.videos){
  if(process.argv.includes('--exclude-final')&&row.id==='motivation-short-015')continue;
  if(row.state==='already_public')continue;
  if(done>=limit)break;
  if(!row.videoId){
   if(!row.encryptedSession){
    assert(row.state==='prepared',`Uncertain session creation for ${row.id}; manual review required`);
    row.state='session_creation_started';await save();
    const r=await googleRequest('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status&notifySubscribers=false',{method:'POST',headers:{'Content-Type':'application/json','X-Upload-Content-Type':'video/mp4','X-Upload-Content-Length':String(row.totalBytes)},body:JSON.stringify(privateVideoMetadata(row.metadata))},channelId);
    if(!r.ok){row.state='session_rejected';row.error=await safeError(r);await save();throw Error(`${row.id}: ${row.error}`);}
    const location=r.headers.get('location');assert(location,'Missing session acknowledgement');row.encryptedSession=encrypt(validUploadSession(location));row.state='uploading';await save();
   }
   const session=validUploadSession(decrypt(row.encryptedSession));
   async function accept(r:Response){if(r.status===308){row.bytesUploaded=acknowledgedOffset(r.headers.get('range'),row.totalBytes);}else if(r.ok){const v=await r.json();assert(v.id);row.videoId=v.id;row.bytesUploaded=row.totalBytes;row.state='uploaded';row.uploadedAt=new Date().toISOString();}else{row.error=await safeError(r);await save();throw Error(`${row.id}: ${row.error}`);}await save();}
   await accept(await transfer(session,{method:'PUT',headers:{'Content-Length':'0','Content-Range':`bytes */${row.totalBytes}`}}));
   const file=await open(row.file,'r');try{let lastPercent=-1;while(!row.videoId){const start=row.bytesUploaded;const size=Math.min(1024*1024,row.totalBytes-start);assert(size>0,'No upload completion acknowledgement');const bytes=Buffer.alloc(size);assert.equal((await file.read(bytes,0,size,start)).bytesRead,size);await accept(await transfer(session,{method:'PUT',headers:{'Content-Type':'video/mp4','Content-Length':String(size),'Content-Range':`bytes ${start}-${start+size-1}/${row.totalBytes}`},body:bytes}));assert(row.videoId||row.bytesUploaded>start,'Offset did not advance');const percent=Math.floor(row.bytesUploaded/row.totalBytes*100);if(percent>=lastPercent+10||row.videoId){console.log(JSON.stringify({id:row.id,percent,videoId:row.videoId}));lastPercent=percent;}}}finally{await file.close();}
  }
  if(row.thumbnail&&!row.thumbnailApplied){const bytes=await readFile(row.thumbnail);assert(bytes.length<2*1024*1024);const r=await googleRequest(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${row.videoId}&uploadType=media`,{method:'POST',headers:{'Content-Type':row.thumbnail.endsWith('.png')?'image/png':'image/jpeg'},body:bytes},channelId);if(r.ok)row.thumbnailApplied=true;else row.thumbnailError=await safeError(r);await save();}
  let v=(await request('videos',{part:'snippet,status,processingDetails',id:row.videoId})).items?.[0];assert(v&&v.snippet.channelId===channelId,'Uploaded video ownership verification failed');assert.equal(v.snippet.title,row.metadata.title);assert.equal(v.snippet.description,row.metadata.description);
  row.processing=v.processingDetails?.processingStatus;assert(!['failed','terminated'].includes(row.processing),'Video processing failed');
  if(v.status.privacyStatus==='public'){row.state='already_public';await save();continue;}
  if(v.status.publishAt){row.publishAt=v.status.publishAt;}
  else {assert.equal(v.status.privacyStatus,'private','Unexpected visibility; do not change it');const status={...v.status,privacyStatus:'private',publishAt:row.publishAt};for(const k of ['uploadStatus','failureReason','rejectionReason','madeForKids'])delete status[k];const r=await googleRequest('https://www.googleapis.com/youtube/v3/videos?part=status',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:row.videoId,status})},channelId);if(!r.ok){row.state='uploaded_schedule_failed';row.error=await safeError(r);await save();throw Error(`${row.id}: ${row.error}`);}}
  for(let attempt=0;attempt<6;attempt++){v=(await request('videos',{part:'status,processingDetails',id:row.videoId})).items?.[0];if(v?.status?.publishAt)break;await new Promise(resolve=>setTimeout(resolve,2000));}assert.equal(v.status.privacyStatus,'private');assert.equal(Date.parse(v.status.publishAt),Date.parse(row.publishAt),'Schedule verification failed');row.processing=v.processingDetails?.processingStatus;row.state='scheduled';row.verifiedAt=new Date().toISOString();row.url=`https://www.youtube.com/watch?v=${row.videoId}`;await save();
  if(row.playlistId&&!row.playlistApplied){const contents=await all('playlistItems',{part:'contentDetails',playlistId:row.playlistId});if(!contents.some((i:any)=>i.contentDetails.videoId===row.videoId)){const r=await googleRequest('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({snippet:{playlistId:row.playlistId,resourceId:{kind:'youtube#video',videoId:row.videoId}}})},channelId);if(!r.ok){row.playlistError=await safeError(r);}else row.playlistApplied=true;}else row.playlistApplied=true;await save();}
  done++;console.log(JSON.stringify({id:row.id,videoId:row.videoId,state:row.state,publishAt:row.publishAt,processing:row.processing,thumbnailApplied:row.thumbnailApplied,playlistApplied:row.playlistApplied}));
 }
 await writeFile(`${root}/TEN_SHORTS_UPLOAD_RESULTS_2026-10-23${suffix}.json`,JSON.stringify({checkedAt:new Date().toISOString(),channelId,videos:progress.videos.map(({encryptedSession,...r}:any)=>r)},null,2));
 console.log(JSON.stringify({scheduled:progress.videos.filter((r:any)=>r.state==='scheduled').length,alreadyPublic:progress.videos.filter((r:any)=>r.state==='already_public').length,total:progress.videos.length}));
}
async function run(){
 for(let attempt=1;attempt<=5;attempt++){
  try{await main();return;}catch(e:any){
   const transient=e.name==='TimeoutError'||e.name==='AbortError'||e.message==='fetch failed'||/UND_ERR_|ECONNRESET|ETIMEDOUT|EAI_AGAIN/.test(e.cause?.code||e.code||'');
   if(!transient||attempt===5)throw e;
   console.log(JSON.stringify({state:'resuming_saved_session',attempt,reason:e.cause?.code||e.name}));
   await new Promise(resolve=>setTimeout(resolve,5000));
  }
 }
}
run().catch(e=>{console.error(JSON.stringify({error:String(e.message).replace(/https?:[^\s]+/g,'[URL]'),code:e.cause?.code||e.code}));process.exitCode=1;}).finally(()=>{transferAgent.destroy();return db.$disconnect();});
