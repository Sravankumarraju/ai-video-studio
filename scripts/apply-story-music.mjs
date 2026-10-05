import 'dotenv/config';
import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const dir=process.argv[2]||'data/productions/divine-wisdom/gita-chapter-1/story-v4',config=JSON.parse(await readFile(`${dir}/episode.json`,'utf8')),state=JSON.parse(await readFile(`${dir}/state.json`,'utf8'));
assert.equal(config.productionKind,'chapter-meaning','Music belongs only to the approved full-chapter style');
const file='data/productions/divine-wisdom/animation-samples/original-devotional-bed-normalized.wav';
if(!state.musicId){state.musicId=JSON.parse(execFileSync(process.execPath,['--import','tsx','scripts/upload-owner-asset.ts',config.projectId,file],{encoding:'utf8'})).id;await writeFile(`${dir}/state.json`,JSON.stringify(state,null,2));}
const client=new Client({name:'story-soft-music',version:'1'});await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`,Connection:'close'}}}));
try{const result=await client.callTool({name:'get_project',arguments:{projectId:config.projectId}});assert(!result.isError);const p=JSON.parse(result.content.find(c=>c.type==='text').text);p.document.musicId=state.musicId;p.document.musicVolume=.22;p.document.ducking=true;const saved=await client.callTool({name:'update_project',arguments:{projectId:p.id,expectedRevision:p.revision,document:p.document}});assert(!saved.isError);config.originalMusic=true;await writeFile(`${dir}/episode.json`,JSON.stringify(config,null,2));await copyFile('data/productions/divine-wisdom/animation-samples/MUSIC-PROVENANCE.json',`${dir}/MUSIC-PROVENANCE.json`);console.log(JSON.stringify({softMusicSaved:true,ducking:true,volume:.22,noAnimation:true,noPaidMusicCalls:true}));}finally{await client.close();}
