import 'dotenv/config';
import {readFile,writeFile,stat,open} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {db} from '../lib/db';
import {googleRequest,youtubeStatus,youtubeToken} from '../lib/youtube';
import https from 'node:https';
import {encrypt,decrypt} from '../lib/security';
import {privateVideoMetadata,validUploadSession,acknowledgedOffset,uploadMetadata} from '../lib/youtube-policy';
const entries=[{"kind": "shiva-1008", "root": "output/om-namah-shivaya-1008-2026-10-23/branded-v2", "file": "Om-Namah-Shivaya-1008-Divine-Wisdom-Telugu-1080p.mp4", "thumbnail": "../Om-Namah-Shivaya-1008-Thumbnail.jpg", "metadata": "upload-metadata-private", "verification": "VERIFICATION"}];
const load=async(root:string,name:string)=>JSON.parse(await readFile(`${root}/${name}.json`,'utf8'));
const save=(root:string,name:string,value:any)=>writeFile(`${root}/${name}.json`,JSON.stringify(value,null,2));
async function maybe(root:string,name:string){try{return await load(root,name);}catch(e:any){if(e.code==='ENOENT')return null;throw e;}}
const stamp=(s:number)=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
async function safeError(r:Response){const b=await r.json().catch(()=>({}));const reasons=(b.error?.errors||[]).map((e:any)=>e.reason).filter((x:any)=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(x));return `YouTube HTTP ${r.status}: ${reasons.join(', ')||'request_rejected'}`;}
const uploadAgent=new https.Agent({keepAlive:true,maxSockets:1});
async function nativeUpload(url:string,headers:Record<string,string>,body:Buffer|undefined,channelId:string):Promise<Response>{
 const bearer=await youtubeToken(false,channelId);
 return new Promise((resolve,reject)=>{
  const req=https.request(validUploadSession(url),{method:'PUT',agent:uploadAgent,headers:{...headers,Authorization:`Bearer ${bearer}`}},res=>{
   const chunks:Buffer[]=[];res.on('data',b=>chunks.push(Buffer.from(b)));res.on('error',reject);res.on('end',()=>{
    const h=new Headers();for(const [k,v] of Object.entries(res.headers)){if(v!==undefined)h.set(k,Array.isArray(v)?v.join(','):v);}
    resolve(new Response(Buffer.concat(chunks),{status:res.statusCode||500,headers:h}));
   });
  });
  req.setTimeout(90000,()=>req.destroy(Error('Upload connection timed out')));req.on('error',reject);req.end(body);
 });
}
async function main(){
 const channel=await youtubeStatus();assert(channel.connected&&channel.channelId==='UCZCidygC9i89ye1PEI_nh2Q','Connected channel must be the existing Divine Wisdom channel');
 const channelRead=await googleRequest('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',{},channel.channelId!);assert(channelRead.ok,'Cannot verify connected channel');const actual=(await channelRead.json()).items?.find((c:any)=>c.id===channel.channelId);assert(actual&&/divine\s*wisdom/i.test(actual.snippet.title),'YouTube channel verification failed');
 console.log(JSON.stringify({channel:actual.snippet.title,channelId:channel.channelId,visibility:'private',selection:'Final branded Om Namah Shivaya 1008-times video, silence removed; user requested private upload'}));
 const remoteVideos:any[]=[];let pageToken='';
 do{const r=await googleRequest('https://www.googleapis.com/youtube/v3/playlistItems?'+new URLSearchParams({part:'snippet',playlistId:'UUZCidygC9i89ye1PEI_nh2Q',maxResults:'50',...(pageToken?{pageToken}:{})}),{},channel.channelId!);assert(r.ok,'Duplicate check failed');const data=await r.json();remoteVideos.push(...data.items);pageToken=data.nextPageToken||'';}while(pageToken);
 await writeFile('.tmp/youtube-existing-20261023.json',JSON.stringify(remoteVideos.map((v:any)=>({title:v.snippet.title,videoId:v.snippet.resourceId.videoId})),null,2));
 for(const entry of entries){
  const verified=await load(entry.root,entry.verification);
  assert(verified.allSourceClipsFullDecodePassed && verified.startMiddleEndPlaybackPassed && verified.chantAudioPacketHashMatchesPreviousVersion && verified.transparentLogoAlphaVerified && verified.repetitions===1008 && verified.durationSeconds===8072, 'Verified final branded 1008-times video required');
  const info=await stat(entry.root+'/'+entry.file);assert(info.size>1000000);
  if(verified.bytes)assert.equal(info.size,verified.bytes);
  const metadata=uploadMetadata.parse(await load(entry.root,entry.metadata));
  console.log(JSON.stringify({kind:entry.kind,title:metadata.title,bytes:info.size,descriptionBytes:Buffer.byteLength(metadata.description)}));
  if(process.argv[2]==='check')continue;
  const duplicate=remoteVideos.find((v:any)=>v.snippet?.title===metadata.title);
  if(duplicate && !(await maybe(entry.root,'youtube-local-upload'))){console.log(JSON.stringify({kind:entry.kind,alreadyUploaded:true,videoId:duplicate.snippet.resourceId.videoId}));continue;}
  let state=await maybe(entry.root,'youtube-local-upload');
  if(!state){state={state:'prepared',kind:entry.kind,file:entry.file,channelId:channel.channelId,channelTitle:actual.snippet.title,totalBytes:info.size,bytesUploaded:0,metadata,visibility:'private',authorization:'User explicitly requested uploading the completed branded Om Namah Shivaya 1008-times video to YouTube as PRIVATE in this chat, October 23, 2026',createdAt:new Date().toISOString()};await save(entry.root,'youtube-local-upload',state);}
  assert(state.channelId===channel.channelId&&state.totalBytes===info.size,'Upload identity changed; preserve the saved session');
  const persist=()=>save(entry.root,'youtube-local-upload',state);
  if(!state.videoId){
   if(!state.encryptedSession){
    assert(state.state==='prepared','Existing session attempt must be reviewed before another POST');state.state='session-submitted';await persist();
    let r:Response;try{const body=privateVideoMetadata(state.metadata);body.snippet.categoryId='10';body.snippet.defaultLanguage='en';body.snippet.defaultAudioLanguage='sa';r=await googleRequest('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status&notifySubscribers=false',{method:'POST',headers:{'Content-Type':'application/json','X-Upload-Content-Type':'video/mp4','X-Upload-Content-Length':String(info.size)},body:JSON.stringify(body)},channel.channelId!);}catch{state.state='needs-review';state.error='Session acknowledgement lost; no automatic duplicate creation';await persist();throw Error(state.error);}
    if(!r.ok){state.state=r.status>=500?'needs-review':'rejected';state.error=await safeError(r);await persist();console.log(JSON.stringify({kind:entry.kind,state:state.state,error:state.error}));continue;}
    const location=r.headers.get('location');assert(location,'Missing upload session acknowledgement');state.encryptedSession=encrypt(validUploadSession(location));state.state='uploading';await persist();
   }
   const session=validUploadSession(decrypt(state.encryptedSession));
   async function accept(r:Response){
    if(r.status===308){state.bytesUploaded=acknowledgedOffset(r.headers.get('range'),info.size);await persist();return;}
    if(r.ok){const body=await r.json();assert(typeof body.id==='string'&&/^[A-Za-z0-9_-]+$/.test(body.id));state.videoId=body.id;state.bytesUploaded=info.size;state.state='uploaded';state.uploadedAt=new Date().toISOString();await persist();return;}
    state.error=await safeError(r);await persist();throw Error(state.error);
   }
   await accept(await nativeUpload(session,{'Content-Length':'0','Content-Range':`bytes */${info.size}`},undefined,channel.channelId!));
   const file=await open(`${entry.root}/${entry.file}`,'r');
   let chunkBytes=4*1024*1024;let stalledAttempts=0;
   try{while(!state.videoId&&state.bytesUploaded<info.size){
    const offset=state.bytesUploaded;const size=Math.min(chunkBytes,info.size-offset);const bytes=Buffer.alloc(size);
    assert.equal((await file.read(bytes,0,size,offset)).bytesRead,size);const chunkStarted=Date.now();
    try{
     await accept(await nativeUpload(session,{'Content-Type':'video/mp4','Content-Length':String(size),'Content-Range':`bytes ${offset}-${offset+size-1}/${info.size}`},bytes,channel.channelId!));
    }catch(error){
     // Ask the same resumable session what Google received before retransmitting any data.
     await accept(await nativeUpload(session,{'Content-Length':'0','Content-Range':`bytes */${info.size}`},undefined,channel.channelId!));
     chunkBytes=Math.max(1024*1024,Math.floor(chunkBytes/2/(256*1024))*(256*1024));
     if(state.bytesUploaded===offset){stalledAttempts++;assert(stalledAttempts<3,'Repeated transfer failure; saved session retained');continue;}
    }
    assert(state.videoId||state.bytesUploaded>offset,'Upload offset did not advance');stalledAttempts=0;
    state.lastChunkSeconds=(Date.now()-chunkStarted)/1000;state.lastChunkBytes=state.bytesUploaded-offset;
    const measuredTarget=chunkBytes*8/Math.max(1,state.lastChunkSeconds);
    chunkBytes=Math.max(1024*1024,Math.min(16*1024*1024,Math.floor(measuredTarget/(256*1024))*(256*1024)));
    await persist();const milestone=Math.floor(state.bytesUploaded/info.size*100);
    if(milestone!==state.lastReportedPercent){state.lastReportedPercent=milestone;await persist();console.log(JSON.stringify({kind:entry.kind,percent:milestone,lastChunkSeconds:state.lastChunkSeconds,lastChunkMB:Number((state.lastChunkBytes/1048576).toFixed(2)),videoId:state.videoId}));}
   }}finally{await file.close();}
  }
  assert(state.videoId,'Missing video completion acknowledgement');
  const thumbnailChoice=await maybe(entry.root,'youtube-thumbnail-choice');const selectedThumbnail=thumbnailChoice?.file||entry.thumbnail;if(thumbnailChoice)assert(/^[A-Za-z0-9._-]+\.jpg$/.test(selectedThumbnail),'Invalid thumbnail selection');
  if(!state.thumbnailApplied||state.thumbnailFileApplied!==selectedThumbnail){const bytes=await readFile(`${entry.root}/${selectedThumbnail}`);assert(bytes.length<2*1024*1024);const r=await googleRequest(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?uploadType=media&videoId=${state.videoId}`,{method:'POST',headers:{'Content-Type':'image/jpeg'},body:bytes as any},channel.channelId!);if(!r.ok)throw Error(await safeError(r));state.thumbnailApplied=true;state.thumbnailFileApplied=selectedThumbnail;await persist();}
  const r=await googleRequest(`https://www.googleapis.com/youtube/v3/videos?part=snippet,status,processingDetails&id=${state.videoId}`,{},channel.channelId!);assert(r.ok,'Could not verify uploaded video');const video=(await r.json()).items?.[0];assert(video&&video.snippet.channelId===channel.channelId&&video.status.privacyStatus==='private');assert.equal(video.snippet.title,state.metadata.title);assert.equal(video.snippet.description,state.metadata.description);assert.deepEqual([...video.snippet.tags].sort(),[...state.metadata.tags].sort());if(video.status.containsSyntheticMedia!==undefined)assert.equal(video.status.containsSyntheticMedia,true);
  state.state='completed';state.verifiedAt=new Date().toISOString();state.processingStatus=video.processingDetails?.processingStatus;state.syntheticMediaFlagVerified=video.status.containsSyntheticMedia===true;await persist();
  const report={kind:entry.kind,videoId:state.videoId,url:`https://www.youtube.com/watch?v=${state.videoId}`,channelId:state.channelId,channelTitle:state.channelTitle,privacyStatus:video.status.privacyStatus,processingStatus:state.processingStatus,thumbnailApplied:true,metadataVerified:true,syntheticMediaFlagVerified:state.syntheticMediaFlagVerified,verifiedAt:state.verifiedAt};await save(entry.root,'YOUTUBE_UPLOAD',report);console.log(JSON.stringify(report));
 }
}
main().catch((e)=>{console.error('YouTube upload stopped; saved progress retained. '+(e instanceof Error?e.message.replace(/https?:[^\s]+/g,'[URL]'):'unknown error')); process.exitCode=1;}).finally(()=>db.$disconnect());

