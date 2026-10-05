import 'dotenv/config';
import {readFile,writeFile,copyFile,access} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const root='data/productions/divine-wisdom/devi-navaratri-2026';
const backgrounds=JSON.parse(await readFile(root+'/shared-backgrounds-v2.json','utf8'));
const plan=JSON.parse(await readFile(root+'/production-plan.json','utf8'));
const client=new Client({name:'navaratri-background-correction',version:'1.0'});
assert(process.env.STORY_STUDIO_MCP_TOKEN);
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args});assert(!r.isError);return JSON.parse(r.content.find(c=>c.type==='text').text);}
try{
 for(const video of plan.videos){
  const config=JSON.parse(await readFile(video.dir+'/episode.json','utf8'));
  const state=JSON.parse(await readFile(video.dir+'/state.json','utf8'));
  for(const batch of state.batches){assert(state.jobs[batch.id]);assert.equal((await call('get_job',{jobId:state.jobs[batch.id]})).state,'completed','Wait for narration before modifying the project');}
  if(state.backgroundEdition===2)continue;
  const prompts=JSON.parse(await readFile(video.dir+'/image-prompts.json','utf8'));
  const project=await call('get_project',{projectId:video.projectId});
  for(const background of backgrounds){
   const file=video.dir+'/'+background.name+'.png';
   await copyFile(file,video.dir+'/'+background.name+'-rejected-v1.png');
   await copyFile(file+'.generation.json',video.dir+'/'+background.name+'-rejected-v1.png.generation.json');
   await copyFile(background.source,file);
   const prompt=prompts.find(p=>p.name===background.name);prompt.previousPrompt=prompt.prompt;prompt.prompt=background.prompt;prompt.source=background.source;
   const bytes=await readFile(file);
   const asset=await call('import_asset',{projectId:video.projectId,name:background.name+'-devi-v2.png',base64:bytes.toString('base64')});
   const previousId=state.images[background.name];state.images[background.name]=asset.id;
   for(const scene of project.document.scenes)if(scene.assetId===previousId){scene.assetId=asset.id;scene.imagePrompt=background.prompt;}
   await writeFile(file+'.generation.json',JSON.stringify({...background,tool:'built-in imagegen',reviewStatus:'visually reviewed; no Krishna or other scripture characters',correction:'Replace the accidentally reused Gita background'},null,2));
  }
  project.document.promptOverrides.navaratriIllustrationPlan=JSON.stringify(prompts,null,2);
  await call('update_project',{projectId:video.projectId,expectedRevision:project.revision,document:project.document});
  state.previousRenderJobs??=[];state.previousRenderJobs.push({reason:'Corrected shared Navaratri backgrounds',jobs:{...state.renderJobs}});state.renderJobs={};state.backgroundEdition=2;
  for(const kind of ['draft','full'])for(const extension of ['mp4','srt','vtt']){const file=video.dir+'/'+config.fileStem+'-'+kind+'.'+extension;if(await access(file).then(()=>true).catch(()=>false))await copyFile(file,video.dir+'/'+config.fileStem+'-'+kind+'-background-v1.'+extension);}
  await writeFile(video.dir+'/state.json',JSON.stringify(state,null,2));
  await writeFile(video.dir+'/image-prompts.json',JSON.stringify(prompts,null,2));
  if(project.document.variants.length)await writeFile(video.dir+'/completed-timeline.json',JSON.stringify(await call('get_project',{projectId:video.projectId}),null,2));
  console.log(JSON.stringify({slug:video.slug,backgroundEdition:2,narrationReused:true}));
 }
}finally{await client.close();}
