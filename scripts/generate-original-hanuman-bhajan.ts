import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {db} from '../lib/db';
import {decrypt} from '../lib/security';
const root='data/productions/divine-wisdom/hanuman-chalisa';
async function main(){
 const mode=process.argv[2];assert(['sample','full'].includes(mode),'Choose sample or full');
 const ledgerFile=`${root}/original-song-calls.json`;
 let ledger:any={scope:'Original newly written Hindi Hanuman bhajan, not complete Chalisa lyrics',authorization:'Owner said start after the original devotional song alternative was offered',maxCalls:2,calls:[]};
 try{ledger=JSON.parse(await readFile(ledgerFile,'utf8'));}catch(e:any){if(e.code!=='ENOENT')throw e;}
 assert(!ledger.calls.some((c:any)=>c.mode===mode),'This mode has already been attempted. Inspect its existing result; no automatic retry.');
 assert(ledger.calls.length<ledger.maxCalls,'Call limit reached');
 if(mode==='full')assert(ledger.calls.some((c:any)=>c.mode==='sample'&&c.state==='completed'),'Generate and review the sample first');
 const text=await readFile(`${root}/original-bhajan-lyrics.txt`,'utf8');
 const blocks=text.trim().split(/\r?\n\s*\r?\n/).slice(1);
 assert.equal(blocks.length,6);
 const styles=['original Indian devotional bhajan','clear natural Hindi pronunciation','warm resonant male baritone lead vocal','calm confidence, devotion and grace','gentle harmonium, tanpura and restrained tabla','slow flowing melody, 72 BPM','lead voice louder than accompaniment','clean recording, very light reverb'];
 const negative=['rushed syllables','mumbled words','distortion','heavy echo','EDM','rap','shouting','spoken commentary','extra lyrics'];
 const chunks=(mode==='sample'?blocks.slice(0,1):blocks).map((b,i)=>({text:b.replace(/^\[[^\]]+\]/,`[${i===0?'Chorus':i===blocks.length-1?'Outro':'Verse '+i}]`),duration_ms:mode==='sample'?45000:30000,positive_styles:styles,negative_styles:negative,context_adherence:'high'}));
 const body={model_id:'music_v2_5',composition_plan:{chunks}};
 await writeFile(`${root}/original-${mode}-request.json`,JSON.stringify(body,null,2));
 const profile=await db.providerProfile.findUnique({where:{id:'7e994f10-1088-464c-91fb-79297b8fd6cb'}});assert(profile);
 const key=process.env.ELEVENLABS_API_KEY||decrypt(profile.encryptedKey);
 const check=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key},signal:AbortSignal.timeout(30000)});assert(check.ok,'Credential/subscription check failed');
 const subscription=await check.json();assert(subscription.tier!=='free','Music requires a paid account');
 assert(subscription.character_limit-subscription.character_count>=10000,'Insufficient included credits; no overage allowed');
 const call:any={mode,state:'submitted',submittedAt:new Date().toISOString(),seconds:chunks.reduce((n,c)=>n+c.duration_ms/1000,0),estimatedCreditsPerMinute:900,pricingSource:'https://elevenlabs.io/pricing',actualCharge:null};
 ledger.calls.push(call);await writeFile(ledgerFile,JSON.stringify(ledger,null,2));
 const response=await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_48000_192',{method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(600000)});
 call.httpStatus=response.status;call.songId=response.headers.get('song-id');
 if(!response.ok){const error=await response.json().catch(()=>({}));call.state='rejected';call.reason=typeof error.detail?.status==='string'?error.detail.status:'Provider rejected music request';await writeFile(ledgerFile,JSON.stringify(ledger,null,2));throw Error(`Music request failed (${response.status}): ${call.reason}`);}
 const audio=Buffer.from(await response.arrayBuffer());assert(audio.length>10000,'Empty or invalid audio response');
 const path=`${root}/original-hanuman-bhajan-${mode}.mp3`;await writeFile(path,audio);
 call.state='completed';call.bytes=audio.length;call.file=path;call.completedAt=new Date().toISOString();await writeFile(ledgerFile,JSON.stringify(ledger,null,2));
 console.log(JSON.stringify({mode,file:path,bytes:audio.length,seconds:call.seconds,songId:call.songId,lyricAccuracy:'not-yet-reviewed'}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
