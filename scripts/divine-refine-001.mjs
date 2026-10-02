import 'dotenv/config';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
const dir='data/productions/divine-wisdom/gita-1-1/refined-v4',source='data/productions/divine-wisdom/gita-1-1/recreated-v3';
const projectId='a39b4823-f4d4-436b-be68-7d6694418d36',variantId='gita-1-1-te-refined-v4',mode=process.argv[2]||'status';
await mkdir(dir,{recursive:true});let state;try{state=JSON.parse(await readFile(`${dir}/production-state.json`,'utf8'));}catch{state={projectId,variantId,renderJobs:{}};}
const save=()=>writeFile(`${dir}/production-state.json`,JSON.stringify(state,null,2)),token=process.env.STORY_STUDIO_MCP_TOKEN;if(!token)throw Error('Connector token unavailable');
const client=new Client({name:'divine-refine-001',version:'1.0'});await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${token}`,Connection:'close'}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args}),text=r.content.find(c=>c.type==='text')?.text;if(r.isError||!text)throw Error(text||'No response');return JSON.parse(text);}
try{
 if(mode==='assemble'){
  const p=await call('get_project',{projectId}),d=p.document,base=d.variants.find(v=>v.id==='gita-1-1-te-recreated-v3');if(!base)throw Error('Approved recreated version missing');
  if(d.variants.some(v=>v.id===variantId))console.log('Version already assembled');
  else{
   await writeFile(`${dir}/before-recreation.json`,JSON.stringify(p,null,2));await copyFile(`${source}/image-prompts.json`,`${dir}/image-prompts.json`);
   const scenes=base.sceneIds.map((id,index)=>{const s=structuredClone(base.sceneOverrides[id]||d.scenes.find(s=>s.id===id));s.id=s.id.replace('v3','v4');
    if(s.mediaType==='image'&&!s.id.endsWith('-shloka')&&!s.id.endsWith('-title')){s.motion=index%2?'pan-left':'pan-right';s.strength=.025;s.motionEasing='smooth';}
    if(s.id.endsWith('-shloka')){s.motion='static';s.strength=0;s.captions[0].text='ధృతరాష్ట్ర ఉవాచ ।\nధర్మక్షేత్రే కురుక్షేత్రే\nసమవేతా యుయుత్సవః ।\nమామకాః పాండవాశ్చైవ\nకిమకుర్వత సంజయ ॥';}
    s.status='Refined: smooth gentle pans and clear Telugu captions';return s;});
   let at=0;const times=scenes.map(s=>{const x={id:s.id,title:s.title,start:at,end:at+s.duration};at=x.end;return x;});
   const stamp=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
   const headings=[['logo-welcome','ఛానల్ స్వాగతం'],['title','భగవద్గీత 1.1'],['overview','ఈ ఎపిసోడ్‌లో ఏమి తెలుసుకుంటాం'],['book-context','శ్లోకానికి ముందు ఉన్న సందర్భం'],['shloka','శ్లోకం 1.1 పఠనం'],['meaning','సులభమైన తెలుగు అర్థం'],['explanation-a','వివరమైన వివరణ'],['example-a','కుటుంబ జీవిత ఉదాహరణ'],['conclusion','ఈ రోజు నేర్చుకున్న విషయం'],['next','తర్వాతి శ్లోకం పరిచయం'],['closing','సబ్‌స్క్రైబ్, లైక్, షేర్ మరియు కామెంట్']];
   const chapters=headings.map(([id,label])=>`${stamp(times.find(t=>t.id===`gita-001-v4-${id}`).start)} ${label}`).join('\n');
   const description=`భగవద్గీత 1.1 — ధృతరాష్ట్రుని ప్రశ్న | సులభమైన తెలుగు అర్థం | Divine Wisdom\n\nDivine Wisdom కు స్వాగతం. మన పవిత్ర గ్రంథాల్లోని బోధలను సులభంగా తెలుసుకుని, రోజువారీ జీవితంలో ఆలోచించి ఆచరించే ప్రయాణం ఇది.\n\nఎపిసోడ్: 001\nగ్రంథం: భగవద్గీత\nఅధ్యాయం: 1 — అర్జున విషాద యోగం\nశ్లోకం: 1.1\nభాష: తెలుగు\n\nఈ వీడియోలో కురుక్షేత్ర యుద్ధానికి ముందు ఉన్న సందర్భం, ధృతరాష్ట్రుడు సంజయుని అడిగిన ప్రశ్న, పూర్తి శ్లోక పఠనం, సులభమైన తెలుగు అర్థం, మనవారు–పరాయివారు అనే భావనపై ఆలోచన మరియు ఒక కుటుంబ జీవిత ఉదాహరణను తెలుసుకుంటాం. బంధువులపై ప్రేమతో పాటు, న్యాయంగా ఆలోచించడం గురించి మనం పరిశీలిద్దాం. ఈ జీవిత ఉదాహరణ వివరణ కోసం ఇచ్చిన ఉదాహరణ మాత్రమే; మూల శ్లోకంలోని సంఘటన కాదు.\n\nశ్లోకం:\nధృతరాష్ట్ర ఉవాచ ।\nధర్మక్షేత్రే కురుక్షేత్రే సమవేతా యుయుత్సవః ।\nమామకాః పాండవాశ్చైవ కిమకుర్వత సంజయ ॥\n\nమూలం / సూచన: భగవద్గీత, అధ్యాయం 1, శ్లోకం 1.\nశ్లోక మూలపాఠం మరియు సూచనార్థం: https://www.holy-bhagavad-gita.org/chapter/1/verse/1/ (Swami Mukundananda). మన తెలుగు వివరణ విద్యాపరమైన స్వతంత్ర సరళ వివరణ. ముద్రణను బట్టి పేజీ సంఖ్య మారుతుంది కాబట్టి అధ్యాయం–శ్లోకం సూచనను ఉపయోగిస్తున్నాం.\n\nవీడియో భాగాలు:\n${chapters}\n\nతర్వాతి ఎపిసోడ్: భగవద్గీత 1.2 — దుర్యోధనుడు ద్రోణాచార్యుని వద్దకు వెళ్లిన సందర్భం. ఒక్కో వీడియోలో ఒక్క శ్లోకాన్ని తెలుసుకుందాం.\n\nఈ వీడియో ద్వారా మీరు కొత్తగా ఏం నేర్చుకున్నారు? కామెంట్‌లో చెప్పండి. వీడియో నచ్చితే లైక్ చేయండి. మీ కుటుంబ సభ్యులతో, స్నేహితులతో షేర్ చేయండి. మరిన్ని జ్ఞాన విషయాల కోసం Divine Wisdom ఛానల్‌కు సబ్‌స్క్రైబ్ చేయండి.\n\nదృశ్యాలు ఊహాత్మక AI చిత్రాలు; అవి అన్ని సంఘటనలకు ప్రత్యక్ష చారిత్రక చిత్రణలు కావు. వాయిస్ ఓవర్ AI సహాయంతో రూపొందించబడింది.\n\n#BhagavadGita #BhagavadGitaTelugu #DivineWisdom #భగవద్గీత #తెలుగు #శ్రీకృష్ణుడు\n\nఈ వీడియోలో శ్లోక పఠనం, ఉచ్చారణ, అనువాదం లేదా వివరణలో ఏదైనా పొరపాటు ఉంటే మనస్ఫూర్తిగా క్షమాపణలు కోరుతున్నాం. దయచేసి సరైన మూలంతో కామెంట్‌లో తెలియజేయండి; పరిశీలించి సరిచేస్తాం.`;
   const publishing={titles:['భగవద్గీత 1.1 — ధృతరాష్ట్రుని ప్రశ్న | Divine Wisdom Telugu'],description,hashtags:'#BhagavadGita #BhagavadGitaTelugu #DivineWisdom #భగవద్గీత #తెలుగు #శ్రీకృష్ణుడు',chapters,thumbnailPrompt:scenes.find(s=>s.id.endsWith('-book-context')).imagePrompt};
   d.scenes.push(...scenes);d.variants.push({...structuredClone(base),id:variantId,name:'Divine Wisdom Telugu · 001 / 1.1 · smooth captions · 16:9',sceneIds:scenes.map(s=>s.id),sceneOverrides:{},framing:{},captions:true,fontSize:96,font:'Noto Sans Telugu',wordHighlight:true,highlightColor:'#ffd54a',background:true,outline:3,position:'bottom',captionBottom:.12,encodingPreset:'fast',publishing});
   await call('update_project',{projectId,expectedRevision:p.revision,document:d});
   await writeFile(`${dir}/description-te.md`,description+'\n');await writeFile(`${dir}/publishing-package.json`,JSON.stringify(publishing,null,2));await writeFile(`${dir}/completed-timeline.json`,JSON.stringify(await call('get_project',{projectId}),null,2));state.status='ready-to-render';state.seconds=at;await save();console.log(JSON.stringify({assembled:true,seconds:at,variantId}));
  }
 }
 if(mode==='publishing-cleanup'){
  const p=await call('get_project',{projectId}),v=p.document.variants.find(v=>v.id===variantId),publishing=v.publishing;
  publishing.chapters=publishing.chapters.split('\n').filter(line=>!line.startsWith('00:02 ')).join('\n');
  publishing.description=publishing.description.split('\n').filter(line=>!line.startsWith('00:02 ')).join('\n');
  await call('update_project',{projectId,expectedRevision:p.revision,document:p.document});
  await writeFile(`${dir}/description-te.md`,publishing.description+'\n');await writeFile(`${dir}/publishing-package.json`,JSON.stringify(publishing,null,2));await writeFile(`${dir}/completed-timeline.json`,JSON.stringify(await call('get_project',{projectId}),null,2));console.log('Publishing chapter list reviewed');
 }
 if(mode==='rerender-draft'){
  if(state.renderJobs.draft)state.renderJobs['draft-initial']=state.renderJobs.draft;
  state.renderJobs.draft=(await call('queue_render',{projectId,variantId,draft:true})).id;await save();console.log(JSON.stringify(await call('get_job',{jobId:state.renderJobs.draft})));
 }
 if(['draft','full'].includes(mode)){
  if(!['ready-to-render','completed'].includes(state.status))throw Error('Assemble before rendering');if(!state.renderJobs[mode]){state.renderJobs[mode]=(await call('queue_render',{projectId,variantId,draft:mode==='draft'})).id;await save();}console.log(JSON.stringify(await call('get_job',{jobId:state.renderJobs[mode]})));
 }
 if(mode==='status')for(const [kind,jobId] of Object.entries(state.renderJobs))if(!process.argv[3]||process.argv[3]===kind)console.log(JSON.stringify({kind,...await call('get_job',{jobId})}));
 if(mode==='download'){
  const kind=process.argv[3]||'full',jobId=state.renderJobs[kind],j=await call('get_job',{jobId});if(j.state!=='completed')throw Error('Current render incomplete');
  for(const format of ['mp4','srt','vtt']){const r=await fetch(`http://localhost:3000/api/mcp/files/jobs/${jobId}/download?format=${format}`,{headers:{Authorization:`Bearer ${token}`,Connection:'close'}});if(!r.ok)throw Error('Download failed');await writeFile(`${dir}/episode-001-${kind}.${format}`,Buffer.from(await r.arrayBuffer()));}if(kind==='full'){state.status='completed';state.completedAt=new Date().toISOString();await save();}console.log(JSON.stringify({downloaded:true,kind,...j.result}));
 }
}finally{await client.close();}
