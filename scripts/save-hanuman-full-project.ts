import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {sessionToken} from '../lib/security';
import {projectSchema} from '../lib/schema';
const root='data/productions/divine-wisdom/hanuman-chalisa/full-original-2026-10-06';
const json=async(name:string)=>JSON.parse(await readFile(`${root}/${name}.json`,'utf8'));
const origin=process.env.APP_ORIGIN||'http://localhost:3000';
const save=(name:string,data:any)=>writeFile(`${root}/${name}.json`,JSON.stringify(data,null,2));
async function main(){
 const timeline=await json('timeline'),captions=await json('captions');
 const publishing={titles:['హనుమాన్ చాలీసా | పూర్తి భక్తి గానం | Divine Wisdom Telugu'],description:'Complete traditional Hanuman Chalisa, including the supplied Sanskrit dhyanam, in an original AI-assisted musical arrangement. Telugu-script lyrics with synchronized gold word highlighting. Original Hanuman devotional illustrations. Divine Wisdom Telugu.\n\nThis is a new generated performance, not an existing commercial recording. AI-assisted vocals, music and illustrations.\n\nPlease let us know about any pronunciation or caption corrections.',hashtags:'#HanumanChalisa #Hanuman #DivineWisdomTelugu',chapters:timeline.scenes.map((s:any)=>`${String(Math.floor(s.start/60)).padStart(2,'0')}:${String(s.start%60).padStart(2,'0')} ${s.section}`).join('\n'),thumbnailPrompt:'Original Hanuman devotional portrait with large Telugu title and gold accents'};
 await save('publishing',publishing);
 const initial=projectSchema.parse({title:'హనుమాన్ చాలీసా · Original full song · 104px captions',topic:'Complete owner-supplied traditional prayer with original sung performance',category:'Devotional',language:'hi',subtitleLanguage:'te',mode:'manual',targetDuration:timeline.seconds,budget:0,generationLimit:0,unknownCostPolicy:'block',sourceClassification:'traditional',script:await readFile(`${root}/lyrics.txt`,'utf8'),sources:'Prayer text supplied by owner in this conversation. Original music generated with ElevenLabs music_v2_5 using the owner-approved original sample. Existing original Hanuman artwork reused.',publishing});
 let state:any;try{state=await json('app-project');}catch(e:any){if(e.code!=='ENOENT')throw e;state={assets:{}};}
 const headers={Cookie:`studio_session=${sessionToken()}`,Origin:origin};
 async function api(url:string,method='GET',body?:any){const r=await fetch(`${origin}/api/${url}`,{method,headers:{...headers,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(120000)});assert(r.ok,`Local studio HTTP ${r.status}`);return r.json();}
 if(!state.projectId){const p=await api('projects','POST',initial);state.projectId=p.id;await save('app-project',state);}
 async function asset(name:string,file:string){
  if(!state.assets[name]){const bytes=await readFile(file),form=new FormData();form.set('projectId',state.projectId);form.set('file',new File([new Uint8Array(bytes)],path.basename(file)));const r=await fetch(`${origin}/api/assets`,{method:'POST',headers,body:form,signal:AbortSignal.timeout(120000)});assert(r.ok,`Asset upload HTTP ${r.status}`);state.assets[name]=(await r.json()).id;await save('app-project',state);}return state.assets[name];
 }
 await asset('song',`${root}/hanuman-chalisa-full-song.mp3`);
 for(const s of timeline.scenes){const name=path.basename(s.image);await asset(name,path.resolve(root,s.image));}
 if(!state.assembled){
  const current=await api(`projects/${state.projectId}`);const doc=projectSchema.parse(current.document);
  doc.scenes=timeline.scenes.map((s:any)=>({id:`hanuman-original-${s.index}`,title:s.section,assetId:state.assets[path.basename(s.image)],mediaType:'image',duration:s.end-s.start,audioId:state.assets.song,audioStart:s.start,audioSlice:true,volume:1,fadeIn:0,fadeOut:0,transition:'cut',overlap:0,motion:s.index%2?'zoom-out':'zoom-in',motionEasing:'smooth',strength:.02,focalX:.5,focalY:.5,status:'Original song; provider-aligned lyrics',captions:captions.pages.filter((c:any)=>c.start>=s.start&&c.start<s.end).map((c:any,i:number)=>({id:`caption-${s.index}-${i}`,start:c.start-s.start,end:Math.min(c.end,s.end)-s.start,text:c.lines.map((l:any)=>l.map((w:any)=>w.text).join(' ')).join('\n'),accuracy:'aligned',words:c.words.map((w:any)=>({text:w.text,start:Math.max(0,w.start-s.start),end:Math.min(w.end,s.end)-s.start}))}))}));
  doc.variants=[{id:'hanuman-original-full-v1',name:'Original full song · large Telugu captions · 16:9',aspect:'landscape',sceneIds:doc.scenes.map(s=>s.id),captions:true,wordHighlight:true,highlightColor:'#ffd54a',font:'Noto Sans Telugu',fontSize:100,color:'#ffffff',outline:3,background:true,position:'bottom',captionBottom:.11,fps:24,crf:19,encodingPreset:'fast',targetDuration:timeline.seconds,maxDuration:720,publishing} as any];
  doc.styleGuide='Original full performance; enhanced bass +3 dB at 110 Hz, pitch +0.5 semitone with tempo unchanged. Six original Hanuman illustrations, 26 gentle camera shots, 104 px Telugu-script captions with gold active words. Four timestamp-flagged sections corrected. Local finished render uses custom title and caption-panel layout; editable studio variant may differ cosmetically. Full listening review remains pending.';
  const saved=await api(`projects/${state.projectId}`,'PATCH',{revision:current.revision,document:projectSchema.parse(doc)});state.assembled=true;state.revision=saved.revision;await save('app-project',state);
 }
 const checked=await api(`projects/${state.projectId}`);assert.equal(checked.document.scenes.length,26);assert.equal(checked.document.variants[0].fontSize,100);
 await save('editable-project',checked);console.log(JSON.stringify({projectId:state.projectId,scenes:checked.document.scenes.length,saved:true}));
}
main().catch(e=>{console.error(JSON.stringify({error:e instanceof assert.AssertionError?e.message:e.message==='Configure SESSION_SECRET'?e.message:'Studio save failed; credentials suppressed',type:e.name,code:e.cause?.code,validation:e.name==='ZodError'?e.issues.map((i:any)=>({path:i.path,code:i.code})):undefined}));process.exitCode=1;});
