import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const dir='data/productions/divine-wisdom/hanuman-chalisa',mode=process.argv[2]||'assemble';
const state=await readFile(`${dir}/state.json`,'utf8').then(JSON.parse).catch(e=>{if(e.code!=='ENOENT')throw e;return {assets:{},renderJobs:{}};});
const save=()=>writeFile(`${dir}/state.json`,JSON.stringify(state,null,2));
assert(process.env.STORY_STUDIO_MCP_TOKEN,'Connector token unavailable');
const client=new Client({name:'hanuman-illustrated-production',version:'1.0'});
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args});const text=r.content.find(c=>c.type==='text')?.text;assert(!r.isError,text);return JSON.parse(text);}
async function asset(key,file){if(!state.assets[key]){const b=await readFile(file);state.assets[key]=b.length>8*1024*1024?JSON.parse(execFileSync(process.execPath,['--import','tsx','scripts/upload-owner-asset.ts',state.projectId,file],{encoding:'utf8'})).id:(await call('import_asset',{projectId:state.projectId,name:path.basename(file),base64:b.toString('base64')})).id;await save();}return state.assets[key];}
try{
 if(mode==='assemble'){
  const source=JSON.parse(await readFile(`${dir}/licensed-recording-candidate.json`,'utf8'));
  const publishing={titles:['Hanuman Chalisa | శ్రీ హనుమాన్ చాలీసా | P.B. Sreenivas | Divine Wisdom Telugu'],description:`Divine Wisdom Telugu presents an illustrated Hanuman Chalisa devotional video.\n\nAudio: Sri Hanuman Chalisa, performed by P.B. Sreenivas. Music: M. Ranga Rao. Source and attribution: Saregama Carnatic Classical.\nOriginal source: ${source.originalSource}\nLicense source: ${source.source}\nLicensed under Creative Commons Attribution 3.0: ${source.licenseUrl}\nChanges: Hanuman Chalisa excerpt from the compilation (09:40–23:05), paired with original AI illustrations and channel branding. No endorsement is implied. This is an existing licensed singing performance, not a newly generated AI vocal.\n\nVisuals: original imaginative AI devotional illustrations of Hanuman, with very gentle camera movement. They are artistic depictions. No Shorts edition.\n\nSubscribe, like, share and comment on Divine Wisdom Telugu.\n\n#HanumanChalisa #Hanuman #DivineWisdomTelugu #హనుమాన్\n\nఏదైనా తప్పు ఉంటే దయచేసి తెలియజేయండి. భక్తుల మనోభావాలను గౌరవిస్తూ క్షమాపణలు కోరుతున్నాం; పరిశీలించి సరిచేస్తాం.`,hashtags:'#HanumanChalisa #Hanuman #DivineWisdomTelugu #హనుమాన్',thumbnailPrompt:'Beautiful dignified Hanuman portrait, luminous gold halo, rich red and gold, dark clear area for a separately typeset Hanuman Chalisa title, 16:9.',chapters:'00:00 Divine Wisdom Telugu\n00:03 Hanuman Chalisa'};
  await writeFile(`${dir}/publishing.json`,JSON.stringify(publishing,null,2));await writeFile(`${dir}/description.md`,publishing.description);
  if(!state.projectId){const p=await call('create_project',{document:{title:'Hanuman Chalisa · Divine Wisdom Telugu · illustrated edition',topic:'Owner-selected existing Hanuman Chalisa singing with original Hanuman illustrations',category:'Devotional',language:'hi',subtitleLanguage:'hi',mode:'manual',targetDuration:805,reviewCheckpoints:true,budget:0,generationLimit:0,unknownCostPolicy:'block',sourceClassification:'traditional',sources:source.source,style:'Original cinematic Indian devotional illustrations',audience:'Devotional listeners',publishing}});state.projectId=p.id;await save();}
  await asset('recording',`${dir}/hanuman-chalisa-recording.mp3`);
  await asset('logo','data/branding/divine-wisdom/logo-samples/01-lotus-book.png');
  await asset('logoClip','data/productions/divine-wisdom/gita-1-1/recreated-v3/logo-welcome.mp4');
  const names=['temple-hero','devotion','ocean','mountain','strength','peace'];
  for(const n of names)await asset(n,`${dir}/hanuman-${n}-v1.png`);
  if(!state.assembled){
   const p=await call('get_project',{projectId:state.projectId});
   const prompts=JSON.parse(await readFile(`${dir}/additional-image-prompts.json`,'utf8'));
   const scenes=[{id:'hanuman-logo',title:'Divine Wisdom Telugu',mediaType:'video',assetId:state.assets.logoClip,audioId:state.assets.recording,audioStart:0,audioSlice:true,duration:3,volume:1,fadeIn:0,fadeOut:0,transition:'cut',overlap:0,motion:'static',strength:0,captions:[],status:'Licensed audio; owner listening review pending'}];
   let at=3,i=0;
   while(at<805){const n=names[i%names.length],duration=Math.min(25,805-at);scenes.push({id:`hanuman-art-${i}`,title:`Hanuman devotional illustration ${i+1}`,assetId:state.assets[n],audioId:state.assets.recording,audioStart:at,audioSlice:true,duration,volume:1,fadeIn:0,fadeOut:0,transition:'cut',overlap:0,motion:i%2?'pan-left':'pan-right',motionEasing:'smooth',strength:.018,focalX:.5,focalY:.5,captions:[],imagePrompt:prompts.find(x=>x.file===`hanuman-${n}-v1.png`)?.prompt||'Original Hanuman temple portrait',status:'Original visual; editorial rotation, not verified verse alignment'});at+=duration;i++;}
   scenes.push({id:'hanuman-credits',title:'Recording credits and channel invitation',assetId:state.assets.peace,duration:8,motion:'static',strength:0,transition:'cut',overlap:0,captions:[{id:'closing-credit',start:0,end:8,text:'Divine Wisdom Telugu\nSubscribe · Like · Share · Comment\nAudio: P.B. Sreenivas · Saregama Carnatic Classical\nCC BY 3.0 · Original AI illustrations',accuracy:'manual'}]});
   p.document.scenes.push(...scenes);p.document.variants.push({id:'hanuman-landscape-v1',name:'Hanuman Chalisa · Illustrated 16:9 · Review edition',aspect:'landscape',sceneIds:scenes.map(s=>s.id),captions:true,font:'Noto Sans',fontSize:48,position:'center',outline:3,background:true,wordHighlight:false,logoId:state.assets.logo,logoStart:3,titleOverlay:'Divine Wisdom Telugu',fps:30,crf:20,encodingPreset:'fast',maxDuration:900,targetDuration:813,publishing});
   p.document.styleGuide='Six original Hanuman images rotated every 25 seconds. Smooth restrained pans. One licensed 320 kbps audio source with contiguous offsets, constant gain and no audio fades at cuts. Lossless master preserved locally. Completeness and language require owner listening review. No lyric overlays or regenerated prayer text.';
   await call('update_project',{projectId:state.projectId,expectedRevision:p.revision,document:p.document});state.assembled=true;state.seconds=813;state.audioSeconds=805;state.imageCount=6;state.visualChanges=i;await save();await writeFile(`${dir}/completed-timeline.json`,JSON.stringify(await call('get_project',{projectId:state.projectId}),null,2));
  }
 }
 if(['draft','full'].includes(mode)){if(!state.renderJobs[mode]){state.renderJobs[mode]=(await call('queue_render',{projectId:state.projectId,variantId:'hanuman-landscape-v1',draft:mode==='draft'})).id;await save();}console.log(JSON.stringify(await call('get_job',{jobId:state.renderJobs[mode]})));}
 if(mode==='status'){for(const [kind,id] of Object.entries(state.renderJobs)){const j=await call('get_job',{jobId:id});console.log(JSON.stringify({kind,id,state:j.state,stage:j.stage,error:j.error}));}}
 if(mode==='download'){const kind=process.argv[3]||'full',id=state.renderJobs[kind];assert.equal((await call('get_job',{jobId:id})).state,'completed');const r=await fetch(`http://localhost:3000/api/mcp/files/jobs/${id}/download?format=mp4`,{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`}});assert(r.ok);await writeFile(`${dir}/hanuman-chalisa-${kind}.mp4`,Buffer.from(await r.arrayBuffer()));}
 console.log(JSON.stringify({projectId:state.projectId,assembled:state.assembled,seconds:state.seconds}));
}finally{await client.close();}
