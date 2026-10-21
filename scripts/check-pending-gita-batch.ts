import 'dotenv/config';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {googleRequest} from '../lib/youtube';
import {db} from '../lib/db';
const root='data/productions/divine-wisdom';
async function main(){
 const records:any[]=[];
 for(const f of await readdir(root)){if(/^PENDING_GITA_UPLOAD_PROGRESS_2026-10-21.*\.json$/.test(f)){const p=JSON.parse(await readFile(`${root}/${f}`,'utf8'));for(const v of p.videos)records.push({source:f,...v});}}
 const ids=[...new Set(records.map(v=>v.videoId).filter(Boolean))];const live:any[]=[];
 for(let i=0;i<ids.length;i+=50){const r=await googleRequest(`https://www.googleapis.com/youtube/v3/videos?part=snippet,status,processingDetails,contentDetails&id=${ids.slice(i,i+50).join(',')}`,{},'UCZCidygC9i89ye1PEI_nh2Q');if(!r.ok)throw Error(`Verification HTTP ${r.status}`);live.push(...(await r.json()).items);}
 const rows=records.map(({encryptedSession,...v})=>({...v,remote:live.find(r=>r.id===v.videoId)}));
 await writeFile(`${root}/PENDING_GITA_UPLOAD_VERIFICATION_2026-10-21.json`,JSON.stringify({checkedAt:new Date().toISOString(),videos:rows},null,2));
 console.log(JSON.stringify(rows.filter(v=>v.state!=='prepared').map(v=>({id:v.id,source:v.source,state:v.state,percent:Math.round(v.bytesUploaded/v.totalBytes*100),videoId:v.videoId,uploadStatus:v.remote?.status?.uploadStatus,privacy:v.remote?.status?.privacyStatus,publishAt:v.remote?.status?.publishAt,processing:v.remote?.processingDetails?.processingStatus,duration:v.remote?.contentDetails?.duration,error:v.error})),null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
