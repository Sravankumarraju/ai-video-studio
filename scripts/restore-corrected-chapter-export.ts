import {db} from '../lib/db';
import {projectSchema} from '../lib/schema';
import {json,renderIsCurrent} from '../lib/projects';
import {subtitleFile} from '../lib/timeline';
import {localPath} from '../lib/storage';
import {jobQueue,closeQueue} from '../lib/queue';
import {readFile,writeFile,mkdir,copyFile,stat,realpath,rm} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
async function sha(file:string){const h=createHash('sha256');for await(const b of createReadStream(file))h.update(b);return h.digest('hex');}
async function main(){
 const id='383c72a6-2227-4897-aa51-0243aa029ec1';
 const report=JSON.parse((await readFile('/app/scripts/chapter-full-verification.json','utf8')).replace(/^\uFEFF/,''));
 assert(report.completeDecodePassed&&report.jobId===id&&report.width===1920&&report.height===1080);
 assert(await jobQueue().isPaused(),'Queue must remain paused');
 const j=await db.job.findUniqueOrThrow({where:{id}});
 assert(j.kind==='render'&&!j.cancelRequested);
 const snapshot=j.snapshot as any,doc=projectSchema.parse(snapshot.doc);
 const variant=doc.variants.find(v=>v.id==='gita-chapter-1-te-audio-corrected-v5');assert(variant);
 const current=await db.project.findUniqueOrThrow({where:{id:j.projectId}});
 assert(renderIsCurrent(snapshot.doc,variant.id,projectSchema.parse(current.document)));
 const source='/tmp/story-render-R5gKnz/final.mp4';
 assert.equal(await sha(source),report.sha256,'Recovered source does not match fully decoded file');
 const mp4Key=`exports/${id}-recovered.mp4`,srtKey=`exports/${id}-recovered.srt`,vttKey=`exports/${id}-recovered.vtt`;
 await mkdir(path.dirname(localPath(mp4Key)),{recursive:true});
 await copyFile(source,localPath(mp4Key));
 assert.equal(await sha(localPath(mp4Key)),report.sha256);
 for(const [format,key] of [['srt',srtKey],['vtt',vttKey]] as const)await writeFile(localPath(key),subtitleFile(doc,variant,format));
 await mkdir(localPath('recovery'),{recursive:true});
 await writeFile(localPath('recovery/chapter-job-before-recovery.json'),JSON.stringify({id,state:j.state,stage:j.stage,result:j.result,error:j.error},null,2));
 const result={mp4Key,srtKey,vttKey,duration:report.seconds,width:1920,height:1080,bytes:(await stat(source)).size,variantId:variant.id,draft:false};
 await db.job.update({where:{id},data:{state:'completed',stage:'Recovered export: whole-file decoding verified',error:null,result:json(result)}});
 for(const name of ['story-render-R5gKnz','story-render-o9c8dp','story-render-unHltR']){
  const target=await realpath(path.join('/tmp',name));
  assert(path.dirname(target)==='/tmp'&&path.basename(target)===name);
  await rm(target,{recursive:true,force:true});
 }
 console.log(JSON.stringify({id,state:'completed',result,removedAbandonedRenderDirectories:3}));
}
main().finally(async()=>{await closeQueue();await db.$disconnect();}).catch(e=>{console.error(e.message);process.exitCode=1});
