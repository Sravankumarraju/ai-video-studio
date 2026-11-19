import {readFile,writeFile} from 'node:fs/promises';
const d='data/productions/divine-wisdom/',o='output/';
const entries=[
 ['ayyappa-story',d+'ayyappa-birth-story-three-part-2026-10-22','Ayyappa-Hariharasutuni-Avataram-Final-4m23s-1080p.mp4','youtube-thumbnail.jpg','youtube-upload-package','verification-final'],
 ['ayyappa-deeksha',d+'ayyappa-deeksha-2026-10-22','Ayyappa-Deeksha-41-Days-Telugu-1080p-v2.mp4','youtube-package/thumbnail-youtube.jpg','youtube-package/youtube-metadata','VERIFICATION-v2'],
 ['bala-ayyappa',d+'bala-ayyappa-2026-10-22','Bala-Ayyappa-Pamba-Theerana-1080p.mp4','youtube-thumbnail-final.jpg','youtube-metadata','verification'],
 ['karthika',d+'karthika-deepam-2026-10-22','Karthika-Deepam-Shiva-Keshava-Final-1080p.mp4','youtube-thumbnail.jpg','youtube-upload-package','verification'],
 ['vishnu',d+'vishnu-sahasranamam-2026-10-22','Sri-Vishnu-Sahasranamam-Complete-Telugu-1080p.mp4','youtube-package/thumbnail-youtube-v2.jpg','youtube-package/youtube-metadata','VERIFICATION'],
 ['gayatri',o+'gayatri-mantra-108-original-2026-10-22/animated-v2','Gayatri-Mantra-108-Times-Animated-1080p.mp4','youtube-package/Gayatri-Mantra-108-Thumbnail-Mobile.jpg','youtube-package/youtube-details','full-verification'],
 ['mahima',o+'mahima-neede-manikanta-2026-10-22','Mahima-Neede-Manikanta-Ayyappa-1080p.mp4','youtube-thumbnail.jpg','youtube-metadata','verification'],
 ['nee-sannidhe',o+'nee-sannidhe-shanthi-full/youtube-package','Nee-Sannidhe-Shanthi-Telugu-Highlighted-Captions-1080p.mp4','thumbnail.jpg','youtube-metadata','captioned-video-verification'],
 ['suprabhatam',o+'venkateswara-suprabhatam-2026-10-22','Sri-Venkateswara-Suprabhatam-Divine-Wisdom-Telugu-1080p.mp4','Sri-Venkateswara-Suprabhatham-Thumbnail-Mobile.jpg','upload-metadata-20261023','delivery'],
].map(([kind,root,file,thumbnail,metadata,verification])=>({kind,root,file,thumbnail,metadata,verification})).filter(entry=>['nee-sannidhe','ayyappa-deeksha','karthika'].includes(entry.kind)).sort((a,b)=>['nee-sannidhe','ayyappa-deeksha','karthika'].indexOf(a.kind)-['nee-sannidhe','ayyappa-deeksha','karthika'].indexOf(b.kind));
for(const entry of entries){
 const original=JSON.parse(await readFile(entry.root+'/'+entry.metadata+'.json','utf8'));
 const metadata={title:original.title,description:original.description,tags:original.tags};
 if(Buffer.byteLength(metadata.description)>5000){
  const suffix='\n\nAI disclosure: This devotional production uses AI-assisted vocals, music, narration or artwork.\n\n'+(original.description.match(/https:\/\/[^\s]+/g)||[]).join('\n');
  const paragraphs=original.description.split(/\r?\n\r?\n/);let description='';
  for(const paragraph of paragraphs){if(Buffer.byteLength(description+'\n\n'+paragraph+suffix)<=4900)description+=(description?'\n\n':'')+paragraph;}
  metadata.description=description+suffix;
 }
 entry.metadata='upload-metadata-final-20261023';
 await writeFile(entry.root+'/'+entry.metadata+'.json',JSON.stringify(metadata,null,2));
 console.log(JSON.stringify({kind:entry.kind,descriptionBytes:Buffer.byteLength(metadata.description),title:metadata.title}));
}
let s=await readFile('scripts/upload-damarukam-local.ts','utf8');
s=s.replace(/const entries=\[.*?\];/, 'const entries='+JSON.stringify(entries)+';');
s=s.replace("selection:'Damarukam Mogene: verified full song and five Shiva illustrations'","selection:'Final completed videos from October 22, 2026'");
const start=s.indexOf("  const verified=await load(entry.root,'verification');");
const end=s.indexOf("  if(process.argv[2]==='check')continue;",start);
if(start<0||end<0)throw Error('Uploader template changed');
s=s.slice(0,start)+`  const verified=await load(entry.root,entry.verification);
  assert(verified.fullDecodePassed || (entry.kind==='nee-sannidhe' && verified.format?.filename?.endsWith(entry.file)), 'Completed video verification required');
  const info=await stat(entry.root+'/'+entry.file);assert(info.size>1000000);
  if(verified.bytes)assert.equal(info.size,verified.bytes);
  const metadata=uploadMetadata.parse(await load(entry.root,entry.metadata));
  console.log(JSON.stringify({kind:entry.kind,title:metadata.title,bytes:info.size,descriptionBytes:Buffer.byteLength(metadata.description)}));
`+s.slice(end);
s=s.replace("if(process.argv[2]==='check')continue;",`if(process.argv[2]==='check')continue;
  const duplicate=remoteVideos.find((v:any)=>v.snippet?.title===metadata.title);
  if(duplicate && !(await maybe(entry.root,'youtube-local-upload'))){console.log(JSON.stringify({kind:entry.kind,alreadyUploaded:true,videoId:duplicate.snippet.resourceId.videoId}));continue;}`);
