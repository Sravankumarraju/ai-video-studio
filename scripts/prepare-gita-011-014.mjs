import 'dotenv/config';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {nextVerseContent} from './gita-011-014-content.mjs';
import {episodeSections} from './gita-011-014-sections.mjs';
const root='data/productions/divine-wisdom',template=JSON.parse(await readFile(`${root}/gita-1-10/devotional-v1/episode.json`,'utf8'));
// The owner requested these individual episodes after the complete chapter is finalized.
const chapter=JSON.parse(await readFile(`${root}/gita-chapter-1/story-v4/FINAL_DELIVERY.json`,'utf8'));assert.equal(chapter.status,'final');
const client=new Client({name:'gita-shlokas-11-14',version:'1'});await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`,Connection:'close'}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args});assert(!r.isError,r.content.find(c=>c.type==='text')?.text);return JSON.parse(r.content.find(c=>c.type==='text').text);}
try{const base=(await call('get_project',{projectId:template.projectId})).document;for(const n of [11,12,13,14]){
 const dir=`${root}/gita-1-${n}/devotional-v1`;await mkdir(dir,{recursive:true});if(await readFile(`${dir}/episode.json`,'utf8').then(()=>true).catch(()=>false)){console.log(JSON.stringify({shloka:n,resumed:true}));continue;}
 const d=nextVerseContent[n],ep=String(n).padStart(3,'0'),sections=episodeSections(template,n);
 const title=`Divine Wisdom Telugu · అధ్యాయం 1 · శ్లోకం ${n}`;
 const project=await call('create_project',{document:{...base,title,topic:`అధ్యాయం 1 — శ్లోకం ${n}: ${d.theme}`,scenes:[],variants:[],script:'',outline:'',musicId:undefined,effects:[],mode:'manual',reviewCheckpoints:true,unknownCostPolicy:'block',budget:10,generationLimit:50,publishing:{titles:[],description:'',hashtags:'',thumbnailPrompt:'',chapters:''}}});
 const config={...template,authorizedNarrationCalls:5,explicitChapterLabels:true,projectId:project.id,variantId:`gita-1-${n}-te-devotional-v1`,prefix:`gita-${ep}-v1`,fileStem:`episode-${ep}`,episodeNumber:ep,verseRef:`1.${n}`,nextVerseRef:`1.${n+1}`,title,videoTitle:`భగవద్గీత అధ్యాయం 1 శ్లోకం ${n} | ${d.theme} | Divine Wisdom Telugu`,verseDisplay:d.display,descriptionSummary:`భగవద్గీత అధ్యాయం 1, శ్లోకం ${n}. ${d.theme}. పూర్తి మూల శ్లోకం, సులభమైన తెలుగు అర్థం, ముఖ్య పదాలు, కథా సందర్భం, స్వతంత్ర ఆధునిక ఉదాహరణ మరియు ఆచరణ.`,sources:[`https://www.holy-bhagavad-gita.org/chapter/1/verse/${n}/`],sourceNotes:`Public-domain Sanskrit transliterated in Telugu; original Telugu explanation. ${n===11?'Duryodhana addresses the Kaurava commanders.':'Sanjaya narrates the pre-battle scene to Dhritarashtra.'} Modern analogies are separate from the original verse. No claims of improved actual retention. 16:9, one shloka, held complete verse only during recitation, no music or animation, natural delivery capped at 300 seconds.`,sections};
 await writeFile(`${dir}/episode.json`,JSON.stringify(config,null,2));
 const reuse={teacher:'gita-1-3/devotional-v1/teacher.png',formation:'gita-1-3/devotional-v1/formation.png',verse:'gita-1-1/recreated-v3/04-verse.png',calm:'gita-series-intro/calm.png',path:'gita-series-intro/path.png',book:'gita-series-intro/book.png',example:'gita-1-4/devotional-v1/example.png'};
 if(n===13)reuse.bhishma='gita-1-12/devotional-v1/hero.png';
 for(const [name,source]of Object.entries(reuse)){if(name==='example'&&await readFile(`${dir}/example.png`).then(()=>true).catch(()=>false))continue;await copyFile(`${root}/${source}`,`${dir}/${name}.png`);}
 const prompt='16:9 exquisite respectful Divine Wisdom devotional Indian epic painting, luminous gold and deep indigo, expressive natural faces, rich silk and gold armor, peaceful before-battle atmosphere, bottom center calm for Telugu captions, no text, no watermark. '+d.hero;
 const generated=JSON.parse(await readFile(`${dir}/GENERATED-MEDIA.json`,'utf8'));
 await writeFile(`${dir}/image-prompts.json`,JSON.stringify([{name:'hero',prompt:generated.assets.find(a=>a.name==='hero').prompt},...Object.entries(reuse).map(([name,source])=>({name,source:name==='example'?`${dir}/example.png`:`${root}/${source}`,prompt:name==='example'?generated.assets.find(a=>a.name==='example').prompt:`Reuse approved devotional ${name} illustration from ${source}; modern analogy clearly separate from scripture.`}))],null,2));
 await writeFile(`${dir}/THUMBNAIL-PROMPT.md`,generated.assets.find(a=>a.name==='thumbnail').prompt);
 console.log(JSON.stringify({projectId:project.id,shloka:n,words:sections.reduce((a,s)=>a+s.text.split(/\s+/u).length,0)}));
}}finally{await client.close();}
