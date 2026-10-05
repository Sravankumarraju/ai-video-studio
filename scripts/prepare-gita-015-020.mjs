import 'dotenv/config';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {nextVerseContent} from './gita-015-020-content.mjs';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const root='data/productions/divine-wisdom',template=JSON.parse(await readFile(`${root}/gita-1-14/devotional-v1/episode.json`,'utf8'));
const client=new Client({name:'gita-15-20-preparation',version:'1'});
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args});assert(!r.isError,r.content.find(c=>c.type==='text')?.text);return JSON.parse(r.content.find(c=>c.type==='text').text);}
const plan={episodes:[],calls:0,characters:0,status:'prepared; no paid generation; owner spending approval required',price:'unknown'};
try{for(const n of [15,16,17,18,19,20]){
 const dir=`${root}/gita-1-${n}/devotional-v1`,d=nextVerseContent[n],ep=String(n).padStart(3,'0');await mkdir(dir,{recursive:true});
 const sections=template.sections.map(s=>({...s,text:d[s.id]||s.text}));
 sections.find(s=>s.id==='welcome').text=`డివైన్ విజ్డమ్ తెలుగు ఛానల్‌కు స్వాగతం. భగవద్గీత అధ్యాయం ఒకటి, శ్లోకం ${d.number}.`;
 sections.find(s=>s.id==='shloka').text=d.verse;sections.find(s=>s.id==='hook').title=d.theme;
 for(const id of ['shloka','meaning'])sections.find(s=>s.id===id).title=`అధ్యాయం 1 · శ్లోకం ${n} · ${id==='shloka'?'మూల పఠనం':'తెలుగు అర్థం'}`;
 sections.find(s=>s.id==='next').title=`తరువాత అధ్యాయం 1 · శ్లోకం ${n+1}`;
 const batches=[];for(const s of sections){assert(s.text.length<=1000);const last=batches.at(-1);if(last&&!last.verse&&s.id!=='shloka'&&(last.text+'\n\n'+s.text).length<=1000)last.text+='\n\n'+s.text;else batches.push({text:s.text,verse:s.id==='shloka'});}
 let existing=await readFile(`${dir}/episode.json`,'utf8').then(JSON.parse).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
 if(!existing){const title=`Divine Wisdom Telugu · అధ్యాయం 1 · శ్లోకం ${n}`;const p=await call('create_project',{document:{title,topic:d.theme,category:'Devotional',language:'te',subtitleLanguage:'te',targetDuration:240,mode:'manual',reviewCheckpoints:true,budget:10,generationLimit:50,unknownCostPolicy:'block',sourceClassification:'traditional',style:'Respectful luminous devotional illustrations',audience:'Telugu viewers of all ages'}});
 existing={...template,projectId:p.id,variantId:`gita-1-${n}-te-devotional-v1`,prefix:`gita-${ep}-v1`,fileStem:`episode-${ep}`,episodeNumber:ep,verseRef:`1.${n}`,nextVerseRef:`1.${n+1}`,title,videoTitle:`భగవద్గీత అధ్యాయం 1 శ్లోకం ${n} | ${d.theme} | Divine Wisdom Telugu`,verseDisplay:d.display,descriptionSummary:`అధ్యాయం 1, శ్లోకం ${n}: ${d.theme}. మూల శ్లోక పఠనం, తెలుగు అర్థం, సందర్భం, స్వతంత్ర ఆధునిక ఉదాహరణ, ఆచరణ.`,sections,sources:[`https://www.holy-bhagavad-gita.org/chapter/1/verse/${n}/`],sourceNotes:'Traditional Sanskrit transliterated in Telugu; original Telugu explanation. Sanjaya narrates to Dhritarashtra. Modern examples are separate editorial reflections. 16:9, one shloka, under five minutes, no music. Exact full verse held only during recitation. Provider calls not yet approved.'};delete existing.authorizedNarrationCalls;await writeFile(`${dir}/episode.json`,JSON.stringify(existing,null,2));}
 const reuse={formation:'gita-1-3/devotional-v1/formation.png',verse:'gita-1-1/recreated-v3/04-verse.png',calm:'gita-series-intro/calm.png',path:'gita-series-intro/path.png',book:'gita-series-intro/book.png',example:'gita-1-14/devotional-v1/example.png'};
 for(const [name,source] of Object.entries(reuse))await copyFile(`${root}/${source}`,`${dir}/${name}.png`);
 const prompt='16:9 exquisite respectful Divine Wisdom Indian devotional epic painting, luminous gold and deep indigo, rich silk and gold armor, natural expressive faces, peaceful before-battle scene, coherent hands, calm lower center for Telugu captions, no text or watermark. '+d.hero;
 await writeFile(`${dir}/image-prompts.json`,JSON.stringify([{name:'hero',prompt},...Object.entries(reuse).map(([name,source])=>({name,source:`${root}/${source}`,prompt:`Reuse approved ${name} illustration; modern visual analogy clearly separate from scripture.`}))],null,2));
 await writeFile(`${dir}/THUMBNAIL-PROMPT.md`,`${prompt}\nThumbnail: clear Telugu chapter and shloka number, theme title typeset separately, channel logo.`);
 await writeFile(`${dir}/REVIEW-SCRIPT.md`,sections.map(s=>`## ${s.title}\n\n${s.text}`).join('\n\n'));
 const e={chapter:1,shloka:n,projectId:existing.projectId,dir,calls:batches.length,characters:batches.reduce((a,b)=>a+b.text.length,0),words:sections.reduce((a,s)=>a+s.text.split(/\s+/u).length,0)};plan.episodes.push(e);plan.calls+=e.calls;plan.characters+=e.characters;
}await writeFile(`${root}/NARRATION-015-020-PLAN.json`,JSON.stringify(plan,null,2));console.log(JSON.stringify(plan));}finally{await client.close();}
