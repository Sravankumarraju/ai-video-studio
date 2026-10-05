import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {assertNavaratriVisualReferences} from './divine-production-policy.mjs';
const root='data/productions/divine-wisdom/devi-navaratri-2026';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const save=(p,v)=>writeFile(p,JSON.stringify(v,null,2));
const plan=await read(root+'/production-plan.json'),queue=await read(root+'/grace-art-queue.json');
const client=new Client({name:'navaratri-grace-correction',version:'1.0'});
assert(process.env.STORY_STUDIO_MCP_TOKEN);
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args});assert(!r.isError);return JSON.parse(r.content.find(c=>c.type==='text').text);}
try{
 for(const video of plan.videos){
  const config=await read(video.dir+'/episode.json'),state=await read(video.dir+'/state.json');
  if(state.graceEdition===3)continue;
  assert(state.batches.every(b=>state.finished[b.id]),'Finish narration before editing checkpoint');
  const prompts=await read(video.dir+'/image-prompts.json'),project=await call('get_project',{projectId:video.projectId});
  const specs=queue.filter(q=>q.slug===video.slug||video.slug==='intro'&&q.slug.startsWith('intro-'));
  for(const spec of specs){
   const key=spec.destination.split('/').at(-1).replace('.png','');
   const bytes=await readFile(spec.destination);
   const asset=await call('import_asset',{projectId:video.projectId,name:key+'-devi-v3.png',base64:bytes.toString('base64')});
   state.images[key]=asset.id;
   const entry={name:key,prompt:spec.prompt,source:spec.destination,reference:spec.reference,reviewStatus:'visually reviewed; correct goddess identity, no Krishna or Mahabharata characters'};
   const index=prompts.findIndex(p=>p.name===key);if(index<0)prompts.push(entry);else prompts[index]=entry;
   const provenance=await read(spec.destination+'.generation.json');
   await save(spec.destination+'.generation.json',{...provenance,reviewStatus:entry.reviewStatus});
  }
  if(video.slug==='intro'){
   config.deviOnlyIntro=true;
   const images=['hero','grace','story','blessing','sanctuary','grace','blessing','sanctuary','hero','blessing','grace'];
   let n=0;for(const section of config.sections)if(section.image!=='logo')section.image=images[n++%images.length];
  }else for(const section of config.sections)if(['hook','meaning','conclusion','closing'].includes(section.id))section.image='grace';
  for(const section of config.sections){
   const scene=project.document.scenes.find(s=>s.id===config.prefix+'-'+section.id);
   if(!scene)continue;
   scene.assetId=section.image==='logo'?state.logoClipId:state.images[section.image];
   scene.imagePrompt=prompts.find(p=>p.name===section.image)?.prompt||scene.imagePrompt;
   scene.visual=video.slug==='intro'?'Durga Devi devotional illustration':'Reviewed Navadurga devotional illustration';
  }
  if(project.document.variants.some(v=>v.id===config.variantId))assertNavaratriVisualReferences(config,state,project.document.scenes);
  project.document.promptOverrides.navaratriIllustrationPlan=JSON.stringify(prompts,null,2);
  await call('update_project',{projectId:video.projectId,expectedRevision:project.revision,document:project.document});
  state.previousRenderJobs??=[];if(Object.keys(state.renderJobs||{}).length)state.previousRenderJobs.push({reason:'Durga-only introduction and reviewed celestial Devi visuals',jobs:state.renderJobs});
  state.renderJobs={};state.graceEdition=3;
  await save(video.dir+'/episode.json',config);await save(video.dir+'/image-prompts.json',prompts);await save(video.dir+'/state.json',state);
  if(project.document.variants.length)await save(video.dir+'/completed-timeline.json',await call('get_project',{projectId:video.projectId}));
  console.log(JSON.stringify({slug:video.slug,graceEdition:3,deviOnlyIntro:!!config.deviOnlyIntro,narrationReused:true}));
 }
}finally{await client.close();}
