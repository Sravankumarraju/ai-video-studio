import 'dotenv/config';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const kind=process.argv[2]||'draft';assert(['draft','full'].includes(kind));
const chapters=process.argv.slice(3).map(Number);assert(chapters.length&&chapters.every(n=>[7,8,9,10].includes(n)));
const client=new Client({name:'verify-ready-chapter-exports',version:'1'});
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`}}}));
const finished=new Set();
try{
 while(finished.size<chapters.length){
  for(const chapter of chapters){
   if(finished.has(chapter))continue;
   const dir=`data/productions/divine-wisdom/gita-chapter-${chapter}/story-v1`,state=JSON.parse(await readFile(`${dir}/state.json`,'utf8'));
   const jobId=state.renderJobs[kind];if(!jobId)continue;
   const result=await client.callTool({name:'get_job',arguments:{jobId}});assert(!result.isError);
   const job=JSON.parse(result.content.find(c=>c.type==='text').text);
   assert(!['failed','cancelled','waiting-for-input','stale'].includes(job.state),`Chapter ${chapter} ${kind}: ${job.error||job.state}`);
   if(job.state!=='completed')continue;
   const exports=await client.callTool({name:'get_exports',arguments:{jobId}});assert(!exports.isError);assert(!JSON.parse(exports.content.find(c=>c.type==='text').text).stale);
   execFileSync(process.execPath,['scripts/divine-long-episode.mjs',dir,'download',kind],{stdio:'inherit'});
   execFileSync(process.execPath,['scripts/divine-long-episode-check.mjs',dir,kind],{stdio:'inherit'});
   if(kind==='full')execFileSync(process.execPath,['scripts/prepare-chapter-publishing.mjs',dir],{stdio:'inherit'});
   finished.add(chapter);console.log(JSON.stringify({chapter,kind,downloadedAndVerified:true}));
  }
  if(finished.size<chapters.length)await new Promise(r=>setTimeout(r,15000));
 }
}finally{await client.close();}
