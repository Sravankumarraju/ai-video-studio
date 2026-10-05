import 'dotenv/config';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const dir='data/productions/divine-wisdom/gita-1-3/devotional-v1',config=JSON.parse(await readFile(`${dir}/episode.json`,'utf8')),state=JSON.parse(await readFile(`${dir}/state.json`,'utf8'));
assert(!state.correctedOpening,'Opening correction already applied');
const client=new Client({name:'correct-gita-opening',version:'1.0'});
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`,Connection:'close'}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args});assert(!r.isError,r.content[0]?.text);return JSON.parse(r.content[0].text);}
try{
 const p=await call('get_project',{projectId:state.projectId});
 await mkdir(`${dir}/initial-draft`,{recursive:true});
 for(const name of ['episode.json','state.json','completed-timeline.json','verification-draft.json','episode-003-draft.mp4','episode-003-draft.srt','episode-003-draft.vtt'])await copyFile(`${dir}/${name}`,`${dir}/initial-draft/${name}`);
 const hook=config.sections.find(s=>s.id==='hook');assert(hook.text.includes('మీ శిష్యుడిని చూడండి'));
 hook.text=hook.text.replace('మీ శిష్యుడిని చూడండి','మీ శిష్యుడు సిద్ధం చేసిన సైన్యాన్ని చూడండి');
 const b=state.batches[0];b.text=b.sections.map(i=>config.sections[i].text).join('\n\n');assert(b.text.length<=1000);
 const s=p.document.scenes.find(s=>s.id===b.id);s.narration=b.text;delete s.audioId;s.captions=[];s.narrationStale=true;s.captionsStale=true;s.status='Opening paraphrase corrected: points to the army arranged by the disciple';
 const old=p.document.variants.find(v=>v.id===config.variantId),ids=new Set(old.sceneIds);
 p.document.scenes=p.document.scenes.filter(s=>!ids.has(s.id));p.document.variants=p.document.variants.filter(v=>v.id!==config.variantId);
 p.document.script=config.sections.map(s=>s.text).join('\n\n');
 await call('update_project',{projectId:state.projectId,expectedRevision:p.revision,document:p.document});
 state.openingCorrection={previousJob:state.jobs[b.id],previousFinished:state.finished[b.id],previousRenderJobs:state.renderJobs,reason:'The opening paraphrase must point to the army arranged by the disciple, not to the disciple himself.'};
 delete state.jobs[b.id];delete state.finished[b.id];state.renderJobs={};state.correctedOpening=true;
 await writeFile(`${dir}/episode.json`,JSON.stringify(config,null,2));await writeFile(`${dir}/state.json`,JSON.stringify(state,null,2));
 console.log('Corrected opening; existing recordings/assets retained. Only the first narration batch needs regeneration.');
}finally{await client.close();}
