import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const root='data/productions/divine-wisdom/motivation-shorts-40';
const plan=JSON.parse(await readFile(`${root}/NARRATION-PLAN.json`,'utf8'));
assert(plan.paidNarrationAuthorized&&plan.uploadHold);assert.equal(plan.plannedCalls,40);assert.equal(plan.characters,17313);
const client=new Client({name:'motivation-shorts-40-setup',version:'1'});
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`,Connection:'close'}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args});assert(!r.isError,r.content.find(x=>x.type==='text')?.text);return JSON.parse(r.content.find(x=>x.type==='text').text);}
try{for(const s of plan.shorts){
 assert.equal(s.narration.length,s.characters);assert.equal(createHash('sha256').update(s.narration).digest('hex'),s.sha256);
 let config=await readFile(`${s.directory}/episode.json`,'utf8').then(JSON.parse).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
 if(!config){
  const title=`Divine Wisdom Telugu · ${s.title} · Motivation ${s.id.slice(-3)}`;
  const p=await call('create_project',{document:{title,topic:s.title,category:'Devotional',language:'te',subtitleLanguage:'te',targetDuration:50,mode:'manual',reviewCheckpoints:true,budget:5,generationLimit:1,unknownCostPolicy:'block',sourceClassification:'traditional',audience:'Telugu viewers',style:'Original Gita motivation with explicitly marked modern examples; portrait'}});
  config={projectId:p.id,title,productionKind:'question-short',voiceId:plan.voiceId,prefix:s.id,fileStem:s.id,variantId:`${s.id}-portrait-v1`,authorizedNarrationCalls:1,reference:s.reference,videoTitle:s.title,targetSeconds:s.targetSeconds,sourceNotes:'Original Telugu commentary and identified modern analogy, chapter context preserved. Human preapproved 40 additional motivation Shorts using saved voice and credits. Frozen batch 40 calls / 17313 characters, unknown provider price. All uploads on hold.',sources:['https://sanskritdocuments.org/doc_giitaa/bhagvadnew.html'],sections:[{id:'narration',title:s.title,text:s.narration,image:'hero'}]};
  await writeFile(`${s.directory}/episode.json`,JSON.stringify(config,null,2));
 }
 s.projectId=config.projectId;
 await writeFile(`${s.directory}/authorization.json`,JSON.stringify({humanApproval:plan.humanAuthorization,calls:1,characters:s.characters,sha256:s.sha256,voiceId:plan.voiceId,unknownCostPolicy:'allow',youtubeUploadAuthorized:false},null,2));
 await writeFile(`${root}/NARRATION-PLAN.json`,JSON.stringify(plan,null,2));
}plan.status='projects_ready';await writeFile(`${root}/NARRATION-PLAN.json`,JSON.stringify(plan,null,2));console.log(JSON.stringify({projects:40,calls:40,characters:17313,paidJobsQueued:0}));}finally{await client.close();}
