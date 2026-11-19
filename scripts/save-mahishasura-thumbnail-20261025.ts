import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {db} from '../lib/db';
import {sessionToken} from '../lib/security';
const root='data/productions/divine-wisdom/mahishasura-mardini-2026-10-25/female-full-v3';
const projectId='3244d863-6717-43a8-91a6-b6a6ccf743b0';
async function main(){
 const name='thumbnail-clickable-v2.jpg',bytes=await readFile(`${root}/${name}`);assert(bytes.length<2*1024*1024);
 let asset=await db.asset.findFirst({where:{projectId,name}});
 if(!asset){
  const form=new FormData();form.set('projectId',projectId);form.set('file',new File([new Uint8Array(bytes)],name,{type:'image/jpeg'}));
  const origin=process.env.APP_ORIGIN||'http://localhost:3000';
  const response=await fetch(`${origin}/api/assets`,{method:'POST',headers:{Cookie:`studio_session=${sessionToken()}`,Origin:origin},body:form});assert(response.ok,`Thumbnail import HTTP ${response.status}`);asset=await response.json();
 }
 const result={projectId,thumbnailAssetId:asset!.id,file:name,width:1280,height:720,bytes:bytes.length};
 await writeFile(`${root}/thumbnail-studio-registration.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?e.message:'Thumbnail import stopped; credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
