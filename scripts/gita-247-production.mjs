import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { readFile, writeFile } from 'node:fs/promises';
const projectId = 'a39b4823-f4d4-436b-be68-7d6694418d36';
const variantId = 'gita-247-strong-voice';
const profileId = '7e994f10-1088-464c-91fb-79297b8fd6cb';
const dir = 'data/productions/bhagavad-gita-telugu';
const parts = [
 ['ఫలితాల భయం', 'కష్టపడి పని చేస్తున్నా, ఫలితం ఏమవుతుందో అని భయపడుతున్నారా? భగవద్గీత రెండవ అధ్యాయం, నలభై ఏడవ శ్లోకం ఈ ఆలోచనకు ఒక దిశ చూపుతుంది.'],
 ['శ్లోకం 2.47', 'కర్మణ్యేవాధికారస్తే మా ఫలేషు కదాచన. మా కర్మఫలహేతుర్భూర్మా తే సంగోస్త్వకర్మణి.'],
 ['సులభమైన అర్థం', 'నీ కర్తవ్యాన్ని చేయడానికి నీకు అధికారం ఉంది. ఫలితాలపై మాత్రం అధికారం లేదు. ఫలాపేక్షనే పనికి కారణంగా చేసుకోకు. పని చేయకుండా ఉండటానికి కూడా మమకారం పెంచుకోకు.'],
 ['బాధ్యతను వదలవద్దు', 'అంటే లక్ష్యాలు పెట్టుకోవద్దని కాదు. బాధ్యతను వదిలేయమని కూడా కాదు. ఫలితంపై మమకారం తగ్గించి, నిబద్ధతతో పని చేయాలి. విజయం వచ్చినప్పుడు అంతా నా గొప్పతనమే అనే అహంకారం వద్దు.'],
 ['విద్యార్థి ఉదాహరణ', 'ఒక విద్యార్థి పరీక్షకు సిద్ధమవుతున్నాడనుకోండి. మార్కుల గురించి రోజంతా ఆందోళన చెందడం కంటే, పాఠాన్ని అర్థం చేసుకోవడం, సాధన చేయడం ఉపయోగకరం. ఇది ఈ బోధకు రోజువారీ ఉదాహరణ.'],
 ['ఈరోజు ఆచరణ', 'ఈరోజు ఒక ముఖ్యమైన పని ఎంచుకోండి. పూర్తి శ్రద్ధతో చేయండి. తర్వాత ఏమి నేర్చుకున్నారో ఆలోచించండి. ఫలితం ఆశించినట్లు రాకపోతే, తప్పును సరిదిద్దుకుని మళ్లీ ప్రయత్నించండి.'],
 ['గీత సందేశం', 'కర్తవ్యాన్ని భక్తితో చేయి. ఫలితానికి బానిస కావద్దు. ప్రయత్నాన్ని వదలవద్దు. ఇది శ్లోకం రెండవ అధ్యాయం, నలభై ఏడు ఆధారంగా మన జీవితానికి తీసుకునే ఒక ఆచరణాత్మక వివరణ.'],
];
const client = new Client({name:'gita-247-production',version:'1.0'});
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args});const t=r.content.find(c=>c.type==='text')?.text;if(r.isError)throw Error(t);return JSON.parse(t);}
try {
 let p=await call('get_project',{projectId});
 if(!p.document.variants.some(v=>v.id===variantId)){
  const source=p.document.variants.find(v=>v.id==='faad366a-4067-48e8-ad16-19e81dab5b30');
  const originals=source.sceneIds.map(id=>p.document.scenes.find(s=>s.id===id));
  const images=[originals[0],originals[1],originals[5],originals[0],originals[1],originals[5],originals[5]];
  const scenes=parts.map(([title,narration],i)=>({...structuredClone(images[i]),id:`gita-247-te-${i+1}`,title,narration,audioId:undefined,captions:[],duration:20,volume:1.25,narrationStale:false,captionsStale:false,status:'New verse episode awaiting narration',providers:{voice:profileId},voiceId:'sJrRcQEpUbZehhGBdEbD'}));
  const variant={...structuredClone(source),id:variantId,name:'గీత 2.47 · కర్తవ్యం · stronger voice',sceneIds:scenes.map(s=>s.id),sceneOverrides:{},framing:{},titleOverlay:'భగవద్గీత 2.47',targetDuration:120,maxDuration:180};
  p.document.scenes.push(...scenes);p.document.variants.push(variant);
  p.document.sources+='\nEpisode BG 2.47: https://www.gitasupersite.iitk.ac.in/dv/bhagavadgita/2.47 ; https://www.holy-bhagavad-gita.org/chapter/2/verse/47/ . Sanskrit verse in Telugu script; original Telugu explanatory paraphrase and student example, not a verbatim modern translation.';
  await call('update_project',{projectId,expectedRevision:p.revision,document:p.document});
 }
 await writeFile(`${dir}/script-gita-247-te.md`,'# భగవద్గీత 2.47 — కర్తవ్యం\n\nVoice: sJrRcQEpUbZehhGBdEbD; model eleven_v4. Sanskrit recitation in Telugu script; explanation and examples are original Telugu paraphrases.\nSources: https://www.gitasupersite.iitk.ac.in/dv/bhagavadgita/2.47 and https://www.holy-bhagavad-gita.org/chapter/2/verse/47/\n\n'+parts.map(([t,n],i)=>`## ${i+1}. ${t}\n\n${n}`).join('\n\n'));
 for(let i=0;i<parts.length;i++){
  p=await call('get_project',{projectId});const scene=p.document.scenes.find(s=>s.id===`gita-247-te-${i+1}`);
  if(scene.audioId){console.log(JSON.stringify({scene:i+1,status:'already recorded'}));continue;}
  const existing=await call('list_jobs',{projectId,limit:100});
  // New calls only occur for scenes without a persisted recording; do not retry a paid failure here.
  const job=await call('queue_generation',{projectId,kind:'voice',sceneId:scene.id,profileId,paidConfirmed:true});
  console.log(JSON.stringify({scene:i+1,jobId:job.id,status:job.state}));
  for(;;){await new Promise(r=>setTimeout(r,4000));const j=await call('get_job',{jobId:job.id});if(j.state==='completed'){console.log(JSON.stringify({scene:i+1,status:j.state}));break;}if(['failed','cancelled','needs_attention'].includes(j.state))throw Error(`Scene ${i+1}: ${j.state}: ${j.error}`);}
 }
 p=await call('get_project',{projectId});
 await writeFile(`${dir}/gita-247-production.json`,JSON.stringify({projectId,variantId,document:p.document,revision:p.revision,assets:p.assets},null,2));
 console.log(JSON.stringify({stage:'Narration ready',variantId,recordedSeconds:p.document.scenes.filter(s=>s.id.startsWith('gita-247-te-')).reduce((n,s)=>n+s.duration,0)}));
}finally{await client.close();}
