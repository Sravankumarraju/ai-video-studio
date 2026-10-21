import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const dir='data/productions/divine-wisdom/gita-invitation-short-v2';
const token=process.env.STORY_STUDIO_MCP_TOKEN;assert(token,'Studio token unavailable');
const client=new Client({name:'finish-approved-gita-invitation',version:'1.0'});
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${token}`}}}));
try{
 const result=await client.callTool({name:'get_project',arguments:{projectId:'3888c8f8-e17f-46cf-813a-7b2613e2a7d4'}});assert(!result.isError);
 const project=JSON.parse(result.content.find(c=>c.type==='text').text);const scene=project.document.scenes.find(s=>s.id==='fresh-invitation-voice');assert(scene.audioId&&!scene.narrationStale);assert(scene.narration.length===386);
 await writeFile(dir+'/RECORDED_PROJECT.json',JSON.stringify(project,null,2));
 const response=await fetch(`http://localhost:3000/api/mcp/files/assets/${scene.audioId}`,{headers:{Authorization:`Bearer ${token}`}});assert(response.ok);await writeFile(dir+'/narration.mp3',Buffer.from(await response.arrayBuffer()));
 const ff=args=>execFileSync('ffmpeg',['-hide_banner','-v','error','-y','-filter_threads','1',...args],{stdio:'pipe',maxBuffer:4e6});
 const probe=file=>JSON.parse(execFileSync('ffprobe',['-v','error','-show_format','-show_streams','-of','json',file],{encoding:'utf8'}));
 const rawDuration=Number(probe(dir+'/narration.mp3').format.duration);assert(rawDuration>=30&&rawDuration<=39);
 const duration=Math.ceil((rawDuration+.5)*30)/30;
 const plan=JSON.parse(await readFile(dir+'/PRODUCTION_PLAN.json','utf8'));const bounds=[0,4.12,6.92,10.12,17.38,23.28,duration];
 const stamp=t=>`${Math.floor(t/3600)}:${String(Math.floor(t/60)%60).padStart(2,'0')}:${(t%60).toFixed(2).padStart(5,'0')}`;
 const events=[];const event=(style,start,end,text)=>events.push(`Dialogue: 0,${stamp(start)},${stamp(end)},${style},,0,0,0,,${text}`);
 for(const [i,b]of plan.beats.entries()){b.start=bounds[i];b.end=bounds[i+1];event('Label',b.start,b.end,b.label);event('Hook',b.start,b.end,'{\\fad(80,80)}'+b.heading);}
 const words=scene.captions.flatMap(c=>c.words||[]).filter(w=>w.text!=='”');
 for(let i=0;i<words.length;){const group=[];while(i<words.length&&group.length<3){if(group.length&&group.map(w=>w.text).join(' ').length+words[i].text.length>34)break;group.push(words[i++]);}event('Caption',group[0].start,group.at(-1).end,group.map(w=>w.text).join(' ').replace(/[{}]/g,''));}
 event('Brand',0,23.28,'DIVINE WISDOM TELUGU');
 event('Action',29.7,duration,'ఛానల్ → Playlists\\Nభగవద్గీత పూర్తి అధ్యాయాలు');
 const styles=[['Label',34,'&H0056D9FF',8,150],['Hook',82,'&H00FFFFFF',8,250],['Caption',58,'&H00FFFFFF',2,390],['Brand',26,'&H00FFFFFF',2,190],['Action',38,'&H0056D9FF',2,240]].map(([name,size,color,align,margin])=>`Style: ${name},Noto Sans Telugu,${size},${color},${color},&H00000000,&H90000000,${name==='Hook'?-1:0},0,0,0,100,100,0,0,1,3,1,${align},65,150,${margin},1`);
 await writeFile(dir+'/final.ass',`[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 0\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n${styles.join('\n')}\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${events.join('\n')}\n`);
 for(const [i,b] of plan.beats.entries()){ff(['-loop','1','-i',b.image,'-t',String(b.end-b.start),'-vf',`scale=1152:2048:force_original_aspect_ratio=increase,crop=1152:2048,zoompan=z='1+0.0004*on':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1080x1920:fps=30,eq=brightness=-0.19:saturation=0.85,drawbox=x=0:y=0:w=iw:h=740:color=black@0.20:t=fill,setsar=1`,'-an','-c:v','libx264','-preset','veryfast','-crf','22','-threads','1','-tune','zerolatency','-pix_fmt','yuv420p',`${dir}/final-beat-${i}.mp4`]);}
 await writeFile(dir+'/final-concat.txt',plan.beats.map((b,i)=>`file '${resolve(`${dir}/final-beat-${i}.mp4`).replaceAll('\\','/')}'`).join('\n'));
 const mp4=dir+'/gita-invitation-with-voice.mp4';
 ff(['-f','concat','-safe','0','-i',dir+'/final-concat.txt','-i',dir+'/narration.mp3','-vf',`ass=${dir}/final.ass:fontsdir=public/fonts`,'-af','loudnorm=I=-16:TP=-1.5:LRA=11,apad','-t',String(duration),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','veryfast','-crf','20','-threads','1','-tune','zerolatency','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',mp4]);
 const final=probe(mp4);assert(final.streams.some(s=>s.codec_type==='audio'));assert(final.streams.some(s=>s.width===1080&&s.height===1920));assert(Number(final.format.duration)<=40);
 ff(['-i',mp4,'-f','null','-']);
 for(const [name,time]of [['final-hook',1],['final-solution',14],['final-cta',31.7]])ff(['-ss',String(time),'-i',mp4,'-frames:v','1',`${dir}/${name}.jpg`]);
 const delivery={status:'complete-with-fresh-voice',projectId:project.id,voiceJobId:'8a0930e0-dbbc-4529-acf3-14cc723e04e7',audioId:scene.audioId,paidCalls:1,paidRetries:0,narrationCharacters:386,seconds:Number(final.format.duration),narrationSeconds:rawDuration,mp4:resolve(mp4),fullyDecoded:true,width:1080,height:1920,audioIncluded:true,captionTiming:'provider-word-aligned',speechRateChanged:false,uploaded:false,completedAt:new Date().toISOString()};
 await writeFile(dir+'/FINAL_DELIVERY.json',JSON.stringify(delivery,null,2));console.log(JSON.stringify(delivery));
}finally{await client.close();}

