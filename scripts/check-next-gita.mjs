import 'dotenv/config';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const c=new Client({name:'gita-status-check',version:'1'});
await c.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`,Connection:'close'}}}));
async function call(name,args){const r=await c.callTool({name,arguments:args});const t=r.content.find(x=>x.type==='text')?.text;assert(!r.isError,t);return JSON.parse(t);}
try{for(const n of [7,8,9,10]){
 const dir=`data/productions/divine-wisdom/gita-1-${n}/devotional-v1`;
 const config=JSON.parse(await readFile(`${dir}/episode.json`,'utf8'));
 const p=await call('get_project',{projectId:config.projectId});
 const s=JSON.parse(await readFile(`${dir}/state.json`,'utf8'));
 const selected=process.argv.includes('--compact')?(Object.keys(s.renderJobs).length?s.renderJobs:Object.fromEntries(Object.entries(s.jobs).slice(-1))):{...s.jobs,...s.renderJobs};
 const jobs=[];for(const [key,id] of Object.entries(selected)){const j=await call('get_job',{jobId:id});jobs.push({key,state:j.state,stage:j.stage,error:j.error});}
 console.log(JSON.stringify({episode:`1.${n}`,unknownCostPolicy:p.document.unknownCostPolicy,budget:p.document.budget,generationLimit:p.document.generationLimit,narratedScenes:p.document.scenes.filter(x=>x.audioId).length,variants:p.document.variants.map(x=>x.id),jobs}));
}}finally{await c.close();}
