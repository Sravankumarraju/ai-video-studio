import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const projectId='a39b4823-f4d4-436b-be68-7d6694418d36',variantId='gita-247-strong-voice',dir='data/productions/bhagavad-gita-telugu';
const token=process.env.STORY_STUDIO_MCP_TOKEN;
const client=new Client({name:'gita-247-audio-finishing',version:'1.0'});
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${token}`}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args});const t=r.content.find(c=>c.type==='text')?.text;if(r.isError)throw Error(t);return JSON.parse(t);}
function docker(args){return execFileSync('docker',['compose',...args],{encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:4*1024*1024});}
try {
 let p=await call('get_project',{projectId});const scenes=p.document.scenes.filter(s=>s.id.startsWith('gita-247-te-'));
 if(scenes.length!==8||scenes.some(s=>!s.audioId))throw Error('Eight complete recordings required');
 const updates=[];
 for(const s of scenes){
  if(s.promptOverrides.audioFinishing){console.log(JSON.stringify({scene:s.id,status:'Already finished'}));continue;}
  const originalAudioId=s.audioId;const asset=p.assets.find(a=>a.id===originalAudioId);
  const response=await fetch(`http://localhost:3000/api/mcp/files/assets/${originalAudioId}`,{headers:{Authorization:`Bearer ${token}`}});
  if(!response.ok)throw Error(`Download HTTP ${response.status}`);
  const original=`${dir}/${s.id}-original.mp3`,processed=`${dir}/${s.id}-enhanced.wav`;
  await writeFile(original,Buffer.from(await response.arrayBuffer()));
  docker(['cp',original,`app:/app/test-output/${s.id}-original.mp3`]);
  const recorded=asset.duration || s.duration;
  const filter=`rubberband=tempo=1:pitch=1.0293022366:formant=preserved:pitchq=quality,bass=g=3:f=120:w=0.7,apad,atrim=duration=${recorded},asetpts=PTS-STARTPTS`;
  docker(['exec','-T','app','ffmpeg','-v','error','-i',`/app/test-output/${s.id}-original.mp3`,'-af',filter,'-ar','48000','-ac','1','-c:a','pcm_s16le','-y',`/app/test-output/${s.id}-enhanced.wav`]);
  const probe=JSON.parse(docker(['exec','-T','app','ffprobe','-v','error','-show_entries','format=duration','-of','json',`/app/test-output/${s.id}-enhanced.wav`]));
  const actual=Number(probe.format.duration);if(Math.abs(actual-recorded)>0.025)throw Error('Pitch processing changed narration timing');
  docker(['cp',`app:/app/test-output/${s.id}-enhanced.wav`,processed]);
  const name=`${s.id}-${originalAudioId}-enhanced.wav`;
  const imported=p.assets.find(a=>a.name===name)||await call('import_asset',{projectId,name,base64:(await readFile(processed)).toString('base64')});
  updates.push({id:s.id,originalAudioId,audioId:imported.id,duration:actual,filter});
  console.log(JSON.stringify({scene:s.id,recordedSeconds:recorded,processedSeconds:actual,audioId:imported.id}));
 }
 p=await call('get_project',{projectId});
 for(const u of updates){const s=p.document.scenes.find(s=>s.id===u.id);if(s.audioId!==u.originalAudioId)throw Error('Recording changed while finishing');s.audioId=u.audioId;s.duration=u.duration;s.volume=1.25;s.promptOverrides.audioFinishing=JSON.stringify({originalAudioId:u.originalAudioId,bassDb:3,bassHz:120,pitchSemitones:0.5,tempo:1,volume:1.25,filter:u.filter});s.status='Bass +3 dB, pitch +0.5 semitone, volume +25%; original retained';s.narrationStale=false;s.captionsStale=false;}
 const selected=p.document.scenes.filter(s=>s.id.startsWith('gita-247-te-'));const total=selected.reduce((n,s)=>n+s.duration,0);const pause=Math.max(0,120-total)/selected.length;
 selected.forEach(s=>s.duration+=pause);
 await call('update_project',{projectId,expectedRevision:p.revision,document:p.document});
 p=await call('get_project',{projectId});
 await writeFile(`${dir}/gita-247-production.json`,JSON.stringify({projectId,variantId,document:p.document,revision:p.revision,assets:p.assets,processing:updates},null,2));
 console.log(JSON.stringify({stage:'Audio ready for caption review',narrationSeconds:total,timelineSeconds:Math.max(120,total)}));
}finally{await client.close();}
