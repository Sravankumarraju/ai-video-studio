import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const root='data/productions/divine-wisdom/motivation-shorts-40';
const plan=JSON.parse(await readFile(`${root}/NARRATION-PLAN.json`,'utf8'));
const client=new Client({name:'motivation-render-status',version:'1'});
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`,Connection:'close'}}}));
const results=[];
try{for(const s of plan.shorts){const state=await readFile(`${s.directory}/state.json`,'utf8').then(JSON.parse).catch(e=>{if(e.code!=='ENOENT')throw e;return {};});if(!state.renderJobs?.full)continue;
const r=await client.callTool({name:'get_job',arguments:{jobId:state.renderJobs.full}});assert(!r.isError);const j=JSON.parse(r.content.find(x=>x.type==='text').text);results.push({id:s.id,jobId:j.id,state:j.state,stage:j.stage,error:j.error||null});}
await writeFile(`${root}/render-progress.json`,JSON.stringify({updatedAt:new Date().toISOString(),results},null,2));console.log(JSON.stringify(results));}finally{await client.close();}
