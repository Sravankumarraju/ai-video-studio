import 'dotenv/config';
import {readFile,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import assert from 'node:assert/strict';
const episodes=process.argv.slice(2).length?process.argv.slice(2).map(Number):[7,8,9,10];
assert(episodes.every(n=>Number.isInteger(n)&&n>=7&&n<=20));
const c=new Client({name:'gita-render-monitor',version:'1'});
await c.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`,Connection:'close'}}}));
async function job(id){const r=await c.callTool({name:'get_job',arguments:{jobId:id}});const t=r.content.find(x=>x.type==='text')?.text;assert(!r.isError,t);return JSON.parse(t);}
const state=dir=>readFile(`${dir}/state.json`,'utf8').then(JSON.parse);
function run(file,args){const out=execFileSync(process.execPath,[file,...args],{encoding:'utf8',maxBuffer:8*1024*1024});console.log(out.trim());}
async function wait(dir,kind){let previous='';for(;;){const s=await state(dir);if(s.renderJobs[kind]){const j=await job(s.renderJobs[kind]);const label=`${j.state}: ${j.stage}`;if(label!==previous){console.log(JSON.stringify({dir,kind,status:label}));previous=label;}if(j.state==='completed')return;assert(!['failed','cancelled','stale'].includes(j.state),j.error||j.state);}await new Promise(r=>setTimeout(r,8000));}}
try{
 for(const n of episodes){const dir=`data/productions/divine-wisdom/gita-1-${n}/devotional-v1`;await wait(dir,'draft');
  const verified=await access(`${dir}/verification-draft.json`).then(()=>true).catch(()=>false);
  if(!verified){run('scripts/divine-long-episode.mjs',[dir,'download','draft']);run('scripts/divine-long-episode-check.mjs',[dir,'draft']);}
  run('scripts/divine-long-episode.mjs',[dir,'full']);
 }
 for(const n of episodes){const dir=`data/productions/divine-wisdom/gita-1-${n}/devotional-v1`;await wait(dir,'full');
  const verified=await access(`${dir}/verification-full.json`).then(()=>true).catch(()=>false);
  if(!verified){run('scripts/divine-long-episode.mjs',[dir,'download','full']);run('scripts/divine-long-episode-check.mjs',[dir,'full']);}
 }
}finally{await c.close();}
