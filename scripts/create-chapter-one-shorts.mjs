import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

// Recut saved, aligned chapter narration. No provider calls or account writes.
const root='data/productions/divine-wisdom/gita-chapter-1';
const out=`${root}/chapter-shorts-v1`;
await mkdir(out,{recursive:true});
const project=JSON.parse(await readFile(`${root}/audio-corrected-v5/completed-timeline.json`,'utf8'));
const source=JSON.parse(await readFile(`${root}/story-v4/state.json`,'utf8'));
const variant=project.document.variants.find(v=>v.id==='gita-chapter-1-te-audio-corrected-v5');
const sources=new Map(Object.entries(source.finished).map(([id,a])=>[a.audioId,`${root}/story-v4/${id}-finished.wav`]));
const corrected=JSON.parse(await readFile(`${root}/audio-corrected-v5/state.json`,'utf8'));
for(const [name,a] of Object.entries(corrected.audio))sources.set(a.id,`${root}/audio-corrected-v5/${name}-finished.wav`);
const images=new Map(Object.entries(source.images).map(([name,id])=>[id,`${root}/visual-v2/${name}.png`]));
const scene=name=>{const id=`gita-chapter-1-story-v4-${name}`;return {...project.document.scenes.find(s=>s.id===id),...variant.sceneOverrides?.[id]};};
const pick=(name,startText,endText)=>{
 const s=scene(name),words=s.captions.flatMap(c=>c.words||[]);
 const full=words.map(w=>w.text).join(' ');
 const start=startText?full.indexOf(startText):0;assert(start>=0,`${name}: start missing`);
 const end=endText?full.indexOf(endText,start)+endText.length:full.length;assert(end>start);
 let at=0;const selected=words.filter(w=>{const p=at;at+=w.text.length+1;return p>=start&&p<end;});assert(selected.length);
 const first=words.indexOf(selected[0]),last=words.indexOf(selected.at(-1));
 const from=first?(words[first-1].end+selected[0].start)/2:0;
 const to=last<words.length-1?(selected.at(-1).end+words[last+1].start)/2:s.duration;
 return {sceneId:s.id,audio:sources.get(s.audioId),image:images.get(s.assetId),start:(s.audioStart||0)+from,duration:to-from,text:selected.map(w=>w.text).join(' '),words:selected.map(w=>({...w,start:Math.max(0,w.start-from),end:Math.min(to-from,w.end-from)}))};
};
const plans=[
 {id:'chapter-1-short-01',title:'అర్జునుడు విల్లు ఎందుకు వదిలాడు?',hook:'అర్జునుడు విల్లు\\Nఎందుకు వదిలాడు?',reference:'1.26–1.30, 1.47',openLoop:'ఆ క్షణం అతనికి ఏమి కనిపించింది?',beats:[pick('hook',null,'మరి ఏం జరిగింది?'),pick('hook-part-2')]},
 {id:'chapter-1-short-02',title:'శత్రువు వెనుక మనిషిని చూడగలమా?',hook:'శత్రువు వెనుక\\Nమనిషిని చూడగలమా?',reference:'1.21–1.27',openLoop:'ఆ ఒక్క చూపు నిర్ణయాన్ని ఎలా మార్చింది?',beats:[pick('verse-22-part-2','మన గొడవల్లో'),pick('verse-21-part-2','రథాన్ని మధ్యలో'),pick('verse-26-part-2','అదే యుద్ధరంగం.'),pick('verse-25-part-2','అర్జునుడు చూసిన')]},
 {id:'chapter-1-short-03',title:'గెలిచాక నీకు ఏమి మిగులుతుంది?',hook:'గెలిచాక నీకు\\Nఏమి మిగులుతుంది?',reference:'1.32, 1.47',openLoop:'అర్జునుడి సందేహం ఎక్కడ మొదలైంది?',beats:[pick('verse-32-part-2','యుద్ధం గెలవగలనా'),pick('verse-32','కృష్ణా,','అర్జునుడు ప్రశ్నిస్తున్నాడు.'),pick('hook-part-2','బయట రెండు','నిలబడ్డాయి.'),pick('verse-47-part-2','అధ్యాయం సమాధానం')]}
];
const ff=args=>execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y',...args],{stdio:'pipe',maxBuffer:4*1024*1024});
const ts=t=>`${Math.floor(t/3600)}:${String(Math.floor(t/60)%60).padStart(2,'0')}:${(t%60).toFixed(2).padStart(5,'0')}`;
const safe=s=>s.replace(/[{}]/g,'');
const deliveries=[];
for(const plan of plans){
 const dir=`${out}/${plan.id}`;await mkdir(dir,{recursive:true});
 const saved=await readFile(`${dir}/DELIVERY.json`,'utf8').then(JSON.parse).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
 if(saved){await stat(saved.mp4);deliveries.push(saved);console.log(JSON.stringify({preserved:plan.id}));continue;}
 const parts=[];let offset=0;const cues=[];
 for(const [i,b] of plan.beats.entries()){
  assert(b.audio&&b.image);await stat(b.audio);await stat(b.image);
  const part=`${dir}/beat-${i}.mp4`;
  // Fit the complete landscape illustration into a portrait composition.
  ff(['-loop','1','-i',b.image,'-ss',String(b.start),'-t',String(b.duration),'-i',b.audio,'-filter_complex',`[0:v]split=2[bg][fg];[bg]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,gblur=sigma=18,scale=1080:1920,eq=brightness=-0.22[base];[fg]scale=1080:900:force_original_aspect_ratio=decrease[front];[base][front]overlay=(W-w)/2:(H-h)/2-80,setsar=1[v]`,'-map','[v]','-map','1:a','-t',String(b.duration),'-r','30','-c:v','libx264','-preset','veryfast','-crf','22','-threads','2','-pix_fmt','yuv420p','-c:a','aac','-ar','48000',part]);
  parts.push(part);
  for(let k=0;k<b.words.length;){let group=[];while(k<b.words.length&&group.length<3){if(group.length&&[...group.map(w=>w.text).join(' ')+' '+b.words[k].text].length>32)break;group.push(b.words[k++]);}cues.push({start:offset+group[0].start,end:offset+group.at(-1).end,text:group.map(w=>w.text).join(' ')});}
  offset+=b.duration;
 }
 const narrationSeconds=offset;const endSeconds=4;const last=plan.beats.at(-1);
 const ending=`${dir}/ending.mp4`;
 ff(['-loop','1','-i',last.image,'-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-vf','scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=brightness=-0.55,setsar=1','-t',String(endSeconds),'-r','30','-c:v','libx264','-preset','veryfast','-crf','22','-threads','2','-pix_fmt','yuv420p','-c:a','aac',ending]);
 parts.push(ending);offset+=endSeconds;
 await writeFile(`${dir}/concat.txt`,parts.map(p=>`file '${resolve(p).replaceAll('\\','/')}'`).join('\n'));
 ff(['-f','concat','-safe','0','-i',`${dir}/concat.txt`,'-c','copy',`${dir}/assembled.mp4`]);
 const events=[];const event=(style,start,end,text)=>events.push(`Dialogue: 0,${ts(start)},${ts(end)},${style},,0,0,0,,${text}`);
 event('Brand',0,offset,'Divine Wisdom Telugu | అధ్యాయం 1');
 event('Hook',0,Math.min(4,narrationSeconds),plan.hook);
 event('Heading',4,narrationSeconds,plan.hook);
 for(const c of cues)event('Caption',c.start,c.end,safe(c.text));
 event('Tease',Math.max(4,narrationSeconds-4),narrationSeconds,plan.openLoop);
 event('End',narrationSeconds,offset,'పూర్తి కథ తెలుసుకోవాలంటే\\Nభగవద్గీత అధ్యాయం 1 చూడండి');
 event('Caption',narrationSeconds,offset,'Divine Wisdom Telugu');
 const ass=`[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 0\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Brand,Noto Sans Telugu,30,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,1,0,8,80,170,160,1\nStyle: Hook,Noto Sans Telugu,70,&H0054D5FF,&H0054D5FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,3,0,8,75,170,250,1\nStyle: Heading,Noto Sans Telugu,55,&H0054D5FF,&H0054D5FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,3,0,8,75,170,250,1\nStyle: Caption,Noto Sans Telugu,56,&H00FFFFFF,&H00FFFFFF,&H00000000,&H90000000,0,0,0,0,100,100,0,0,3,2,0,2,90,170,470,1\nStyle: Tease,Noto Sans Telugu,38,&H0054D5FF,&H0054D5FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,0,2,90,170,310,1\nStyle: End,Noto Sans Telugu,60,&H0054D5FF,&H0054D5FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,3,0,5,90,170,0,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${events.join('\n')}\n`;
 await writeFile(`${dir}/captions.ass`,ass);
 const mp4=`${dir}/${plan.id}.mp4`;
 ff(['-i',`${dir}/assembled.mp4`,'-vf',`ass=${dir}/captions.ass:fontsdir=public/fonts`,'-c:v','libx264','-preset','veryfast','-crf','20','-threads','2','-c:a','copy','-movflags','+faststart',mp4]);
 const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',mp4],{encoding:'utf8'}));const video=probe.streams.find(s=>s.codec_type==='video');assert(video.width===1080&&video.height===1920);assert(Number(probe.format.duration)<60);
 ff(['-i',mp4,'-f','null','-']);
 for(const [name,t] of [['hook',1],['middle',narrationSeconds/2],['ending',narrationSeconds+2]])ff(['-ss',String(t),'-i',mp4,'-frames:v','1',`${dir}/${name}.jpg`]);
 const delivery={id:plan.id,title:plan.title,reference:plan.reference,mp4:resolve(mp4),seconds:Number(probe.format.duration),width:video.width,height:video.height,fullyDecoded:true,newPaidCalls:0,uploaded:false,pattern:'hook → story reveal → open question → full-chapter CTA',sourceVariantId:variant.id,relatedVideoId:'5EmRG3uVNTo',relatedVideoLastRecordedVisibility:'private',relatedVideoReleaseRequired:true,narration:plan.beats.map(b=>b.text).join('\n\n'),beats:plan.beats.map(({words,...b})=>b)};
 await writeFile(`${dir}/DELIVERY.json`,JSON.stringify(delivery,null,2));
 await writeFile(`${dir}/publishing.json`,JSON.stringify({title:`${plan.title} | భగవద్గీత 1 #Shorts`,description:`${plan.title}\n\nభగవద్గీత మొదటి అధ్యాయం నుండి కథా భాగం. పూర్తి కథ కోసం Divine Wisdom Telugu ఛానల్‌లో అధ్యాయం 1 చూడండి.\nశ్లోక సందర్భం: ${plan.reference}\nAI-assisted illustrations and narration.\n#BhagavadGitaTelugu #DivineWisdomTelugu #Shorts`,relatedVideoId:'5EmRG3uVNTo',releaseNote:'Verify full chapter is publicly accessible before publishing or setting it as the related video.',uploadAuthorized:false},null,2));
 deliveries.push(delivery);console.log(JSON.stringify({completed:plan.id,seconds:delivery.seconds,file:delivery.mp4}));
}
await writeFile(`${out}/FINAL_DELIVERY.json`,JSON.stringify({status:'local_exports_decoded',newPaidCalls:0,uploaded:false,deliveries},null,2));
await writeFile(`${out}/README.md`,['# Three Chapter 1 teaser Shorts','','Shared pattern: immediate question hook → selected story reveal → unresolved question → Telugu full-chapter invitation. Original recorded narration and artwork reused; no paid calls. Portrait 1080×1920, Telugu captions, complete-file decoding verified.','',...deliveries.map(d=>`- ${d.title}: ${d.seconds.toFixed(1)} seconds. File: ${d.mp4}`),'','Existing five question Shorts use question → teaching → example → comment/follow and cover Chapters 2–5. These three use Chapter 1 and a full-video CTA.','', 'The corrected full chapter destination is YouTube video 5EmRG3uVNTo, last recorded private. At release, verify its current visibility and set it as the related video after it is accessible to viewers. No uploads or visibility changes performed.','', 'The CTA is on screen; narration uses only existing recorded sentences. Review spoken edits and all three videos before release.'].join('\n'));
