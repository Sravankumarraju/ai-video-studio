import 'dotenv/config';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {sessionToken} from '../lib/security';
async function main(){
 const [projectId,file]=process.argv.slice(2);assert(projectId&&file);
 const bytes=await readFile(file);assert(bytes.length<=100*1024*1024);
 const form=new FormData();form.set('projectId',projectId);form.set('file',new File([new Uint8Array(bytes)],path.basename(file)));
 const origin=process.env.APP_ORIGIN||'http://localhost:3000';
 const response=await fetch(`${origin}/api/assets`,{method:'POST',headers:{Cookie:`studio_session=${sessionToken()}`,Origin:origin},body:form});
 assert(response.ok,'Owner asset upload failed');const asset=await response.json();assert(asset.id);
 console.log(JSON.stringify({id:asset.id,bytes:asset.bytes}));
}
main().catch(()=>{console.error('Owner media upload failed; credentials suppressed.');process.exitCode=1;});
