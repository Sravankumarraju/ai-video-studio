import 'dotenv/config';
import {youtubeStatus,googleRequest} from '../lib/youtube';
import {db} from '../lib/db';
async function main(){const s=await youtubeStatus();console.log(JSON.stringify(s));if(s.connected){const r=await googleRequest('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',{},s.channelId!);console.log(JSON.stringify({httpStatus:r.status}));if(r.ok){const d=await r.json();console.log(JSON.stringify({channels:d.items?.map((v:any)=>({id:v.id,title:v.snippet.title}))}));}}}
main().catch(e=>console.error(JSON.stringify({type:e.name,error:/^(No YouTube connection|Reconnect YouTube|Google token request failed|Connect YouTube first|Unsupported state or unable to authenticate data|Configure ENCRYPTION_KEY)/.test(e.message)?e.message:'Read-only YouTube check failed',code:e.cause?.code}))).finally(()=>db.$disconnect());
