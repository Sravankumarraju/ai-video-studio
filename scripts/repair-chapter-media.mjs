import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const dir='data/productions/divine-wisdom/gita-chapter-1/meaning-v1';
const config=JSON.parse(await readFile(`${dir}/episode.json`,'utf8')),state=JSON.parse(await readFile(`${dir}/state.json`,'utf8'));
const client=new Client({name:'chapter-media-recovery',version:'1'});
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`,Connection:'close'}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args});assert(!r.isError);return JSON.parse(r.content.find(c=>c.type==='text').text);}
try{
 const p=await call('get_project',{projectId:config.projectId});
 // Assets survived; reconstruct checkpoint references without reimporting copies.
 for(const prompt of JSON.parse(await readFile(`${dir}/image-prompts.json`,'utf8'))){const asset=p.assets.find(a=>a.name===`${prompt.name}.png`);assert(asset);state.images[prompt.name]=asset.id;}
 for(const [key,name]of [['logoId','01-lotus-book.png'],['logoClipId','logo-welcome.mp4'],['thumbnailId','thumbnail.png']]){const asset=p.assets.find(a=>a.name===name);assert(asset);state[key]=asset.id;}
 const variant=p.document.variants.find(v=>v.id===config.variantId);assert(variant);
 for(const sec of config.sections){const scene=p.document.scenes.find(s=>s.id===config.prefix+'-'+sec.id);assert(scene);scene.assetId=sec.image==='logo'?state.logoClipId:state.images[sec.image];}
 variant.logoId=state.logoId;
 for(const [kind,id]of Object.entries(state.renderJobs)){const job=await call('get_job',{jobId:id});assert.equal(job.state,'failed','Only repair a failed, never-delivered chapter render');state.failedRenderJobs={...state.failedRenderJobs,[id]:{kind,error:job.error}};delete state.renderJobs[kind];}
 await call('update_project',{projectId:p.id,expectedRevision:p.revision,document:p.document});
 await writeFile(`${dir}/state.json`,JSON.stringify(state,null,2));await writeFile(`${dir}/completed-timeline.json`,JSON.stringify(await call('get_project',{projectId:p.id}),null,2));
 console.log(JSON.stringify({recoveredExistingImages:Object.keys(state.images).length,narrationPreserved:true,failedJobPreserved:true}));
}finally{await client.close();}
