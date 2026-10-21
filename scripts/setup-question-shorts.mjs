import 'dotenv/config';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const dir='data/productions/divine-wisdom/question-shorts-week-01';
const plan=JSON.parse(await readFile(`${dir}/NARRATION-PLAN.json`,'utf8'));
assert.equal(plan.plannedCalls,5);assert.equal(plan.characters,2980);
const refs=['2.47','2.62â€“2.63','3.21','4.34','5.10'];
const client=new Client({name:'question-shorts-setup',version:'1'});
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`,Connection:'close'}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args});assert(!r.isError,r.content.find(x=>x.type==='text')?.text);return JSON.parse(r.content.find(x=>x.type==='text').text);}
try{for(const [i,s] of plan.shorts.entries()){
 assert.equal(s.narration.length,s.characters);assert.equal(createHash('sha256').update(s.narration).digest('hex'),s.sha256);
 const epDir=`${dir}/${s.id}`;await mkdir(epDir,{recursive:true});
 let config=await readFile(`${epDir}/episode.json`,'utf8').then(JSON.parse).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
 if(!config){const p=await call('create_project',{document:{title:`Divine Wisdom Telugu Â· ${s.title} Â· Question Short`,topic:s.title,category:'Devotional',language:'te',subtitleLanguage:'te',targetDuration:60,mode:'manual',reviewCheckpoints:true,budget:5,generationLimit:1,unknownCostPolicy:'block',sourceClassification:'traditional',audience:'Telugu viewers',style:'Original researched explanations with relatable modern examples; portrait'}});
 config={projectId:p.id,title:p.title||`Divine Wisdom Telugu Â· ${s.title} Â· Question Short`,productionKind:'question-short',voiceId:plan.voiceId,prefix:s.id,fileStem:s.id,variantId:`${s.id}-portrait-v1`,authorizedNarrationCalls:1,reference:refs[i],videoTitle:s.title,sourceNotes:'Original Telugu commentary; modern example distinguished from scripture. Human approved 5 calls / 2980 characters, saved voice and unknown pricing. All uploads held.',sources:['https://sanskritdocuments.org/doc_giitaa/bhagvadnew.html'],sections:[{id:'narration',title:s.title,text:s.narration,image:'hero'}]};
 await writeFile(`${epDir}/episode.json`,JSON.stringify(config,null,2));}
 await writeFile(`${epDir}/authorization.json`,JSON.stringify({humanApproval:'approved',calls:1,characters:s.characters,sha256:s.sha256,voiceId:plan.voiceId,unknownCostPolicy:'allow',youtubeUploadAuthorized:false,approvedAt:new Date().toISOString()},null,2));
 s.projectId=config.projectId;s.directory=epDir;s.reference=refs[i];s.paidNarrationAuthorized=true;
 await writeFile(`${dir}/NARRATION-PLAN.json`,JSON.stringify(plan,null,2));
}plan.status='authorized_production';plan.paidNarrationAuthorized=true;plan.authorization='Human approved this exact five-call / 2980-character saved-voice plan';await writeFile(`${dir}/NARRATION-PLAN.json`,JSON.stringify(plan,null,2));console.log(JSON.stringify({projects:plan.shorts.map(s=>({id:s.id,projectId:s.projectId})),calls:5,characters:2980}));}finally{await client.close();}

