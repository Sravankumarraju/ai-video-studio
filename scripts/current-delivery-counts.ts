import 'dotenv/config';
import {ownerApi} from './youtube-owner';
import {googleRequest} from '../lib/youtube';
import {db} from '../lib/db';
import {readdir,readFile} from 'node:fs/promises';
async function main(){
 const connection=await ownerApi('status'),uploads=await ownerApi('uploads');
 const recorded=uploads.filter((u:any)=>u.videoId);
 const response=await googleRequest(`https://www.googleapis.com/youtube/v3/videos?part=snippet,status,processingDetails&id=${recorded.map((u:any)=>u.videoId).join(',')}`,{},connection.channelId);
 if(!response.ok)throw Error(`YouTube count verification failed (${response.status})`);
 const live=(await response.json()).items||[];
 const root='data/productions/divine-wisdom',finals:any[]=[];
 async function walk(dir:string){for(const f of await readdir(dir,{withFileTypes:true})){const path=`${dir}/${f.name}`;if(f.isDirectory())await walk(path);else if(f.name==='verification-full.json'){const v=JSON.parse((await readFile(path,'utf8')).replace(/^\uFEFF/,''));if(v.decodedEntireFile)finals.push({path,chapter:v.chapterNumber,verseCount:v.verseCount});}}}
 await walk(root);
 console.log(JSON.stringify({liveUploadedEditions:live.length,liveUniqueProductions:new Set(recorded.filter((u:any)=>live.some((v:any)=>v.id===u.videoId)).map((u:any)=>u.projectId)).size,processingSucceeded:live.filter((v:any)=>v.processingDetails?.processingStatus==='succeeded').length,processingPending:live.filter((v:any)=>v.processingDetails?.processingStatus!=='succeeded').map((v:any)=>({id:v.id,processing:v.processingDetails?.processingStatus})),private:live.filter((v:any)=>v.status.privacyStatus==='private').length,unverifiedHistoricalIds:recorded.length-live.length,pendingUploads:uploads.filter((u:any)=>u.state!=='completed').map((u:any)=>({id:u.id,state:u.state,stage:u.stage})),verifiedFinalFiles:finals},null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
