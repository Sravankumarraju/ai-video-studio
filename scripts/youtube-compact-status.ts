import {ownerApi} from './youtube-owner';
async function main(){
 const connection=await ownerApi('status'),uploads=await ownerApi('uploads');
 console.log(JSON.stringify({connection,uploads:uploads.map((u:any)=>({id:u.id,projectId:u.projectId,renderJobId:u.renderJobId,title:u.metadata?.title,state:u.state,stage:u.stage,videoId:u.videoId,thumbnailApplied:u.thumbnailApplied,bytesUploaded:u.bytesUploaded,totalBytes:u.totalBytes,error:u.error}))},null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
