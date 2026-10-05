import 'dotenv/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const root='data/productions/divine-wisdom', output=`${root}/youtube-private-batch.json`;
const token=process.env.STORY_STUDIO_MCP_TOKEN;
assert(token,'Connector token unavailable');
const client=new Client({name:'youtube-publishing-preparation',version:'1.0'});
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${token}`,Connection:'close'}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args});const text=r.content.find(c=>c.type==='text')?.text;assert(!r.isError,text);return JSON.parse(text);}
const old=await readFile(output,'utf8').then(JSON.parse).catch(()=>({videos:[]}));
const videos=[];
try{
 for(const n of [0,1,2,3,4,5,6]){
  const dir=n===0?`${root}/gita-series-intro`:n===1?`${root}/gita-1-1/refined-v4`:n===2?`${root}/gita-1-2/devotional-v2`:`${root}/gita-1-${n}/devotional-v1`;
  const state=JSON.parse(await readFile(`${dir}/${n===1?'production-state.json':'state.json'}`,'utf8'));
  const publishing=JSON.parse(await readFile(`${dir}/${n===1?'publishing-package.json':'publishing.json'}`,'utf8'));
  const config=n>1?JSON.parse(await readFile(`${dir}/episode.json`,'utf8')):null;
  if(config && !config.descriptionSummary) config.descriptionSummary=config.sections?.find(s=>s.id==='overview')?.text || publishing.description;
  const projectId=n===0?'edef3ecc-f6c0-46ae-8ff1-7e31372816b3':state.projectId;
  const renderJobId=n===0?state.renderJobs['gita-intro-te-16x9-full']:state.renderJobs.full;
  assert(renderJobId,`Episode ${n}: no full render queued`);
  const jpeg=`${dir}/thumbnail-upload.jpg`;
  if(n>=3)execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',`${dir}/thumbnail.png`,'-q:v','2',jpeg]);
  const bytes=await readFile(jpeg);assert(bytes.length<2*1024*1024);
  let entry=old.videos.find(v=>v.renderJobId===renderJobId);
  const thumbnailAssetId=entry?.thumbnailAssetId || (await call('import_asset',{projectId,name:`youtube-${n===0?'intro':`episode-00${n}`}-thumbnail.jpg`,base64:bytes.toString('base64')})).id;
  const sources=config?.sources || [n===0?'https://www.holy-bhagavad-gita.org/':'https://www.holy-bhagavad-gita.org/chapter/1/verse/1/te/'];
  const summary=n===0?'భగవద్గీత ఎందుకు? అర్జునుడి సందేహం, ప్రయత్నం, సంబంధాలు, మన దృష్టి—రోజువారీ జీవితానికి గీత ఇచ్చే మార్గదర్శకత్వం. ప్రతి శ్లోకాన్ని తెలుగు అర్థం, వివరణ, ఉదాహరణతో నేర్చుకునే సిరీస్ పరిచయం.':n===1?'ధృతరాష్ట్రుడు సంజయుణ్ణి అడిగిన ప్రశ్న. ధర్మక్షేత్రం, కురుక్షేత్రం, మమకారం—మూల శ్లోకం, తెలుగు అర్థం, వివరణ, కుటుంబ జీవిత ఉదాహరణ.':config.descriptionSummary;
  const verse=config?.verseDisplay || (n===1?'ధృతరాష్ట్ర ఉవాచ ।\nధర్మక్షేత్రే కురుక్షేత్రే సమవేతా యుయుత్సవః ।\nమామకాః పాండవాశ్చైవ కిమకుర్వత సంజయ ॥ ౧ ॥':'');
  const apology='శ్లోక పఠనం, ఉచ్చారణ, అనువాదం లేదా వివరణలో పొరపాటు ఉంటే క్షమాపణలు కోరుతున్నాం. సరైన మూలంతో కామెంట్‌లో తెలియజేయండి; పరిశీలించి సరిచేస్తాం.';
  let description=`Divine Wisdom Telugu\n${n===0?'భగవద్గీత సిరీస్ పరిచయం':`భగవద్గీత 1.${n} · Episode 00${n}`}\n\n${summary}\n\n${verse?`మూల శ్లోకం:\n${verse}\n\n`:''}వీడియో భాగాలు:\n${publishing.chapters}\n\nమూలాలు:\n${sources.join('\n')}\n\nవివరణలోని ఆధునిక ఉదాహరణలు మన ఆచరణ కోసం ఇచ్చిన అన్వయాలు.\nAI disclosure: Illustrations and narration are AI-generated. Images are artistic interpretations, not historical photographs.\n\nసబ్‌స్క్రైబ్, లైక్, షేర్ చేయండి. మీరు నేర్చుకున్న విషయాన్ని కామెంట్‌లో చెప్పండి.\n\n#BhagavadGita #BhagavadGitaTelugu #DivineWisdomTelugu #TeluguSpirituality\n\n${apology}`;
  if(Buffer.byteLength(description)>5000){description=description.replace(summary, n===0?'భగవద్గీత సిరీస్ పరిచయం.':`శ్లోకం 1.${n}: మూల పఠనం, తెలుగు అర్థం, వివరణ, రోజువారీ జీవిత ఉదాహరణ.`);}
  assert(Buffer.byteLength(description)<=5000,`Episode ${n}: description exceeds UTF-8 byte limit`);
  const metadata={title:config?.videoTitle || publishing.titles[0],description,tags:['Bhagavad Gita Telugu','Divine Wisdom Telugu','భగవద్గీత','Telugu spiritual stories','Gita Telugu meaning','Lord Krishna','Telugu devotional',...(n?[`Bhagavad Gita 1.${n}`,`Gita episode 00${n}`]:['Bhagavad Gita introduction','Gita life lessons'])]};
  await writeFile(`${dir}/youtube-description-te.txt`,description);
  await writeFile(`${dir}/youtube-metadata.json`,JSON.stringify({...metadata,privacyStatus:'private',containsSyntheticMedia:true},null,2));
  videos.push({...entry,episode:n===0?'Introduction':`1.${n}`,projectId,renderJobId,thumbnailAssetId,metadata});
  await writeFile(output,JSON.stringify({privacy:'private',selection:'Introduction + latest long-form Episodes 1.1–1.6; drafts and Shorts excluded',videos},null,2));
  console.log(JSON.stringify({episode:n===0?'Introduction':`1.${n}`,renderJobId,descriptionBytes:Buffer.byteLength(description),thumbnailBytes:bytes.length}));
 }
}finally{await client.close();}
