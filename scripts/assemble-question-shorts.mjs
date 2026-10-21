import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import {basename} from 'node:path';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const dir=process.argv[2];assert(dir);
const config=JSON.parse(await readFile(`${dir}/episode.json`,'utf8'));
const state=JSON.parse(await readFile(`${dir}/state.json`,'utf8'));
assert.equal(state.batches.length,1);assert.equal(Object.keys(state.jobs).length,1);
const client=new Client({name:'question-short-assembly',version:'1'});
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`,Connection:'close'}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args});assert(!r.isError,r.content.find(x=>x.type==='text')?.text);return JSON.parse(r.content.find(x=>x.type==='text').text);}
async function asset(file){const b=await readFile(file);assert(b.length<8*1024*1024);return (await call('import_asset',{projectId:state.projectId,name:basename(file),base64:b.toString('base64')})).id;}
const save=()=>writeFile(`${dir}/state.json`,JSON.stringify(state,null,2));
try{
 const p=await call('get_project',{projectId:state.projectId});
 if(p.document.variants.some(v=>v.id===config.variantId)){console.log('Existing portrait assembly preserved');process.exitCode=0;}
 else{
  const batch=state.batches[0],source=p.document.scenes.find(s=>s.id===batch.id),finished=state.finished[batch.id];
  assert(source?.audioId&&!source.narrationStale&&finished?.audioId);
  const audio=p.assets.find(a=>a.id===finished.audioId);assert(audio?.duration);
  const words=source.captions.flatMap(c=>c.words||[]);assert.equal(words.length,batch.text.trim().split(/\s+/u).length);
  if(!state.images.hero){state.images.hero=await asset(`${dir}/hero.png`);await save();}
  if(!state.images.teaching){state.images.teaching=await asset('data/productions/divine-wisdom/gita-1-21/devotional-v1/hero.png');await save();}
  if(!state.logoId){state.logoId=await asset('data/branding/divine-wisdom/logo-samples/01-lotus-book.png');await save();}
  await writeFile(`${dir}/narration-sources.json`,JSON.stringify([source],null,2));
  // Split at complete spoken sentences so every word stays aligned once.
  const sentences=batch.text.match(/[^.!?]+[.!?]?/gu).map(s=>s.trim()).filter(Boolean);
  let atWord=0;const segments=sentences.map((s,i)=>{const count=s.split(/\s+/u).length;const ws=words.slice(atWord,atWord+count);atWord+=count;return {text:s,ws,i};});assert.equal(atWord,words.length);
  const boundaries=[0,...segments.slice(1).map((s,i)=>(segments[i].ws.at(-1).end+s.ws[0].start)/2),audio.duration];
  const scenes=segments.map((seg,i)=>{const start=boundaries[i],end=boundaries[i+1];const aligned=seg.ws.map(w=>({...w,start:Math.max(0,w.start-start),end:Math.min(end-start,w.end-start)}));return {id:`${config.prefix}-beat-${i}`,title:i===0?'Question':`Explanation ${i}`,narration:seg.text,assetId:i>0&&i<3?state.images.teaching:state.images.hero,mediaType:'image',audioId:audio.id,audioStart:start,audioSlice:true,duration:end-start,captions:[{id:crypto.randomUUID(),start:aligned[0].start,end:aligned.at(-1).end,text:seg.text,words:aligned,accuracy:'aligned'}],volume:1.25,voiceId:config.voiceId,motion:i%2?'pan-left':'pan-right',motionEasing:'smooth',strength:.018,focalX:.5,focalY:.4,transition:'cut',overlap:0,fadeIn:0,fadeOut:0,narrationStale:false,captionsStale:false,status:'Reviewed original question explanation and modern example'};});
  const publishing={titles:[config.videoTitle+' | Divine Wisdom Telugu #Shorts'],description:`${config.videoTitle}\n\nభగవద్గీత ${config.reference} ఆధారంగా స్వతంత్ర తెలుగు వివరణ. ఆధునిక ఉదాహరణను మూల బోధన నుంచి వేరుగా వివరించాం.\n\nSource: ${config.sources[0]}\nAI-assisted visuals and saved AI narration; original researched explanation and examples. Corrections with source references are welcome.\n#BhagavadGita #Telugu #DivineWisdomTelugu #Shorts`,tags:['Bhagavad Gita Telugu','Telugu question','Divine Wisdom Telugu'],hashtags:['#BhagavadGita','#Telugu','#Shorts'],category:'Education',madeForKids:false};
  publishing.hashtags=publishing.hashtags.join(' ');
  p.document.scenes=p.document.scenes.filter(s=>s.id!==batch.id).concat(scenes);
  p.document.targetDuration=60;p.document.publishing=publishing;
  p.document.variants.push({id:config.variantId,name:'Question Short · Telugu · 9:16',aspect:'vertical',sceneIds:scenes.map(s=>s.id),sceneOverrides:{},framing:{},fps:30,crf:20,bitrate:'8M',captions:true,wordHighlight:true,highlightColor:'#ffd54a',font:'Noto Sans Telugu',fontSize:58,color:'#ffffff',outline:3,background:true,position:'bottom',captionBottom:.2,encodingPreset:'fast',logoId:state.logoId,logoStart:0,targetDuration:60,maxDuration:90,publishing});
  await call('update_project',{projectId:state.projectId,expectedRevision:p.revision,document:p.document});
  state.seconds=audio.duration;state.sceneIds=scenes.map(s=>s.id);await save();await writeFile(`${dir}/publishing.json`,JSON.stringify(publishing,null,2));
  console.log(JSON.stringify({projectId:state.projectId,seconds:audio.duration,scenes:scenes.length,aspect:'vertical',voiceCalls:1}));
 }
}finally{await client.close();}
