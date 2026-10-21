import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {db} from '../lib/db';
import {sessionToken} from '../lib/security';
import {ownerApi} from './youtube-owner';
const root='data/productions/divine-wisdom/bhagavad-gita-name-correction';
async function main(){
 const projectId='87c5483d-8b50-42b3-87bf-5cd420ce9a8a',expectedChannelId='UCZCidygC9i89ye1PEI_nh2Q';
 const p=await db.project.findUniqueOrThrow({where:{id:projectId}}),doc:any=p.document;
 const jobs=await db.job.findMany({where:{projectId,kind:'render',state:'completed'},orderBy:{createdAt:'desc'}});
 let rows:any[];try{rows=JSON.parse(await readFile(root+'/CORRECTED_UPLOAD_PROGRESS.json','utf8'));}catch(e:any){if(e.code!=='ENOENT')throw e;rows=[];}
 const save=()=>writeFile(root+'/CORRECTED_UPLOAD_PROGRESS.json',JSON.stringify(rows,null,2));
 for(const variant of doc.variants){
  const job=jobs.find(j=>{const r:any=j.result;return r?.variantId===variant.id&&!r.draft;});if(!job){console.log(JSON.stringify({variant:variant.id,state:'render-pending'}));continue;}
  const name=variant.id.replace('-corrected-v1','')+'-upload.jpg';
  let thumb=await db.asset.findFirst({where:{projectId,name}});
  if(!thumb){const bytes=await readFile(root+'/images/'+name);assert(bytes.length<2*1024*1024);const form=new FormData();form.set('projectId',projectId);form.set('file',new File([new Uint8Array(bytes)],name));const origin=process.env.APP_ORIGIN||'http://localhost:3000';const r=await fetch(origin+'/api/assets',{method:'POST',headers:{Cookie:'studio_session='+sessionToken(),Origin:origin},body:form});assert(r.ok,'Thumbnail import failed');thumb=await r.json();}
  assert(thumb);const upload=await ownerApi('uploads',{renderJobId:job.id,thumbnailAssetId:thumb.id,expectedChannelId,metadata:{title:variant.publishing.titles[0],description:variant.publishing.description,tags:['Bhagavad Gita Telugu','Divine Wisdom Telugu','Shorts']}});
  let row=rows.find(x=>x.variantId===variant.id);if(!row){row={variantId:variant.id};rows.push(row);}Object.assign(row,{renderJobId:job.id,uploadId:upload.id,videoId:upload.videoId,state:upload.state,thumbnailAssetId:thumb.id});await save();console.log(JSON.stringify(row));
 }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
