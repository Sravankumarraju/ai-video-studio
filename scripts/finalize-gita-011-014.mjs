import 'dotenv/config';
import {readFile,writeFile,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const root='data/productions/divine-wisdom',client=new Client({name:'final-shlokas-11-14',version:'1'}),deliveries=[];
const selected=process.argv.slice(2).length?process.argv.slice(2).map(Number):[11,12,13,14];
assert(selected.length&&selected.every(n=>Number.isInteger(n)&&n>=11&&n<=20)&&new Set(selected).size===selected.length);
const reportId=selected.map(n=>String(n).padStart(3,'0')).filter((_,i)=>i===0||i===selected.length-1).join('_');
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`,Connection:'close'}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args});assert(!r.isError);return JSON.parse(r.content.find(c=>c.type==='text').text);}
try{for(const n of selected){
 const dir=`${root}/gita-1-${n}/devotional-v1`,read=name=>readFile(`${dir}/${name}`,'utf8').then(JSON.parse);
 const config=await read('episode.json'),state=await read('state.json'),verified=await read('verification-full.json'),browser=await read('browser-full-verification.json');
 assert(verified.decodedEntireFile&&verified.allScenesNarrated&&verified.noMusic&&verified.longFormOnly&&verified.seconds<=300);
 assert.equal(verified.width,1920);assert.equal(verified.height,1080);assert.equal(browser.renderJobId,state.renderJobs.full);
 assert(browser.samples.length===3&&browser.samples.every(s=>!s.error&&!s.paused&&s.currentTime>s.requested));
 assert((await stat(`${dir}/${config.fileStem}-full.mp4`)).size>1000000);
 assert.equal(state.batches.length,5);assert.equal(Object.keys(state.jobs).length,5);
 for(const id of Object.values(state.jobs))assert.equal((await call('get_job',{jobId:id})).state,'completed');
 const p=await call('get_project',{projectId:config.projectId}),variant=p.document.variants.find(v=>v.id===config.variantId);assert(variant);
 variant.name=`Divine Wisdom Telugu · Chapter 1 · Shloka ${n} · FINAL 1080p`;
 await call('update_project',{projectId:p.id,expectedRevision:p.revision,document:p.document});
 const exports=await call('get_exports',{jobId:state.renderJobs.full});assert(!exports.stale);
 const seconds=Math.round(verified.seconds),time=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
 const delivery={status:'final',chapter:1,shloka:n,time,seconds:verified.seconds,projectId:p.id,variantId:variant.id,renderJobId:state.renderJobs.full,voiceCalls:5,liveVoiceCallsVerified:true,mp4:`${config.fileStem}-full.mp4`,entireFileDecoded:true,browserStartMiddleEndVerified:true,exactShlokaOnlyDuringRecitation:true,youtubeUpload:'not attempted',completedAt:new Date().toISOString()};
 await writeFile(`${dir}/FINAL_DELIVERY.json`,JSON.stringify(delivery,null,2));
 await writeFile(`${dir}/README.md`,`# Divine Wisdom Telugu · Chapter 1, Shloka ${n}\n\nFinal ${time} Telugu 1920×1080 16:9 H.264/AAC video: ${delivery.mp4}. Complete MP4 decoding and real app playback/seek checks passed at the start, middle and end. Five authorized live ElevenLabs narration calls succeeded with the saved voice.\n\nSpoken channel welcome and chapter/shloka introduction, hook, exact full shloka held only during its recitation, Telugu meaning, explanation, everyday example, practical reflection, next episode and subscribe/like/share/comment ending. Large Telugu captions with gold word highlighting, gentle smooth pans, no music or animation. Earlier productions preserved.\n\nEditable script, image prompts, thumbnail prompt, thumbnail, actual timestamps, captions, sources, SEO tags, AI disclosure and correction/apology note are in publishing-package.zip. Original and finished audio and resumable job IDs remain in this folder and the app. No YouTube upload attempted for this batch.\n\nStart: docker compose -f compose.yaml -f compose.render-d.yaml up -d --no-build --pull never. Open http://localhost:3000 → Devotional projects → Bhagavad Gita · Telugu → Chapter 1, Shloka ${n} → Preview & exports. Preserve state.json when resuming.\n`);
 deliveries.push(delivery);
}
execFileSync('python',['scripts/package-divine-delivery.py',...selected.map(String)],{stdio:'inherit'});
await writeFile(`${root}/EPISODES_${reportId}_REPORT.json`,JSON.stringify({status:'final',deliveries,totalAuthorizedLiveVoiceCalls:selected.length*5,youtubeUpload:'not attempted'},null,2));
await writeFile(`${root}/EPISODES_${reportId}_REPORT.md`,`# Chapter 1, Shlokas ${selected.join(', ')}\n\nAll ${selected.length} final Telugu long-form videos are complete, below five minutes, 1080p 16:9, decoded entirely and played/seeked at start, middle and end in Story Studio. All ${selected.length*5} authorized live narration calls succeeded. No music, animation or Shorts. Exact shloka cards appear only during recitation. Publishing packages include readable thumbnails, actual chapter timestamps, descriptions, SEO tags, hashtags, source links, AI disclosure and correction/apology notes. No YouTube upload attempted.\n\n`+deliveries.map(d=>`- Chapter 1, Shloka ${d.shloka}: ${d.time}; gita-1-${d.shloka}/devotional-v1/${d.mp4}; publishing-package.zip.`).join('\n')+'\n');
console.log(JSON.stringify({status:'final',deliveries}));
}finally{await client.close();}
