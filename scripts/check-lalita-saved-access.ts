import 'dotenv/config';
import {db} from '../lib/db';
import {decrypt} from '../lib/security';
import {writeFile} from 'node:fs/promises';
async function main(){
 const row=await db.youtubeConnection.findUniqueOrThrow({where:{id:'owner'}});const t=JSON.parse(decrypt(row.encryptedTokens!));
 const r=await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',{headers:{Authorization:`Bearer ${t.access_token}`},signal:AbortSignal.timeout(30000)});
 const d=await r.json();const result={operation:'read-only saved access-token validation; no refresh or scope changes',httpStatus:r.status,channels:r.ok?d.items?.map((x:any)=>({id:x.id,title:x.snippet.title})):[],errorReasons:r.ok?[]:(d.error?.errors||[]).map((e:any)=>e.reason).filter((x:any)=>typeof x==='string'&&/^[A-Za-z_]+$/.test(x))};
 await writeFile('data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12/YOUTUBE-AUTH-CHECK.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}
main().catch(()=>{console.error('Read-only access check failed; credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
