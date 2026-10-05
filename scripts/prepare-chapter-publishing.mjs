import {youtubeChapterSummaryEntries} from './youtube-chapters.mjs';
import 'dotenv/config';
import {productionPolicy} from './divine-production-policy.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const dir=process.argv[2]||'data/productions/divine-wisdom/gita-chapter-1/meaning-v1';
const config=JSON.parse(await readFile(`${dir}/episode.json`,'utf8')),state=JSON.parse(await readFile(`${dir}/state.json`,'utf8')),p=JSON.parse(await readFile(`${dir}/completed-timeline.json`,'utf8')),verified=JSON.parse(await readFile(`${dir}/verification-full.json`,'utf8'));
const {chapterNumber,verseCount}=productionPolicy(config);
assert(verified.decodedEntireFile&&(verified.allVerseMeaningsCovered||verified.all47VerseMeaningsCovered)&&verified.noSanskritRecitation&&verified.width===1920);
const variant=p.document.variants.find(v=>v.id===config.variantId),scenes=variant.sceneIds.map(id=>p.document.scenes.find(s=>s.id===id));
const stamp=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
let at=0;const chapters=scenes.map(s=>{const sec=config.sections.find(x=>s.id===config.prefix+'-'+x.id),start=at;at+=s.duration;return {start,section:sec};});
const labels={welcome:'Welcome',hook:'Why Chapter 1?',context:'Setting and speakers',recap:'Chapter recap',practice:'Practical reflection',conclusion:'Conclusion',next:'Next: Chapter 2',closing:'Subscribe and comment','act-1':'The armies and hidden fear','act-12':'Conches and rising tension','act-20':'A request that changes everything','act-28':'Arjuna crisis and channel reminder','act-38':'Family and society concerns','act-45':'The bow falls and what follows'};
const chapterEntries=chapters.filter(x=>!/-part-\d+$/.test(x.section.id));
const compactChapters=youtubeChapterSummaryEntries(chapterEntries,at).map(x=>`${stamp(x.start)} ${(chapterNumber===1?labels[x.section.id]:x.section.id==='next'?`Next: Chapter ${chapterNumber+1}`:x.section.title)||`Story section ${x.section.id.replace('act-','')}`}`).join('\n');
const apology='ఉచ్చారణ, అనువాదం లేదా వివరణలో పొరపాటు ఉంటే క్షమాపణలు కోరుతున్నాం. సరైన మూలంతో కామెంట్‌లో తెలియజేయండి; పరిశీలించి సరిచేస్తాం.';
let description=`Divine Wisdom Telugu\nభగవద్గీత మొదటి అధ్యాయం — అర్జున విషాద యోగం\n\nఅధ్యాయం 1, శ్లోకాలు 1 నుంచి 47 అన్నింటికీ సులభమైన తెలుగు అర్థం, సందర్భం, తాత్పర్యం. సంస్కృత పఠనం లేదు. ప్రతి శ్లోకం సంఖ్యతో వివరిస్తాం. పాత్రల వాదనలు, కృష్ణుని బోధ, ఆధునిక జీవిత ఉదాహరణలను వేరు చేసి వివరించాం.\n\nవీడియో భాగాలు / Chapters:\n${compactChapters}\n\nమూలాలు:\n${config.sources.join('\n')}\n\nతెలుగు వివరణ స్వతంత్ర విద్యాపరమైన రచన. చారిత్రక సామాజిక పదాలను వాటి సందర్భంలో వివరించాం. ఆధునిక ఉదాహరణలు అర్థం చేసుకోవడానికి ఇచ్చిన అన్వయాలు.\nAI disclosure: Illustrations and narration are AI-generated. Images are artistic interpretations, not historical photographs. ${config.originalMusic?'Soft original synthesized instrumental music; no external song samples.':'No music.'}\n\nలైక్, షేర్ చేయండి. Divine Wisdom Telugu ఛానల్‌కు సబ్‌స్క్రైబ్ చేయండి. మీరు కొత్తగా నేర్చుకున్న విషయాన్ని కామెంట్ చేయండి.\n\n#BhagavadGita #BhagavadGitaTelugu #DivineWisdomTelugu #ArjunaVishadaYoga\n\n${apology}`;
if(chapterNumber!==1)description=description.replace('భగవద్గీత మొదటి అధ్యాయం — అర్జున విషాద యోగం',`భగవద్గీత అధ్యాయం ${chapterNumber} — ${config.chapterTitle}`).replace('అధ్యాయం 1, శ్లోకాలు 1 నుంచి 47',`అధ్యాయం ${chapterNumber}, శ్లోకాలు 1 నుంచి ${verseCount}`).replace('చారిత్రక సామాజిక పదాలను వాటి సందర్భంలో వివరించాం.','ఆత్మ స్వరూపం, కర్తవ్య నిర్వహణ, స్థిరమైన మనస్సు గురించి సందర్భంతో వివరిస్తాం.').replace('#ArjunaVishadaYoga','#SankhyaYoga');
assert(Buffer.byteLength(description)<=5000,'YouTube description too large');
const metadata={title:config.videoTitle,description,tags:['Bhagavad Gita Telugu',`Bhagavad Gita Chapter ${chapterNumber}`,chapterNumber===1?'Arjuna Vishada Yoga':'Sankhya Yoga','Divine Wisdom Telugu','భగవద్గీత','Gita Telugu meaning','Lord Krishna','Telugu devotional']};
assert([...metadata.title].length<=100);
execFileSync('ffmpeg',['-v','error','-y','-i',`${dir}/thumbnail.png`,'-q:v','2',`${dir}/thumbnail-upload.jpg`]);const jpeg=await readFile(`${dir}/thumbnail-upload.jpg`);assert(jpeg.length<2*1024*1024);
const client=new Client({name:'chapter-publishing-preparation',version:'1'});
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`,Connection:'close'}}}));
try{
 if(!state.youtubeThumbnailId){const r=await client.callTool({name:'import_asset',arguments:{projectId:config.projectId,name:`youtube-chapter-${chapterNumber}-thumbnail.jpg`,base64:jpeg.toString('base64')}});assert(!r.isError);state.youtubeThumbnailId=JSON.parse(r.content.find(c=>c.type==='text').text).id;await writeFile(`${dir}/state.json`,JSON.stringify(state,null,2));}
 const get=await client.callTool({name:'get_project',arguments:{projectId:config.projectId}});assert(!get.isError);const current=JSON.parse(get.content.find(c=>c.type==='text').text),edition=current.document.variants.find(v=>v.id===config.variantId);assert(edition);
 const publishing={...edition.publishing,titles:[metadata.title],description,chapters:compactChapters,hashtags:`#BhagavadGita #BhagavadGitaTelugu #DivineWisdomTelugu #${chapterNumber===1?'ArjunaVishadaYoga':'SankhyaYoga'}`};
 edition.publishing=publishing;current.document.publishing=publishing;
 const saved=await client.callTool({name:'update_project',arguments:{projectId:config.projectId,expectedRevision:current.revision,document:current.document}});assert(!saved.isError);
 await writeFile(`${dir}/publishing.json`,JSON.stringify(publishing,null,2));await writeFile(`${dir}/description-te.md`,description);await writeFile(`${dir}/CHAPTERS.txt`,compactChapters);
 const job=await client.callTool({name:'get_job',arguments:{jobId:state.renderJobs.full}});assert(!job.isError);assert.equal(JSON.parse(job.content.find(c=>c.type==='text').text).state,'completed','Publishing metadata must not invalidate the verified video');
 await writeFile(`${dir}/app-publishing-verification.json`,JSON.stringify({metadataSavedToCorrectEdition:true,renderStillCompleted:true,descriptionBytes:Buffer.byteLength(description),chapterCount:compactChapters.split('\n').length},null,2));
}finally{await client.close();}
await writeFile(`${dir}/youtube-description-te.txt`,description);await writeFile(`${dir}/youtube-metadata.json`,JSON.stringify({...metadata,privacyStatus:'private',containsSyntheticMedia:true},null,2));
await writeFile(`${dir}/youtube-private-batch.json`,JSON.stringify({privacy:'private',selection:`Complete Chapter ${chapterNumber} Telugu meanings only`,videos:[{episode:`Chapter ${chapterNumber}`,projectId:config.projectId,renderJobId:state.renderJobs.full,thumbnailAssetId:state.youtubeThumbnailId,metadata}]},null,2));
// No live upload: the channel's uploadLimitExceeded must be resolved first.
console.log(JSON.stringify({publishingReady:true,descriptionBytes:Buffer.byteLength(description),thumbnailBytes:jpeg.length,chapters:compactChapters.split('\n').length,liveUploadAttempted:false}));
