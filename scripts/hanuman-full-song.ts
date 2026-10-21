import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {db} from '../lib/db';
import {decrypt} from '../lib/security';
const root='data/productions/divine-wisdom/hanuman-chalisa/full-original-2026-10-06';
const sample='data/productions/divine-wisdom/hanuman-chalisa/sung-preview-2026-10-06/hanuman-chalisa-powerful-preview.mp3';
const mode=process.argv[2];
const save=(name:string,data:any)=>writeFile(`${root}/${name}.json`,JSON.stringify(data,null,2));
async function exists(file:string){try{await readFile(file);return true;}catch(e:any){if(e.code==='ENOENT')return false;throw e;}}
async function key(){
 let value=process.env.ELEVENLABS_API_KEY;
 if(!value||/^(<|PASTE|your)/i.test(value)){const p=await db.providerProfile.findUniqueOrThrow({where:{id:'7e994f10-1088-464c-91fb-79297b8fd6cb'}});value=decrypt(p.encryptedKey);}
 return value;
}
async function allowed(apiKey:string){
 const r=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':apiKey},signal:AbortSignal.timeout(30000)});
 assert(r.ok,`Subscription check HTTP ${r.status}`);const s=await r.json();
 const remaining=s.character_limit-s.character_count;assert(s.tier!=='free'&&remaining>=15000,'Insufficient included credits; overage prohibited');
 await save('subscription-check',{checkedAt:new Date().toISOString(),tier:s.tier,remainingCredits:remaining});
}
async function paid(name:string,url:string,body:any,apiKey:string,json=false){
 assert(!await exists(`${root}/${name}-attempt.json`),'Existing attempt prevents duplicate billing; inspect saved result');
 const record:any={state:'submitted',submittedAt:new Date().toISOString(),scope:name,authorization:'Owner approved enhanced sample and requested full song video with images and large word-highlighted captions',actualCharge:null};
 await save(`${name}-attempt`,record);
 try{
  const r=await fetch(url,{method:'POST',headers:{'xi-api-key':apiKey,...(json?{'Content-Type':'application/json'}:{})},body:json?JSON.stringify(body):body,signal:AbortSignal.timeout(900000)});
  record.httpStatus=r.status;record.songId=r.headers.get('song-id');record.contentType=r.headers.get('content-type');
  if(!r.ok){const e=await r.json().catch(()=>({}));record.state='rejected';record.reason=typeof e.detail?.status==='string'?e.detail.status:'provider_rejected';await save(`${name}-attempt`,record);throw Error(`Provider rejected ${name}: HTTP ${r.status} (${record.reason})`);}
  const bytes=Buffer.from(await r.arrayBuffer());await writeFile(`${root}/${name}-response.bin`,bytes);record.state='completed';record.bytes=bytes.length;record.completedAt=new Date().toISOString();await save(`${name}-attempt`,record);return {bytes,record};
 }catch(e){if(record.state==='submitted'){record.state='unknown';await save(`${name}-attempt`,record);}throw e;}
}
async function main(){
 assert(['prepare','upload','generate','parse','align','repair'].includes(mode),'Invalid stage');await mkdir(root,{recursive:true});
 const source=await readFile(`${root}/lyrics.txt`,'utf8');
 const units=source.trim().split(/\r?\n\s*\r?\n/).map(b=>({name:b.split('\n')[0].replace(/[\[\]]/g,''),text:b.split('\n').slice(1).join('\n').trim()}));
 assert.equal(units.filter(x=>x.name.startsWith('Chaupai')).length,40);assert.equal(units.length,46);
 let stored:any;try{stored=JSON.parse(await readFile(`${root}/reference-upload.json`,'utf8'));}catch(e:any){if(e.code!=='ENOENT')throw e;}
 const styles=['original powerful Indian devotional melody','rich male baritone, heartfelt reverence and heroic energy','clear precise supplied words, no translation','traditional Awadhi and Sanskrit supplied in Telugu script','84 BPM devotional pulse','pakhawaj, dhol, tabla, harmonium and tanpura','cinematic strings, restrained temple bells','lead vocal forward, warm bass, clean mix','same lead singer and musical character as the reference','emotive phrasing without shouting or rushed syllables'];
 const negative=['spoken commentary','extra lyrics','skipped lyrics','mumbled words','rap','EDM','distortion','heavy echo','screaming'];
 const chunks:any[]=[];let t=0;
 const inventory:any[]=[];
 function generated(list:any[],seconds:number){
  const text=list.map(x=>x.text).join('\n');const section=list.map(x=>x.name).join(' / ');
  chunks.push({text:`[${section}]\n${text}`,duration_ms:seconds*1000,positive_styles:styles,negative_styles:negative,context_adherence:'high',...(stored?{conditioning_ref:{song_id:stored.song_id,range:{start_ms:30000,end_ms:60000}},condition_strength:'high'}:{})});
  inventory.push({section,start:t,end:t+seconds,units:list.map(x=>x.name),text,kind:'generated'});t+=seconds;
 }
 function reference(list:any[],start:number,end:number){
  chunks.push(stored?{song_id:stored.song_id,range:{start_ms:start*1000,end_ms:end*1000}}:{text:list.map(x=>x.text).join('\n'),duration_ms:(end-start)*1000,positive_styles:styles,negative_styles:negative,context_adherence:'high'});
  inventory.push({section:list.map(x=>x.name).join(' / '),start:t,end:t+end-start,units:list.map(x=>x.name),text:list.map(x=>x.text).join('\n'),kind:'approved-preview'});t+=end-start;
 }
 reference(units.slice(0,1),0,30);
 generated(units.slice(1,2),24);generated(units.slice(2,3),40);generated(units.slice(3,4),24);
 reference(units.slice(4,6),30,60);
 for(let i=6;i<44;i+=2)generated(units.slice(i,i+2),22);
 generated(units.slice(44,45),18);generated(units.slice(45,46),8);
 assert(t<=600&&chunks.length<=30);assert.equal(inventory.flatMap(x=>x.units).length,46);
 const request={model_id:'music_v2_5',composition_plan:{chunks},with_timestamps:true,store_for_inpainting:true};
 await save('request',request);await save('inventory',{seconds:t,chunks:inventory,units});
 if(mode==='prepare'){console.log(JSON.stringify({prepared:true,seconds:t,chunks:chunks.length,units:units.length,referenceAvailable:!!stored}));return;}
 if(mode==='parse'){
  const name=process.argv[3]||'full-song';assert(['full-song','repair-song'].includes(name));
  const record=JSON.parse(await readFile(`${root}/${name}-attempt.json`,'utf8'));
  const bytes=await readFile(`${root}/${name}-response.bin`);
  const boundary=/boundary="?([^";\s]+)/i.exec(record.contentType||'')?.[1];
  assert(boundary,'Detailed response missing multipart boundary');
  const marker=Buffer.from(`--${boundary}`);let cursor=bytes.indexOf(marker);let audioFound=false;
  while(cursor>=0){const next=bytes.indexOf(marker,cursor+marker.length);if(next<0)break;const part=bytes.subarray(cursor+marker.length,next);const split=part.indexOf(Buffer.from('\r\n\r\n'));if(split>=0){const header=part.subarray(0,split).toString();let body=part.subarray(split+4);if(body.subarray(-2).toString()==='\r\n')body=body.subarray(0,-2);if(/application\/json/i.test(header)){await save(name==='full-song'?'music-metadata':'repair-metadata',JSON.parse(body.toString()));}else if(/audio\//i.test(header)){await writeFile(`${root}/${name==='full-song'?'full-song':'repair-song'}-raw.mp3`,body);audioFound=true;}}cursor=next;}
  assert(audioFound,'No audio part parsed');console.log(JSON.stringify({parsed:true}));return;
 }
 const apiKey=await key();await allowed(apiKey);
 if(mode==='repair'){
  const indexes=[2,6,7,25],durations=[60,30,30,24];let offset=0;
  const repairs=indexes.map((index,i)=>{const original=inventory[index];const item={index,originalStart:original.start,originalEnd:original.end,repairStart:offset,repairEnd:offset+durations[i],text:original.text,section:original.section};offset+=durations[i];return item;});
  const body={model_id:'music_v2_5',with_timestamps:true,store_for_inpainting:true,composition_plan:{chunks:repairs.map(x=>({text:`[${x.section}]\n${x.text}`,duration_ms:(x.repairEnd-x.repairStart)*1000,positive_styles:[...styles,'sing EVERY supplied word fully and distinctly, allow breathing pauses, no abbreviated syllables','gentle instrumental resolution after the complete supplied words'],negative_styles:negative,context_adherence:'high',conditioning_ref:{song_id:stored.song_id,range:{start_ms:30000,end_ms:60000}},condition_strength:'high'}))}};
  await save('repair-request',body);await save('repairs',{seconds:offset,sections:repairs,reason:'Zero-duration words in acoustic alignment: dhyanam 2, chaupais 5–8, final invocations'});
  const {record}=await paid('repair-song','https://api.elevenlabs.io/v1/music/detailed?output_format=mp3_48000_192',body,apiKey,true);console.log(JSON.stringify(record));return;
 }
 if(mode==='upload'){
  assert(!stored,'Reference already uploaded');const form=new FormData();form.append('file',new Blob([new Uint8Array(await readFile(sample))],{type:'audio/mpeg'}),'approved-preview.mp3');form.append('with_timestamps','true');
  const {bytes}=await paid('reference-upload','https://api.elevenlabs.io/v1/music/upload',form,apiKey);
  const result=JSON.parse(bytes.toString());assert(result.song_id);await save('reference-upload',result);console.log(JSON.stringify({uploaded:true,songId:result.song_id,wordCount:result.words_timestamps?.length}));return;
 }
 if(mode==='generate'){
  assert(stored,'Upload the approved reference first');
  const {record}=await paid('full-song','https://api.elevenlabs.io/v1/music/detailed?output_format=mp3_48000_192',request,apiKey,true);console.log(JSON.stringify(record));return;
 }
 if(mode==='align'){
  const form=new FormData();form.append('file',new Blob([new Uint8Array(await readFile(`${root}/full-song-master.wav`))],{type:'audio/wav'}),'full-song.wav');form.append('text',units.map(x=>x.text).join('\n'));
  const {bytes}=await paid('forced-alignment','https://api.elevenlabs.io/v1/forced-alignment',form,apiKey);
  const result=JSON.parse(bytes.toString());await save('alignment',result);console.log(JSON.stringify({words:result.words?.length,loss:result.loss}));
 }
}
main().catch(e=>{console.error(e instanceof assert.AssertionError||String(e.message).startsWith('Provider rejected')?e.message:'Stage failed; inspect saved attempts. Credentials were not logged.');process.exitCode=1;}).finally(()=>db.$disconnect());
