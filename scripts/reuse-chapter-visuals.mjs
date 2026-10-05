import 'dotenv/config';
import {readFile,writeFile,mkdir,copyFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const base='data/productions/divine-wisdom',old=`${base}/gita-chapter-1/meaning-v1`,dir=`${base}/gita-chapter-1/visual-v2`;
if(await access(`${dir}/episode.json`).then(()=>true).catch(()=>false)){console.log('Visual edition already prepared; resume its saved stages.');process.exit(0);}
const config=JSON.parse(await readFile(`${old}/episode.json`,'utf8')),state=JSON.parse(await readFile(`${old}/state.json`,'utf8')),timeline=JSON.parse(await readFile(`${old}/completed-timeline.json`,'utf8'));
const oldVariant=timeline.document.variants.find(v=>v.id===config.variantId),oldScenes=oldVariant.sceneIds.map(id=>timeline.document.scenes.find(s=>s.id===id));
assert.equal(oldScenes.length,60);assert(state.batches.every(b=>state.finished[b.id]));
await mkdir(dir,{recursive:true});
const catalog=[],byName=new Map(),hashes=new Map();
async function add(name,file,prompt){const bytes=await readFile(file),sha256=createHash('sha256').update(bytes).digest('hex');let item=hashes.get(sha256);if(!item){item={name,source:file,sha256,prompt};catalog.push(item);hashes.set(sha256,item);await copyFile(file,`${dir}/${name}.png`);}byName.set(name,item.name);return item.name;}
for(const p of JSON.parse(await readFile(`${old}/image-prompts.json`,'utf8')))await add(`chapter-${p.name}`,`${old}/${p.name}.png`,p.prompt);
for(const [tag,folder] of [['first',`${base}/gita-1-1/recreated-v3`],['intro',`${base}/gita-series-intro`],...Array.from({length:9},(_,i)=>[`ep${i+2}`,`${base}/gita-1-${i+2}/devotional-v${i===0?2:1}`])]){
 const prompts=JSON.parse(await readFile(`${folder}/image-prompts.json`,'utf8'));
 for(const [i,p] of prompts.entries()){if(p.name==='verse')continue;const file=tag==='first'?`${folder}/${String(i+1).padStart(2,'0')}-${p.name}.png`:`${folder}/${p.name}.png`;await add(`${tag}-${p.name}`,file,p.prompt);}
}
const names=xs=>[...new Set(xs.map(n=>{assert(byName.has(n),n);return byName.get(n);} ))];
const groups={
 palace:names(['chapter-palace','first-context','first-meaning','ep2-court']),
 teacher:names(['ep2-battlefield','ep2-teacher','ep2-concern','ep3-teacher','ep3-commander','first-next']),
 army:names(['ep3-formation','ep3-commander','ep4-hero','ep5-hero','ep6-hero','ep7-hero','ep8-hero','ep9-hero','ep10-hero','first-overview']),
 conches:names(['chapter-conches','intro-chariot','chapter-hero','first-overview']),
 chariot:names(['chapter-hero','intro-chariot','chapter-relatives','first-overview']),
 grief:names(['chapter-grief','chapter-relatives','intro-calm','first-conclusion','intro-path']),
 family:names(['chapter-family','intro-family','intro-generations','first-example-a','first-example-b','intro-book']),
 reflection:names(['first-explanation-a','first-explanation-b','first-conclusion','first-closing','intro-calm','intro-path','intro-book','intro-manual']),
 practical:names(['intro-student','ep2-student','ep3-learning','ep3-team','ep4-example','ep5-example','ep6-example','first-example-a','first-example-b','intro-generations']),
};
const parts=oldScenes.map((s,i)=>i===0?1:Math.max(1,Math.ceil(s.duration/32)));
const available=Math.min(100,195-timeline.document.scenes.length);assert(available>=60,'Preserve earlier scenes within project scene limit');
while(parts.reduce((a,b)=>a+b,0)>available){let best=-1;for(let i=1;i<parts.length;i++)if(parts[i]>1&&(best<0||oldScenes[i].duration/(parts[i]-1)<oldScenes[best].duration/(parts[best]-1)))best=i;assert(best>=0);parts[best]--;}
const sections=[],oldToNew=[],useCounts={},plan=[];let lastImage=null;
function choose(pool){const ranked=[...pool].sort((a,b)=>(useCounts[a]||0)-(useCounts[b]||0));const selected=ranked.find(x=>x!==lastImage)||ranked[0];useCounts[selected]=(useCounts[selected]||0)+1;lastImage=selected;return selected;}
for(let i=0;i<config.sections.length;i++){
 const sec=config.sections[i],words=sec.text.trim().split(/\s+/u),indices=[];
 let pool;if(sec.verseNumber){const n=sec.verseNumber;pool=n===1?groups.palace:n<=3?groups.teacher:n<=11?groups.army:n<=19?groups.conches:n<=27?groups.chariot:n<=39?groups.grief:n<=44?groups.family:groups.grief;}
 else pool=/practice|example/.test(sec.id)?groups.practical:/context/.test(sec.id)?groups.palace:/recap/.test(sec.id)?groups.family:groups.reflection;
 for(let k=0;k<parts[i];k++){
  const start=Math.floor(k*words.length/parts[i]),end=Math.floor((k+1)*words.length/parts[i]);
  const image=sec.image==='logo'?'logo':choose(k&&sec.verseNumber&&sec.verseNumber>=28&&sec.verseNumber<=39?groups.reflection:pool);
  const next={...sec,id:k?`${sec.id}-part-${k+1}`:sec.id,image,text:words.slice(start,end).join(' ')};if(k)delete next.verseNumber;
  indices.push(sections.length);sections.push(next);plan.push({section:next.id,originalSection:sec.id,verseNumber:sec.verseNumber||null,image,source:image==='logo'?'approved channel logo':catalog.find(x=>x.name===image).source});
 }
 oldToNew[i]=indices;
}
assert.equal(sections.filter(s=>s.verseNumber).length,47);assert.equal(sections.map(s=>s.text).join(' ').split(/\s+/u).length,config.sections.map(s=>s.text).join(' ').split(/\s+/u).length);
const nextConfig={...config,variantId:'gita-chapter-1-te-visual-v2',prefix:'gita-chapter-1-visual-v2',sections,visualEdition:'Existing generated illustrations, more frequent contextual changes; narration unchanged'};
const nextState={projectId:state.projectId,variantId:nextConfig.variantId,batches:state.batches.map(b=>({...b,sections:b.sections.flatMap(i=>oldToNew[i])})),jobs:{...state.jobs},finished:structuredClone(state.finished),images:{},logoId:state.logoId,logoClipId:state.logoClipId,thumbnailId:state.thumbnailId,renderJobs:{},seconds:state.seconds,reusesNarrationFrom:old};
const client=new Client({name:'chapter-existing-visuals',version:'1'});await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`,Connection:'close'}}}));
try{const result=await client.callTool({name:'get_project',arguments:{projectId:state.projectId}});assert(!result.isError);await writeFile(`${dir}/before-production.json`,JSON.stringify(JSON.parse(result.content.find(x=>x.type==='text').text),null,2));}finally{await client.close();}
for(const name of ['coverage.json','thumbnail.png','THUMBNAIL-PROMPT.md','authorization.json'])await copyFile(`${old}/${name}`,`${dir}/${name}`).catch(e=>{if(e.code!=='ENOENT')throw e;});
const used=new Set(sections.map(s=>s.image));
await writeFile(`${dir}/image-prompts.json`,JSON.stringify(catalog.filter(x=>used.has(x.name)),null,2));
await writeFile(`${dir}/visual-plan.json`,JSON.stringify({sourceEdition:old,unchangedNarration:true,newProviderCalls:0,uniqueIllustrations:used.size-1,sceneCount:sections.length,plan},null,2));
await writeFile(`${dir}/script-te.md`,await readFile(`${old}/script-te.md`));
await writeFile(`${dir}/state.json`,JSON.stringify(nextState,null,2));await writeFile(`${dir}/episode.json`,JSON.stringify(nextConfig,null,2));
console.log(JSON.stringify({dir,scenes:sections.length,uniqueIllustrations:used.size-1,narrationBatchesReused:nextState.batches.length,newProviderCalls:0}));
