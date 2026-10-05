import 'dotenv/config';
import {productionPolicy} from './divine-production-policy.mjs';
import {readFile,access,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const dir=process.argv[2]||'data/productions/divine-wisdom/gita-chapter-1/meaning-v1';
const state=()=>readFile(`${dir}/state.json`,'utf8').then(JSON.parse);
const run=(mode,kind)=>console.log(execFileSync(process.execPath,['scripts/divine-long-episode.mjs',dir,mode,...(kind?[kind]:[])],{encoding:'utf8',maxBuffer:8*1024*1024}).trim());
const client=new Client({name:'gita-chapter-render-monitor',version:'1'});
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`,Connection:'close'}}}));
async function wait(id){let previous='';for(;;){const r=await client.callTool({name:'get_job',arguments:{jobId:id}});assert(!r.isError);const j=JSON.parse(r.content.find(x=>x.type==='text').text),label=j.state+': '+j.stage;if(label!==previous){console.log(JSON.stringify({jobId:id,state:j.state,stage:j.stage,error:j.error}));previous=label;}if(j.state==='completed')return;assert(!['failed','cancelled','stale'].includes(j.state),j.error||j.state);await new Promise(r=>setTimeout(r,8000));}}
try{
 for(;;){const s=await state();if(s.batches.every(b=>s.finished[b.id]))break;await new Promise(r=>setTimeout(r,8000));}
 run('assemble');
 for(const kind of ['draft','full']){
  run(kind);await wait((await state()).renderJobs[kind]);
  if(!await access(`${dir}/verification-${kind}.json`).then(()=>true).catch(()=>false)){
   run('download',kind);
   console.log(execFileSync(process.execPath,['scripts/divine-long-episode-check.mjs',dir,kind],{encoding:'utf8',maxBuffer:8*1024*1024}).trim());
  }
 }
 const verified=JSON.parse(await readFile(`${dir}/verification-full.json`,'utf8'));
 const config=JSON.parse(await readFile(`${dir}/episode.json`,'utf8'));
 const {chapterNumber,verseCount}=productionPolicy(config);
 assert((verified.allVerseMeaningsCovered||verified.all47VerseMeaningsCovered)&&verified.noSanskritRecitation&&verified.decodedEntireFile);
 await writeFile(`${dir}/README.md`,`# Complete Bhagavad Gita Chapter ${chapterNumber}: Telugu meaning and significance\n\nCompleted 1080p 16:9 H.264/AAC, ${(verified.seconds/60).toFixed(2)} minutes. All ${verseCount} verse meanings individually covered, no Sanskrit recitation, no music, selected authorized voice. Spoken/displayed verse labels, clear Telugu word highlighting, gentle eased pans, approved logo welcome and subscribe/like/share/comment ending.\n\nEntire MP4 decoding and timeline/word alignment checks passed. Browser playback is recorded separately in browser-full-verification.json.\n\nFiles: ${config.fileStem}-full.mp4, SRT/VTT captions, script-te.md, editable episode.json, image-prompts.json, coverage.json, thumbnail and publishing files. Resume each stage using scripts/divine-long-episode.mjs; keep state.json and saved job IDs.\n\nOpen http://localhost:3000 → Devotional projects → Bhagavad Gita · Telugu → complete Chapter 1 → Preview & exports. Start app: docker compose -f compose.yaml -f compose.render-d.yaml up -d --no-build --pull never.\n\nYouTube upload is not part of this render workflow; no live upload attempted.\n`);
 if(config.originalMusic){let summary=await readFile(`${dir}/README.md`,'utf8');summary=summary.replace('no Sanskrit recitation, no music,','no Sanskrit recitation, soft original instrumental music with voice ducking,');await writeFile(`${dir}/README.md`,summary);}
 console.log(`Complete Chapter ${chapterNumber} video exported and decoded successfully.`);
}finally{await client.close();}
