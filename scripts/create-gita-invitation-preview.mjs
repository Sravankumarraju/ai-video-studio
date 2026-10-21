import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const dir='data/productions/divine-wisdom/gita-invitation-short-v2';
await mkdir(dir,{recursive:true});
const narration='రాత్రి పడుకున్నా… మీ మనసులో అదే ఆలోచన తిరుగుతోందా? “రేపు ఏమవుతుంది? నేను ఓడిపోతే?” అర్జునుడు కూడా భయంతో కుంగిపోయాడు. గీతలో కృష్ణుడు చెప్పే దారి: ఫలితంపై పట్టును తగ్గించి, చేయవలసిన పనిపై దృష్టి పెట్టడం. మీ జీవితానికి ఒక చిన్న అన్వయం: ఈరోజు చేయగల ఒక్క పని ఎంచుకోండి. భయం, కోపం, మనస్సు గురించి మరింత తెలుసుకోవాలంటే, Divine Wisdom Telugu ఛానల్‌లో భగవద్గీత పూర్తి అధ్యాయాల ప్లేలిస్ట్ చూడండి.';
assert(narration.length<=600);
const art='data/productions/divine-wisdom/';
const beats=[
 {start:0,end:6,image:art+'gita-chapter-6/story-v1/rest.png',heading:'ఆలోచనలు\\Nఆగట్లేదా?',caption:'రాత్రి పడుకున్నా…\\Nమీ మనసులో అదే ఆలోచన?',label:'ఇది మీకోసమే'},
 {start:6,end:10,image:art+'gita-chapter-6/story-v1/cloud.png',heading:'రేపు ఏమవుతుంది?',caption:'నేను ఓడిపోతే?',label:'మీ మనసులో ఈ ప్రశ్న ఉందా?'},
 {start:10,end:13.5,image:art+'gita-chapter-1/visual-v2/chapter-grief.png',heading:'అర్జునుడికీ భయమే',caption:'అర్జునుడు కూడా కుంగిపోయాడు.',label:'మీ ప్రశ్నకు గీతలో ఒక దారి'},
 {start:13.5,end:22,image:art+'gita-chapter-6/story-v1/dialogue.png',heading:'పని మీద\\Nదృష్టి పెట్టండి',caption:'ఫలితంపై పట్టును తగ్గించి,\\Nచేయవలసిన పని చేయండి.',label:'భగవద్గీత 2.47 · సరళమైన వివరణ'},
 {start:22,end:27,image:art+'gita-chapter-6/story-v1/practice.png',heading:'ఒక్క పని.\\Nఈరోజే.',caption:'ఈరోజు చేయగల ఒక్క పని ఎంచుకోండి.',label:'మన జీవితానికి ఒక అన్వయం'},
 {start:27,end:36,image:art+'gita-chapter-1/visual-v2/chapter-book.png',heading:'భయం · కోపం\\Nమనస్సు',caption:'పూర్తి అధ్యాయాల ప్లేలిస్ట్ చూడండి',label:'Divine Wisdom Telugu'}
];
await writeFile(dir+'/SCRIPT.txt',narration+'\n');
await writeFile(dir+'/PRODUCTION_PLAN.json',JSON.stringify({projectId:'3888c8f8-e17f-46cf-813a-7b2613e2a7d4',status:'visual-preview-without-narration',language:'te',aspect:'vertical',targetSeconds:36,narration,characters:narration.length,plannedVoiceCalls:1,paidAuthorized:false,uploadAuthorized:false,beats,source:'https://www.holy-bhagavad-gita.org/chapter/2/verse/47/',sourceNote:'Original Telugu paraphrase; choosing one task today is an editorial application, not a direct quote or a promised cure.'},null,2));
const ff=args=>execFileSync('ffmpeg',['-hide_banner','-v','error','-y',...args],{stdio:'pipe',maxBuffer:4e6});
const stamp=t=>`${Math.floor(t/3600)}:${String(Math.floor(t/60)%60).padStart(2,'0')}:${(t%60).toFixed(2).padStart(5,'0')}`;
const events=[];
const event=(style,start,end,text)=>events.push(`Dialogue: 0,${stamp(start)},${stamp(end)},${style},,0,0,0,,${text}`);
for(const b of beats){event('Label',b.start,b.end,b.label);event('Hook',b.start,b.end,'{\\fad(100,100)}'+b.heading);event('Caption',b.start,b.end,b.caption);}
event('Brand',0,27,'DIVINE WISDOM TELUGU');
event('Small',0,36,'VISUAL DRAFT · Voice recording pending');
event('Action',30.5,36,'ఛానల్ → Playlists\\Nభగవద్గీత పూర్తి అధ్యాయాలు');
const styles=[
 ['Label',31,'&H0056D9FF',8,150],['Hook',78,'&H00FFFFFF',8,250],['Caption',43,'&H00FFFFFF',2,365],['Brand',22,'&H00FFFFFF',2,175],['Small',18,'&H00CFCFCF',2,130],['Action',35,'&H0056D9FF',2,230]
].map(([name,size,color,align,margin])=>`Style: ${name},Noto Sans Telugu,${size},${color},${color},&H00000000,&H90000000,${name==='Hook'?-1:0},0,0,0,100,100,0,0,1,2,1,${align},65,130,${margin},1`);
const ass=`[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 0\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n${styles.join('\n')}\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${events.join('\n')}\n`;
await writeFile(dir+'/preview.ass',ass);
for(const [i,b] of beats.entries()){
 ff(['-loop','1','-i',b.image,'-t',String(b.end-b.start),'-vf',`scale=768:1366:force_original_aspect_ratio=increase,crop=768:1366,zoompan=z='1+0.0005*on':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=720x1280:fps=30,eq=brightness=-0.23:saturation=0.8,drawbox=x=0:y=0:w=iw:h=510:color=black@0.25:t=fill,setsar=1`,'-an','-c:v','libx264','-preset','veryfast','-crf','23','-threads','2','-pix_fmt','yuv420p',`${dir}/beat-${i}.mp4`]);
}
await writeFile(dir+'/concat.txt',beats.map((b,i)=>`file '${resolve(`${dir}/beat-${i}.mp4`).replaceAll('\\','/')}'`).join('\n'));
ff(['-f','concat','-safe','0','-i',dir+'/concat.txt','-vf',`ass=${dir}/preview.ass:fontsdir=public/fonts`,'-c:v','libx264','-preset','veryfast','-crf','20','-threads','2','-movflags','+faststart',dir+'/gita-invitation-visual-preview.mp4']);
const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_format','-show_streams','-of','json',dir+'/gita-invitation-visual-preview.mp4'],{encoding:'utf8'}));
assert(Number(probe.format.duration)>=30&&Number(probe.format.duration)<=40);
ff(['-i',dir+'/gita-invitation-visual-preview.mp4','-f','null','-']);
for(const [name,t]of [['hook',1],['solution',17],['cta',33]])ff(['-ss',String(t),'-i',dir+'/gita-invitation-visual-preview.mp4','-frames:v','1',`${dir}/${name}.jpg`]);
console.log(JSON.stringify({status:'visual-preview-completed-without-narration',seconds:Number(probe.format.duration),mp4:resolve(dir+'/gita-invitation-visual-preview.mp4'),fullyDecoded:true,paidCalls:0}));
