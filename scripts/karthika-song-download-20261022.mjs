import https from 'node:https';
import {createWriteStream} from 'node:fs';
import {readFile,writeFile,access} from 'node:fs/promises';
import {finished} from 'node:stream/promises';
import {credential,db} from './anjaneya-dandakam-audio.mjs';
const root='data/productions/divine-wisdom/karthika-deepam-2026-10-22';
const ledgerPath=`${root}/song-download-attempt.json`;
try{
 try{await access(ledgerPath);throw Error('Existing recovery generation attempt; inspect before another submission');}catch(e){if(e.code!=='ENOENT')throw e;}
 const key=await credential();const original=JSON.parse(await readFile(`${root}/song-request.json`,'utf8'));delete original.with_timestamps;
 const payload=JSON.stringify(original);
 const ledger={state:'submitted',submittedAt:new Date().toISOString(),maximumCalls:1,originalAttemptPreserved:true,reason:'First detailed generation returned HTTP 200 but disconnected while reading multipart response; official history API cannot retrieve music. One replacement attempt saves raw audio incrementally.',authorization:'User requested creating this complete original song video.',actualCharge:null};
 await writeFile(ledgerPath,JSON.stringify(ledger,null,2));
 await new Promise((resolve,reject)=>{
  const request=https.request('https://api.elevenlabs.io/v1/music?output_format=mp3_48000_192',{method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)},timeout:900000},async r=>{
   ledger.httpStatus=r.statusCode;ledger.contentType=r.headers['content-type'];ledger.songId=r.headers['song-id'];await writeFile(ledgerPath,JSON.stringify(ledger,null,2));
   if(r.statusCode!==200){let msg='';for await(const chunk of r)msg+=chunk.toString();await writeFile(`${root}/song-download-error.json`,msg);ledger.state='rejected';await writeFile(ledgerPath,JSON.stringify(ledger,null,2));reject(Error('Replacement generation rejected: HTTP '+r.statusCode));return;}
   let bytes=0,last=0;const file=createWriteStream(`${root}/song.mp3`,{flags:'wx'});
   r.on('data',chunk=>{bytes+=chunk.length;if(bytes-last>1000000){last=bytes;console.log(JSON.stringify({stage:'saving-audio',bytes}));}});
   r.pipe(file);
   try{await Promise.all([finished(r),finished(file)]);ledger.state='completed';ledger.bytes=bytes;ledger.completedAt=new Date().toISOString();await writeFile(ledgerPath,JSON.stringify(ledger,null,2));console.log(JSON.stringify({stage:'song-saved',bytes}));resolve();}
   catch(e){ledger.state='partial';ledger.bytes=bytes;ledger.error=e.code||e.name;await writeFile(ledgerPath,JSON.stringify(ledger,null,2));reject(e);}
  });request.on('timeout',()=>request.destroy(Error('Request timeout')));request.on('error',reject);request.end(payload);
 });
}catch(e){console.error(JSON.stringify({error:e.name,code:e.code||e.cause?.code,message:e.message?.startsWith('Existing')?e.message:'Song download stopped; inspect saved ledger and partial file.'}));process.exitCode=1;}finally{await db.$disconnect();}
