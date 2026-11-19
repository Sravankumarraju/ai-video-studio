import 'dotenv/config';
import {db} from '../lib/db';
import {youtubeStatus,googleRequest} from '../lib/youtube';
async function main(){try{
 const status=await youtubeStatus();console.log(JSON.stringify(status));
 if(status.connected){const r=await googleRequest('https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true',{},status.channelId!);const b=await r.json();console.log(JSON.stringify({httpStatus:r.status,channels:b.items?.map((c:any)=>({id:c.id,title:c.snippet.title,uploadsPlaylist:c.contentDetails.relatedPlaylists.uploads})),errorReasons:b.error?.errors?.map((e:any)=>e.reason)}));}
}catch(e:any){console.log(JSON.stringify({error:e.message?.replace(/https?:[^\s]+/g,'[URL]').replace(/postgres(?:ql)?:[^\s]+/g,'[DB URL]').slice(-1000),name:e.name,code:e.code||e.errorCode||e.cause?.code}));process.exitCode=1;}finally{await db.$disconnect();}}
main();
