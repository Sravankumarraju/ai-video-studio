import 'dotenv/config';
import assert from 'node:assert/strict';
import {db} from '../lib/db';
import {googleRequest} from '../lib/youtube';
import {privateVideoMetadata,validUploadSession} from '../lib/youtube-policy';
import {encrypt,sessionToken} from '../lib/security';
async function main(){
 const id=process.argv[2];assert(id);
 const row=await db.youtubeUpload.findUniqueOrThrow({where:{id}});
 assert(row.state==='failed'&&row.stage==='Google session rejected'&&!row.videoId&&!row.encryptedSession&&Number(row.bytesUploaded)===0,'Only explicitly rejected, never-uploaded requests are recoverable');
 await db.youtubeUpload.update({where:{id},data:{stage:'Starting Google upload session'}});
 let response:Response;
 try{response=await googleRequest('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status&notifySubscribers=false',{method:'POST',headers:{'Content-Type':'application/json','X-Upload-Content-Type':'video/mp4','X-Upload-Content-Length':String(row.totalBytes)},body:JSON.stringify(privateVideoMetadata(row.metadata))},row.channelId);}catch{
  await db.youtubeUpload.update({where:{id},data:{state:'needs-review',stage:'Google session acknowledgement lost',error:'Review before another session request; acknowledgement was not received'}});throw Error('Google session acknowledgement lost');
 }
 if(response.status>=500){await db.youtubeUpload.update({where:{id},data:{state:'needs-review',stage:'Google session creation uncertain',error:'Google server error; review before requesting another upload session'}});console.log(JSON.stringify({id,status:response.status,needsReview:true}));return;}
 if(!response.ok){
  const body=await response.json().catch(()=>({}));
  // Only controlled error identifiers, never the full response or session URL.
  const reasons=(body.error?.errors||[]).map((e:any)=>e.reason).filter((s:any)=>typeof s==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(s));
  const error=`YouTube rejected upload (${response.status}): ${reasons.join(', ')||'unspecified'}`;
  await db.youtubeUpload.update({where:{id},data:{state:'failed',stage:'Google session rejected',error}});
  console.log(JSON.stringify({id,status:response.status,reasons,uploaded:false}));return;
 }
 const location=response.headers.get('location');if(!location){await db.youtubeUpload.update({where:{id},data:{state:'needs-review',error:'Successful response did not include a session; review before another request'}});throw Error('Missing session acknowledgement');}
 await db.youtubeUpload.update({where:{id},data:{encryptedSession:encrypt(validUploadSession(location)),stage:'Uploading private video'}});
 const origin=process.env.APP_ORIGIN||'http://localhost:3000';
 const retry=await fetch(`${origin}/api/youtube/uploads/${id}/retry`,{method:'POST',headers:{Cookie:`studio_session=${sessionToken()}`,Origin:origin}});assert(retry.ok,'Saved session must be resumed in the owner UI');
 console.log(JSON.stringify({id,resumed:true}));
}
main().catch(()=>{console.error('Recovery stopped; inspect saved upload status. Sensitive details suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
