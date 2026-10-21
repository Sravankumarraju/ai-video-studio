import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {sessionToken} from '../lib/security';
import {projectSchema} from '../lib/schema';
const root='data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12/video-01-background';
const origin=process.env.APP_ORIGIN||'http://localhost:3000';
const load=async(name:string)=>JSON.parse(await readFile(`${root}/${name}.json`,'utf8'));
const save=(name:string,value:unknown)=>writeFile(`${root}/${name}.json`,JSON.stringify(value,null,2));
async function main(){
 const episode=await load('episode'),timeline=await load('timeline'),captions=await load('captions'),verified=await load('verification');assert(verified.fullDecodePassed&&verified.collapsedNarrationWords===0,'Verify final video first');
 const publishing={titles:[episode.title+' | Divine Wisdom Telugu'],description:'శ్రీ లలితా సహస్రనామం గురించి సులభమైన తెలుగు పరిచయం: నామాల భావం, పురాణ సంప్రదాయంలోని హయగ్రీవ–అగస్త్య ఉపదేశం, గ్రంథ సంబంధం, పారాయణంలో చేర్చే భాగాలు, సంస్కృత పాఠాన్ని తెలుగు లిపిలో అనుసరించే విధానం. ఇది నేపథ్య వివరణ; పూర్తి పారాయణం లేదా వెయ్యి నామాల పూర్తి వ్యాఖ్యానం కాదు.\n\nఆధారాలు:\n'+episode.sources.join('\n')+'\n\nAI-assisted Telugu narration and original devotional illustrations. Traditional accounts and practical reflections are distinguished.',hashtags:'#LalitaSahasranamam #Telugu #DivineWisdom',chapters:await readFile(`${root}/chapters.txt`,'utf8'),thumbnailPrompt:'Lalita devotional portrait, ruby red and antique gold on midnight blue; title typeset separately'};
 await save('publishing',publishing);
 const initial=projectSchema.parse({title:episode.title,topic:'Video 1: source-based Telugu background for Sri Lalita Sahasranama Stotram',category:'Devotional',language:'te',subtitleLanguage:'te',mode:'manual',targetDuration:timeline.seconds,budget:0,generationLimit:0,unknownCostPolicy:'block',sourceClassification:'traditional',script:episode.sections.map((s:any)=>s.text).join('\n\n'),sources:episode.sources.join('\n'),publishing});
 let state:any;try{state=await load('app-project');}catch(e:any){if(e.code!=='ENOENT')throw e;state={assets:{}};}
 const headers={Cookie:`studio_session=${sessionToken()}`,Origin:origin};
 async function api(url:string,method='GET',body?:any){const r=await fetch(`${origin}/api/${url}`,{method,redirect:'manual',headers:{...headers,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(120000)});assert(r.ok,`Local studio HTTP ${r.status}; sign-in may be required`);assert(r.headers.get('content-type')?.includes('json'),'Studio endpoint did not return JSON');return r.json();}
 if(!state.projectId){const p=await api('projects','POST',initial);state.projectId=p.id;await save('app-project',state);}
 async function asset(name:string,file:string){if(!state.assets[name]){const bytes=await readFile(file);assert(bytes.length<=100*1024*1024);const form=new FormData();form.set('projectId',state.projectId);form.set('file',new File([new Uint8Array(bytes)],path.basename(file)));const r=await fetch(`${origin}/api/assets`,{method:'POST',headers,body:form,signal:AbortSignal.timeout(180000)});assert(r.ok,`Asset import HTTP ${r.status}`);state.assets[name]=(await r.json()).id;await save('app-project',state);}return state.assets[name];}
 await asset('audio',`${root}/video-01-master.wav`);await asset('logo',`${root}/assets/logo.png`);
 for(const name of ['hero','lamp-manuscript','hayagriva-agastya','family-devotion'])await asset(name,`${root}/assets/${name}.png`);
 await asset('finished-film',`${root}/lalita-video-01-background-telugu-1080p.mp4`);
 if(!state.assembled){
  const current=await api(`projects/${state.projectId}`),doc=projectSchema.parse(current.document);
  doc.logoId=state.assets.logo;
  doc.scenes=timeline.scenes.map((s:any)=>({id:`lalita-background-${s.index}`,title:s.title,narration:s.text,assetId:state.assets[s.image],mediaType:'image',duration:s.end-s.start,audioId:state.assets.audio,audioStart:s.start,audioSlice:true,volume:1,fadeIn:0,fadeOut:0,transition:'cut',overlap:0,motion:s.index%2?'zoom-out':'zoom-in',motionEasing:'smooth',strength:.035,focalX:.5,focalY:.5,status:'Recorded Telugu narration; aligned phrase captions',voiceId:episode.voiceId,captions:captions.pages.filter((p:any)=>p.section===s.index).map((p:any,i:number)=>({id:`caption-${s.index}-${i}`,start:p.start-s.start,end:p.end-s.start,text:p.lines.map((l:any)=>l.map((w:any)=>w.text).join(' ')).join('\n'),accuracy:'aligned'}))}));
  const finished={id:'lalita-background-finished-film',title:'Video 1 · verified local master',assetId:state.assets['finished-film'],mediaType:'video',duration:timeline.seconds,motion:'static',strength:0,transition:'cut',overlap:0,volume:1,muted:false,captions:[],status:'Verified local 1080p master; final human listening review pending'};
  doc.scenes.push(finished as any);
  doc.variants=[{id:'lalita-background-master',name:'Video 1 · finished 1080p film',aspect:'landscape',logoId:null,sceneIds:[finished.id],captions:false,fps:24,crf:20,targetDuration:Math.round(timeline.seconds),maxDuration:7200,publishing},{id:'lalita-background-editable',name:'Video 1 · editable sections and phrase captions',aspect:'landscape',sceneIds:doc.scenes.slice(0,11).map(s=>s.id),captions:true,wordHighlight:false,color:'#ffd54a',font:'Noto Sans Telugu',fontSize:88,background:true,outline:2,position:'bottom',captionBottom:.083,fps:24,crf:20,encodingPreset:'fast',targetDuration:Math.round(timeline.seconds),maxDuration:7200,publishing}] as any;
  doc.styleGuide='Cinematic red/gold/blue devotional illustrations, restrained zooms, original subdued instrumental music, clear Telugu narration and gold phrase captions. Local master includes section titles and traditional-account label. Sanskrit chant sample approval is recorded separately; no YouTube publishing requested.';
  const saved=await api(`projects/${state.projectId}`,'PATCH',{revision:current.revision,document:projectSchema.parse(doc)});state.assembled=true;state.revision=saved.revision;await save('app-project',state);
 }
 const checked=await api(`projects/${state.projectId}`);assert.equal(checked.document.scenes.length,12);assert.equal(checked.document.variants.length,2);await save('editable-project',checked);console.log(JSON.stringify({projectId:state.projectId,url:`${origin}/?project=${state.projectId}`,saved:true,variants:2}));
}
main().catch(e=>{console.error(JSON.stringify({error:e instanceof assert.AssertionError?e.message:e.message==='Configure SESSION_SECRET'?e.message:'Studio save failed; credentials suppressed',type:e.name,code:e.cause?.code,validation:e.name==='ZodError'?e.issues.map((i:any)=>({path:i.path,code:i.code})):undefined}));process.exitCode=1;});
