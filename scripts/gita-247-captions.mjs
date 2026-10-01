import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const projectId='a39b4823-f4d4-436b-be68-7d6694418d36',variantId='gita-247-strong-voice',dir='data/productions/bhagavad-gita-telugu';
const client=new Client({name:'gita-247-caption-review',version:'1.0'});
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args});const t=r.content.find(c=>c.type==='text')?.text;if(r.isError)throw Error(t);return JSON.parse(t);}
const segmenter=new Intl.Segmenter('te',{granularity:'grapheme'});
const length=text=>Array.from(segmenter.segment(text)).length;
try {
 const p=await call('get_project',{projectId});const variant=p.document.variants.find(v=>v.id===variantId);
 const untouched=JSON.stringify(p.document.scenes.filter(s=>!s.id.startsWith('gita-247-te-')));
 for(const id of variant.sceneIds){
  const scene=p.document.scenes.find(s=>s.id===id);const old=scene.captions;const revised=[];
  if(!old.length || !old.every(c=>c.words?.length))throw Error('Character-aligned word timing is required');
  for(const caption of old){let words=[],lines=[''];
   function flush(){if(!words.length)return;revised.push({id:crypto.randomUUID(),start:words[0].start,end:Math.min(scene.duration,words.at(-1).end),text:lines.join('\n'),words,accuracy:'aligned'});words=[];lines=[''];}
   for(const word of caption.words){
    const next=[...lines];const i=next.length-1;const text=next[i]?`${next[i]} ${word.text}`:word.text;
    if(length(text)>18&&next[i])next.push(word.text);else next[i]=text;
    if(next.length>2||words.length>=4){flush();lines=[word.text];}else lines=next;
    words.push({...word});
   }flush();
  }
  // Focused production regression checks: preserve every shaped word and its real timing.
  assert.deepEqual(revised.flatMap(c=>c.words).map(w=>w.text),old.flatMap(c=>c.words).map(w=>w.text));
  for(let i=0;i<revised.length;i++){
   const c=revised[i];const next=revised[i+1];c.end=Math.min(scene.duration,next?.start??scene.duration,c.end+0.2);
   assert(c.end>c.start && c.start>=0 && c.end<=scene.duration);
   assert(c.text.split('\n').length<=2);assert(c.words.length<=4);
   assert(c.text.split('\n').every(line=>length(line)<=18));
   if(i)assert(c.start>=revised[i-1].end-0.001);
  }
  scene.captions=revised;scene.captionsStale=false;scene.narrationStale=false;
 }
 variant.fontSize=42;variant.font='Noto Sans Telugu';variant.background=true;variant.outline=3;variant.color='#ffffff';variant.position='bottom';variant.wordHighlight=false;
 assert.equal(untouched,JSON.stringify(p.document.scenes.filter(s=>!s.id.startsWith('gita-247-te-'))));
 await call('update_project',{projectId,expectedRevision:p.revision,document:p.document});
 const updated=await call('get_project',{projectId});
 assert(updated.document.scenes.filter(s=>s.id.startsWith('gita-247-te-')).every(s=>!s.narrationStale&&!s.captionsStale));
 await writeFile(`${dir}/gita-247-production.json`,JSON.stringify({projectId,variantId,...updated},null,2));
 await writeFile(`${dir}/script-gita-247-te.md`,'# భగవద్గీత 2.47 — కర్తవ్యం\n\nOriginal verse in Telugu script; original explanatory paraphrase and examples. Voice sJrRcQEpUbZehhGBdEbD; eleven_v4. Bass +3 dB at 120 Hz, pitch +0.5 semitone, tempo unchanged, narration volume 1.25.\nSources: https://www.gitasupersite.iitk.ac.in/dv/bhagavadgita/2.47 ; https://www.holy-bhagavad-gita.org/chapter/2/verse/47/\n\n'+variant.sceneIds.map((id,i)=>{const s=updated.document.scenes.find(s=>s.id===id);return `## ${i+1}. ${s.title}\n\n${s.narration}`;}).join('\n\n'));
 const job=await call('queue_render',{projectId,variantId,draft:true});await writeFile(`${dir}/gita-247-draft-job.json`,JSON.stringify(job,null,2));
 console.log(JSON.stringify({checks:'word preservation, Unicode line lengths, two-line limit, word timing and old-scene preservation passed',captionCount:variant.sceneIds.reduce((n,id)=>n+updated.document.scenes.find(s=>s.id===id).captions.length,0),draftJobId:job.id}));
}finally{await client.close();}
