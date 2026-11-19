import 'dotenv/config';
import {readFile,writeFile,stat,open} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {db} from '../lib/db';
import {googleRequest,youtubeStatus} from '../lib/youtube';
import {encrypt,decrypt} from '../lib/security';
import {privateVideoMetadata,validUploadSession,acknowledgedOffset,uploadMetadata} from '../lib/youtube-policy';
const entries=[{"kind": "dakshinamurthy", "root": "data/productions/divine-wisdom/dakshinamurthy-2026-10-23", "file": "Sri-Dakshinamurthy-Stotram-Telugu-1080p.mp4", "thumbnail": "thumbnail.jpg", "metadata": "youtube-package", "verification": "VERIFICATION"}];
const load=async(root:string,name:string)=>JSON.parse(await readFile(`${root}/${name}.json`,'utf8'));
const save=(root:string,name:string,value:any)=>writeFile(`${root}/${name}.json`,JSON.stringify(value,null,2));
async function maybe(root:string,name:string){try{return await load(root,name);}catch(e:any){if(e.code==='ENOENT')return null;throw e;}}
const stamp=(s:number)=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
async function safeError(r:Response){const b=await r.json().catch(()=>({}));const reasons=(b.error?.errors||[]).map((e:any)=>e.reason).filter((x:any)=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(x));return `YouTube HTTP ${r.status}: ${reasons.join(', ')||'request_rejected'}`;}
async function main(){
 const channel=await youtubeStatus();assert(channel.connected&&channel.channelId==='UCZCidygC9i89ye1PEI_nh2Q','Connected channel must be the existing Divine Wisdom channel');
 const channelRead=await googleRequest('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',{},channel.channelId!);assert(channelRead.ok,'Cannot verify connected channel');const actual=(await channelRead.json()).items?.find((c:any)=>c.id===channel.channelId);assert(actual&&/divine\s*wisdom/i.test(actual.snippet.title),'YouTube channel verification failed');
 console.log(JSON.stringify({channel:actual.snippet.title,channelId:channel.channelId,visibility:'private',selection:'Sri Dakshinamurthy Stotram final 1080p video only'}));
 const remoteVideos:any[]=[];let pageToken='';
 do{const r=await googleRequest('https://www.googleapis.com/youtube/v3/playlistItems?'+new URLSearchParams({part:'snippet',playlistId:'UUZCidygC9i89ye1PEI_nh2Q',maxResults:'50',...(pageToken?{pageToken}:{})}),{},channel.channelId!);assert(r.ok,'Duplicate check failed');const data=await r.json();remoteVideos.push(...data.items);pageToken=data.nextPageToken||'';}while(pageToken);
 await writeFile('data/productions/divine-wisdom/dakshinamurthy-2026-10-23/youtube-duplicate-check.json',JSON.stringify(remoteVideos.map((v:any)=>({title:v.snippet.title,videoId:v.snippet.resourceId.videoId})),null,2));
 for(const entry of entries){
  const verified=await load(entry.root,entry.verification);
  assert(verified.fullDecodePassed || (entry.kind==='nee-sannidhe' && verified.format?.filename?.endsWith(entry.file)), 'Completed video verification required');
  const info=await stat(entry.root+'/'+entry.file);assert(info.size>1000000);
  if(verified.bytes)assert.equal(info.size,verified.bytes);
  const metadata=uploadMetadata.parse(await load(entry.root,entry.metadata));
  console.log(JSON.stringify({kind:entry.kind,title:metadata.title,bytes:info.size,descriptionBytes:Buffer.byteLength(metadata.description)}));
  if(process.argv[2]==='check')continue;
  const duplicate=remoteVideos.find((v:any)=>v.snippet?.title===metadata.title);
  if(duplicate && !(await maybe(entry.root,'youtube-local-upload'))){console.log(JSON.stringify({kind:entry.kind,alreadyUploaded:true,videoId:duplicate.snippet.resourceId.videoId}));continue;}
  let state=await maybe(entry.root,'youtube-local-upload');
  if(!state){state={state:'prepared',kind:entry.kind,file:entry.file,channelId:channel.channelId,channelTitle:actual.snippet.title,totalBytes:info.size,bytesUploaded:0,metadata,visibility:'private',authorization:'User explicitly requested upload of this completed Sri Dakshinamurthy Stotram video to YouTube as Private; prepared title, description and thumbnail; October 23, 2026',createdAt:new Date().toISOString()};await save(entry.root,'youtube-local-upload',state);}
  assert(state.channelId===channel.channelId&&state.totalBytes===info.size,'Upload identity changed; preserve the saved session');
  const persist=()=>save(entry.root,'youtube-local-upload',state);
  if(!state.videoId){
   if(!state.encryptedSession){
    assert(state.state==='prepared','Existing session attempt must be reviewed before another POST');state.state='session-submitted';await persist();
    let r:Response;try{const body=privateVideoMetadata(state.metadata);body.snippet.categoryId=entry.kind==='ayyappa-deeksha'?'27':'10';body.snippet.defaultAudioLanguage=['dakshinamurthy'].includes(entry.kind)?'sa':'te';r=await googleRequest('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status&notifySubscribers=false',{method:'POST',headers:{'Content-Type':'application/json','X-Upload-Content-Type':'video/mp4','X-Upload-Content-Length':String(info.size)},body:JSON.stringify(body)},channel.channelId!);}catch{state.state='needs-review';state.error='Session acknowledgement lost; no automatic duplicate creation';await persist();throw Error(state.error);}
    if(!r.ok){state.state=r.status>=500?'needs-review':'rejected';state.error=await safeError(r);await persist();console.log(JSON.stringify({kind:entry.kind,state:state.state,error:state.error}));continue;}
    const location=r.headers.get('location');assert(location,'Missing upload session acknowledgement');state.encryptedSession=encrypt(validUploadSession(location));state.state='uploading';await persist();
   }
   const session=validUploadSession(decrypt(state.encryptedSession));
   async function accept(r:Response){
    if(r.status===308){state.bytesUploaded=acknowledgedOffset(r.headers.get('range'),info.size);await persist();return;}
    if(r.ok){const body=await r.json();assert(typeof body.id==='string'&&/^[A-Za-z0-9_-]+$/.test(body.id));state.videoId=body.id;state.bytesUploaded=info.size;state.state='uploaded';state.uploadedAt=new Date().toISOString();await persist();return;}
    state.error=await safeError(r);await persist();throw Error(state.error);
   }
   await accept(await googleRequest(session,{method:'PUT',headers:{'Content-Length':'0','Content-Range':`bytes */${info.size}`}},channel.channelId!));
   const file=await open(`${entry.root}/${entry.file}`,'r');
   try{while(!state.videoId&&state.bytesUploaded<info.size){const offset=state.bytesUploaded;const size=Math.min(8*1024*1024,info.size-offset);const bytes=Buffer.alloc(size);assert.equal((await file.read(bytes,0,size,offset)).bytesRead,size);await accept(await googleRequest(session,{method:'PUT',headers:{'Content-Type':'video/mp4','Content-Length':String(size),'Content-Range':`bytes ${offset}-${offset+size-1}/${info.size}`},body:bytes as any},channel.channelId!));assert(state.videoId||state.bytesUploaded>offset,'Upload offset did not advance');console.log(JSON.stringify({kind:entry.kind,percent:Math.round(state.bytesUploaded/info.size*100),videoId:state.videoId}));}}finally{await file.close();}
  }
  assert(state.videoId,'Missing video completion acknowledgement');
  if(!state.thumbnailApplied){const bytes=await readFile(`${entry.root}/${entry.thumbnail}`);assert(bytes.length<2*1024*1024);const r=await googleRequest(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?uploadType=media&videoId=${state.videoId}`,{method:'POST',headers:{'Content-Type':'image/jpeg'},body:bytes as any},channel.channelId!);if(!r.ok)throw Error(await safeError(r));state.thumbnailApplied=true;await persist();}
  const r=await googleRequest(`https://www.googleapis.com/youtube/v3/videos?part=snippet,status,processingDetails&id=${state.videoId}`,{},channel.channelId!);assert(r.ok,'Could not verify uploaded video');const video=(await r.json()).items?.[0];assert(video&&video.snippet.channelId===channel.channelId&&video.status.privacyStatus==='private');assert.equal(video.snippet.title,state.metadata.title);assert.equal(video.snippet.description,state.metadata.description);assert.deepEqual([...video.snippet.tags].sort(),[...state.metadata.tags].sort());if(video.status.containsSyntheticMedia!==undefined)assert.equal(video.status.containsSyntheticMedia,true);
  state.state='completed';state.verifiedAt=new Date().toISOString();state.processingStatus=video.processingDetails?.processingStatus;state.syntheticMediaFlagVerified=video.status.containsSyntheticMedia===true;await persist();
  const report={kind:entry.kind,videoId:state.videoId,url:`https://www.youtube.com/watch?v=${state.videoId}`,channelId:state.channelId,channelTitle:state.channelTitle,privacyStatus:video.status.privacyStatus,processingStatus:state.processingStatus,thumbnailApplied:true,metadataVerified:true,syntheticMediaFlagVerified:state.syntheticMediaFlagVerified,verifiedAt:state.verifiedAt};await save(entry.root,'YOUTUBE_UPLOAD',report);console.log(JSON.stringify(report));
 }
}
main().catch((e)=>{console.error('YouTube upload stopped; saved progress retained. '+(e instanceof Error?e.message.replace(/https?:[^\s]+/g,'[URL]'):'unknown error')); process.exitCode=1;}).finally(()=>db.$disconnect());

