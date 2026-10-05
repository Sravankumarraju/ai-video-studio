import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const root='data/productions/divine-wisdom/devi-navaratri-2026';
const plan=JSON.parse(await readFile(root+'/production-plan.json','utf8'));
assert(process.env.STORY_STUDIO_MCP_TOKEN);
const client=new Client({name:'navaratri-image-plan',version:'1.0'});
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`}}}));
async function call(name,args){const result=await client.callTool({name,arguments:args});assert(!result.isError,'Story Studio operation failed');return JSON.parse(result.content.find(c=>c.type==='text').text);}
try{
 for(const video of plan.videos){
  const config=JSON.parse(await readFile(video.dir+'/episode.json','utf8'));
  const state=JSON.parse(await readFile(video.dir+'/state.json','utf8'));
  const prompts=JSON.parse(await readFile(video.dir+'/image-prompts.json','utf8'));
  const project=await call('get_project',{projectId:video.projectId});
  assert(!Object.keys(state.jobs).length&&!project.document.variants.length,'Only update unvoiced preparation projects');
  project.document.promptOverrides.navaratriIllustrationPlan=JSON.stringify(prompts,null,2);
  for(const batch of state.batches){
   const scene=project.document.scenes.find(s=>s.id===batch.id);assert(scene&&!scene.audioId);
   const section=batch.sections.map(i=>config.sections[i]).find(s=>s.image!=='logo');
   const image=section?.image||'hero';assert(state.images[image]);
   scene.assetId=state.images[image];scene.mediaType='image';scene.imagePrompt=prompts.find(p=>p.name===image).prompt;
   scene.visual='Prepared narration source image; final section-by-section timeline follows measured voice timing';
  }
  await call('update_project',{projectId:video.projectId,expectedRevision:project.revision,document:project.document});
  const checked=await call('get_project',{projectId:video.projectId});
  assert(checked.assets.some(a=>a.id===state.thumbnailId));
  assert(checked.document.scenes.every(s=>s.assetId));
  video.imagesPersisted=true;video.status='images-prepared-awaiting-narration';
  console.log(JSON.stringify({slug:video.slug,assets:checked.assets.length,sourceScenes:state.batches.length,imagesPersisted:true,paidCalls:0}));
 }
 await writeFile(root+'/production-plan.json',JSON.stringify(plan,null,2));
}finally{await client.close();}
