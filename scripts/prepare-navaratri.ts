import 'dotenv/config';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {sessionToken} from '../lib/security';
import {forms,dailySections,introSections,calendarSource,kavachaSource} from './navaratri-content.mjs';
const root='data/productions/divine-wisdom/devi-navaratri-2026';
const origin=process.env.APP_ORIGIN||'http://localhost:3000';
const headers={Cookie:`studio_session=${sessionToken()}`,Origin:origin,'Content-Type':'application/json'};
async function request(endpoint:string,method='GET',body?:unknown){const r=await fetch(origin+'/api/'+endpoint,{method,headers,...(body?{body:JSON.stringify(body)}:{})});assert(r.ok,`${method} ${endpoint}: ${r.status}`);return r.json();}
const style='Respectful luminous Indian devotional watercolor-and-ink painting, painterly gold and deep indigo, rich traditional silk, dignified natural faces, readable clean silhouettes, 16:9 landscape, bottom fifth uncluttered dark for large Telugu captions. No text, watermark or modern props in deity scenes. No gore. Distinguish deity iconography faithfully.';
const notes='Navadurga order, not Vijayawada temple alankaram schedule. Traditional stories are devotional accounts; modern examples and symbolic life lessons are original editorial analogies. Do not promise cures, wealth, supernatural powers or guaranteed results. Do not conflate Kalaratri, Kali and Chamunda. No skin-color moral hierarchy. Optional practices follow family/local tradition; no mandated extreme fasting. Hyderabad 2026 calendar repeats Saptami Oct17–18; calendar dates and episode order are separate. No music, animation or Shorts. Target natural 3–5 minutes, never speed up to fit; 300-second cap. Sources checked 2026-10-04.';
async function main(){
 const old=await readFile(root+'/production-plan.json','utf8').then(JSON.parse).catch(e=>{if(e.code!=='ENOENT')throw e;return {videos:[]};});
 await mkdir(root,{recursive:true});
 let seriesId=old.seriesId;
 if(!seriesId){const series=await request('series','POST',{templateId:'custom',name:'దేవీ నవరాత్రులు · నవదుర్గలు · Telugu'});seriesId=series.id;await writeFile(root+'/production-plan.json',JSON.stringify({...old,seriesId},null,2));
 const settings={...series.settings,templateId:'custom',name:series.name,description:'పరిచయం మరియు తొమ్మిది నవదుర్గల కథలు, రూపం, ఆరాధన, రోజువారీ ఆచరణ.',subject:'Devi Navaratri · Navadurga tradition',sources:{texts:[kavachaSource,calendarSource,'https://belurmath.org/durga-puja-at-belur-math/'].join('\n'),preferences:notes,chapterVerses:[]},formats:[{id:'navadurga-daily',name:'Navadurga · Daily story and practice',contentType:'story',verses:{mode:'none',min:0,max:0,label:'ప్రార్థన'},structure:[['welcome','స్వాగతం','intro'],['story','కథ','story'],['icon','రూపం','symbolism'],['detail','వివరణ','explanation'],['example','ఉదాహరణ','example'],['practice','ఆచరణ','lesson'],['closing','ముగింపు','cta']].map(([id,title,kind])=>({id,title,kind,purpose:'Follow sourced daily episode script',required:true})),instructions:notes}],defaultFormatId:'navadurga-daily',narration:{tone:'Confident, warm, graceful Telugu teacher; natural pauses; simple spoken Telugu.',pronunciation:forms.map(d=>d.name).join('; '),instructions:'Say the full Divine Wisdom Telugu name and topic; spell spoken numbers in Telugu words.'},visual:{style,characters:[],imageRules:style},defaults:{voiceId:'sJrRcQEpUbZehhGBdEbD',aspect:'landscape',targetDuration:240,channelName:'Divine Wisdom Telugu',titleOverlay:'Divine Wisdom Telugu'},intro:{instructions:'Approved logo welcome with audible full channel name.'},closing:{instructions:'Summarize one takeaway and tease next form.'},cta:{enabled:true,instructions:'Ask like, share, subscribe and comment what was learned.'}};
 await request(`series/${seriesId}`,'PATCH',{revision:series.revision,settings});}
 const rows=[{slug:'intro',name:'దేవీ నవరాత్రులు ఎందుకు?',theme:'తొమ్మిది రూపాలు · అర్థంతో ప్రారంభిద్దాం',art:'Durga on a lion',scene:'Protective Durga',example:'Family listening',sections:introSections},...forms.map((d,i)=>({...d,sections:dailySections(d,i)}))];
 const videos=[];
 for(let i=0;i<rows.length;i++){
 const d=rows[i],dir=`${root}/${String(i).padStart(2,'0')}-${d.slug}/v1`;await mkdir(dir,{recursive:true});
 const existing=old.videos.find((v:{slug:string;projectId:string})=>v.slug===d.slug);const onDisk=await readFile(dir+'/episode.json','utf8').then(JSON.parse).catch(e=>{if(e.code!=='ENOENT')throw e;return undefined;});
 const title=`Divine Wisdom Telugu · ${i?`నవదుర్గ రూపం ${i} · ${d.name}`:'దేవీ నవరాత్రుల పరిచయం'}`;
 const source=i?`https://www.drikpanchang.com/hindu-goddesses/parvati/durga/navdurga-${d.slug}.html`:'https://belurmath.org/durga-puja-at-belur-math/';
 const sources=[source,kavachaSource,calendarSource,...(!i?['https://hyderabad.telangana.gov.in/festival/bathukamma/']:[])];
 let projectId=existing?.projectId||onDisk?.projectId;
 if(!projectId){const p=await request(`series/${seriesId}/videos`,'POST',{title,formatId:'navadurga-daily',episode:i+1,inputs:{topic:d.theme,description:`${d.name}: story, iconography, practical reflection and family traditions.`,references:i?`Navadurga form ${i}; ${d.name}`:'Introduction, Devi Kavacha verses3–5 names; no Sanskrit recitation',sourceNotes:notes,targetDuration:240}});projectId=p.id;}
 const config={productionKind:'navaratri',projectId,variantId:`navaratri-${d.slug}-te-v1`,prefix:`navaratri-${d.slug}-v1`,fileStem:`navaratri-${d.slug}`,episodeNumber:String(i).padStart(3,'0'),title,variantName:title+' · 16:9',voiceId:'sJrRcQEpUbZehhGBdEbD',videoTitle:i?`నవరాత్రులు ${i}: ${d.name} | ${d.theme} | Divine Wisdom Telugu`:'దేవీ నవరాత్రులు ఎందుకు? తొమ్మిది రూపాలు, కథలు & ఆచరణ | Divine Wisdom Telugu',descriptionSummary:i?`${d.name} అమ్మవారి సంప్రదాయ పరిచయం, రూపం, ఆరాధన మరియు రోజువారీ ఉదాహరణ. ${d.theme}.`:'నవరాత్రుల అర్థం, దేవీ ఆరాధన నేపథ్యం, నవదుర్గల క్రమం, తెలుగు ప్రాంతాల భిన్న సంప్రదాయాలు మరియు ఇంట్లో సరళంగా ప్రారంభించే మార్గం.',sources,sourceNotes:notes,sections:d.sections,targetDuration:240,maximumDuration:300,navaratri:{form:i,tradition:'Navadurga with Telugu regional notes',nextName:forms[i]?.name||'ఈ సిరీస్‌లోని ఇతర రూపాలు',calendarNote:'2026 Hyderabad: starts Oct11; Saptami Oct17–18; Ashtami/MahaNavami Oct19, NavamiHoma/Vijayadashami Oct20. Not a temple alankaram calendar.'}};
 assert([...config.videoTitle].length<=100);assert(config.sections.every(s=>s.text.length<=1000));
 // Never silently replace a checkpointed script after audio generation.
 if(onDisk){assert.equal(JSON.stringify(onDisk.sections),JSON.stringify(config.sections),'Create v2 for changed scripts');}else await writeFile(dir+'/episode.json',JSON.stringify(config,null,2));
 const batches:{text:string}[]=[];for(const s of d.sections){const last=batches.at(-1);if(last&&(last.text+'\n\n'+s.text).length<=1000)last.text+='\n\n'+s.text;else batches.push({text:s.text});}
 const prompts=i?[
 {name:'hero',prompt:style+' '+d.art},
 {name:'story',prompt:style+' '+d.scene},
 {name:'worship',prompt:style+` Simple Telugu home puja with a framed reverent ${d.name} depiction consistent with: ${d.art}. Flowers and fruit, safe lamp on broad tray, modest respectful family offering prayers, no extravagant ritual.`},
 {name:'example',prompt:style+' Clearly modern Indian daily life example (not a scripture scene): '+d.example+' Do not include a deity in this modern scene.'},
 {name:'reflection',source:'data/productions/divine-wisdom/gita-series-intro/path.png',prompt:'Reuse approved landscape metaphor: luminous path, peaceful reflection, no scriptural characters.'},
 {name:'temple',source:'data/productions/divine-wisdom/gita-series-intro/calm.png',prompt:'Reuse approved generic devotional atmosphere; never label as an actual temple or alankaram.'}
 ]:[
 {name:'hero',prompt:style+' Goddess Durga with exactly eight graceful arms, lion mount, benevolent protective face, red gold sari, luminous celestial temple courtyard with rows of lamps; introduction to Navaratri, no text.'},
 {name:'story',prompt:style+' Goddess Durga as protective mother, traditional weapons, symbolic buffalo-shaped shadow fading far away, no combat gore, dawn spreading across an Indian landscape.'},
 {name:'worship',prompt:style+' A Telugu family begins simple home Devi puja, framed goddess painting, flowers, fruit and decorated kalasha on broad tray, respectful warm scene, no text.'},
 {name:'mountain',prompt:style+' Himalayan valley at sunrise, snow mountains, river, white lotus, no characters, spiritual fresh beginning.'},
 {name:'example',prompt:style+' Modern Telugu family seated together listening thoughtfully to a devotional story, adults elderly person and child, warm home lamplight, no text.'},
 {name:'reflection',source:'data/productions/divine-wisdom/gita-series-intro/path.png',prompt:'Reuse approved luminous path as editorial metaphor.'},
 {name:'temple',source:'data/productions/divine-wisdom/gita-series-intro/calm.png',prompt:'Reuse generic devotional atmosphere, not an actual temple.'}
 ];
 for(const p of prompts)if(p.source)await copyFile(p.source,`${dir}/${p.name}.png`);
 await writeFile(dir+'/image-prompts.json',JSON.stringify(prompts,null,2));
 const thumbnailPrompt=style+` YouTube thumbnail, clear large Telugu title: "${i?d.name:'దేవీ నవరాత్రులు'}"; smaller subtitle: "${i?'రూపం '+i:'ఎందుకు? ఎలా?'}". Dignified goddess on right, clean dark left for title; ${i?d.art:'Durga seated on lion, golden light'}. Do not add channel logo; final overlay uses approved logo.`;
 await writeFile(dir+'/THUMBNAIL-PROMPT.md',thumbnailPrompt);
 await writeFile(dir+'/script-te.md',`# ${title}\n\n`+d.sections.map(s=>`## ${s.title}\n\n${s.text}`).join('\n\n')+'\n\n## Sources and editorial notes\n\n'+notes+'\n\n'+sources.join('\n'));
 videos.push({slug:d.slug,form:i,name:d.name,projectId,dir,voiceCalls:batches.length,characters:batches.reduce((n,b)=>n+b.text.length,0),words:d.sections.reduce((n,s)=>n+s.text.trim().split(/\s+/u).length,0),status:'script-prepared',imagesGenerated:false,narrationGenerated:false,rendered:false});
 await writeFile(root+'/production-plan.json',JSON.stringify({seriesId,tradition:'Navadurga with Telugu regional notes',privacy:'private',narrationApproval:'pending; earlier Gita authorizations are exhausted',videos},null,2));
 }
 console.log(JSON.stringify({seriesId,videos:videos.length,voiceCalls:videos.reduce((n,v)=>n+v.voiceCalls,0),characters:videos.reduce((n,v)=>n+v.characters,0),details:videos.map(({form,name,voiceCalls,characters,words})=>({form,name,voiceCalls,characters,words}))},null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