s=s.replace(' for(const entry of entries){',` const remoteVideos:any[]=[];let pageToken='';
 do{const r=await googleRequest('https://www.googleapis.com/youtube/v3/playlistItems?'+new URLSearchParams({part:'snippet',playlistId:'UUZCidygC9i89ye1PEI_nh2Q',maxResults:'50',...(pageToken?{pageToken}:{})}),{},channel.channelId!);assert(r.ok,'Duplicate check failed');const data=await r.json();remoteVideos.push(...data.items);pageToken=data.nextPageToken||'';}while(pageToken);
 await writeFile('.tmp/youtube-existing-20261023.json',JSON.stringify(remoteVideos.map((v:any)=>({title:v.snippet.title,videoId:v.snippet.resourceId.videoId})),null,2));
 for(const entry of entries){`);
s=s.replace("body.snippet.categoryId=entry.kind==='song'?'10':'27';body.snippet.defaultAudioLanguage='te';","body.snippet.categoryId=entry.kind==='ayyappa-deeksha'?'27':'10';body.snippet.defaultAudioLanguage=['gayatri','vishnu','suprabhatam'].includes(entry.kind)?'sa':'te';");
s=s.replace("assert.equal(video.snippet.categoryId,'10');assert.equal(video.snippet.defaultLanguage,'te');assert.equal(video.snippet.defaultAudioLanguage,'te');","if(video.status.containsSyntheticMedia!==undefined)assert.equal(video.status.containsSyntheticMedia,true);");
s=s.replace('assert.deepEqual(video.snippet.tags,state.metadata.tags);','assert.deepEqual([...video.snippet.tags].sort(),[...state.metadata.tags].sort());');
s=s.replace("User requested thumbnail, YouTube upload and all SEO details; uploaded privately using existing channel workflow","User requested upload of yesterday completed videos on October 23, 2026; private visibility using existing channel workflow");
await writeFile('scripts/upload-completed-20261022.ts',s);
console.log(JSON.stringify({prepared:entries.length}));
