"""Render the commissioned Telugu Diwali short and explainer from original art and timed speech."""
from pathlib import Path
import json, subprocess, re, math, sys
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'data/productions/divine-wisdom/diwali-special-2026-11-08'
P=json.loads((OUT/'plan.json').read_text(encoding='utf-8-sig'))
def run(args): subprocess.run(args,check=True,cwd=ROOT)
def probe(path): return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(path)]))
def ass_time(t):
 t=round(max(0,t)*100);return f'{t//360000}:{t//6000%60:02}:{t//100%60:02}.{t%100:02}'
def srt_time(t):
 t=round(max(0,t)*1000);return f'{t//3600000:02}:{t//60000%60:02}:{t//1000%60:02},{t%1000:03}'
def write_json(name,value): (OUT/name).write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf8')
def render(variant):
 short=variant=='short';w,h=(1080,1920) if short else (1920,1080)
 work=OUT/f'{variant}-pieces';work.mkdir(exist_ok=True)
 timeline=[];phrases=[];offset=0 if short else 3
 if not short:
  intro=work/'intro.mp4'
  if not intro.exists():run(['ffmpeg','-v','error','-nostdin','-n','-loop','1','-framerate','24','-i',str(OUT/'art/long-home-v2.png'),'-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-vf',f'scale={w}:{h},drawbox=x=0:y=0:w=iw:h=ih:color=black@0.72:t=fill,format=yuv420p','-t','3','-c:v','libx264','-threads','2','-preset','fast','-crf','21','-c:a','aac','-b:a','192k',str(intro)])
 for s in P[variant]:
  stem=f'{variant}-voice-{s["index"]:02}-sindhuja';mp3=OUT/f'{stem}.mp3'
  a=json.loads((OUT/f'{stem}-alignment.json').read_text(encoding='utf8'))
  text=''.join(a['characters']);assert text==s['text'],f'Text alignment mismatch {stem}'
  starts=a['character_start_times_seconds'];ends=a['character_end_times_seconds']
  words=[]
  for m in re.finditer(r'\S+',text):
   start=min(starts[m.start():m.end()]);end=max(ends[m.start():m.end()])
   assert end-start>.005,f'Compressed word in {stem}: {m.group()}'
   words.append({'text':m.group(),'start':start+offset,'end':end+offset})
  seconds=math.ceil((float(probe(mp3)['format']['duration'])+.18)*24)/24
  timeline.append({**s,'start':offset,'duration':seconds,'end':offset+seconds})
  group=[];limit=38 if short else 78
  for word in words:
   if group and (len(' '.join(x['text'] for x in group+[word]))>limit or len(group)>=(4 if short else 8)):
    phrases.append({'text':' '.join(x['text'] for x in group),'start':group[0]['start'],'end':min(word['start'],group[-1]['end']+.12)});group=[]
   group.append(word)
  if group:phrases.append({'text':' '.join(x['text'] for x in group),'start':group[0]['start'],'end':min(offset+seconds,group[-1]['end']+.14)})
  piece=work/f'{s["index"]:02}.mp4'
  if not piece.exists():
   # Preserve the full illustration by fitting it on a dark background. Slow zoom stays inside safe margins.
   vf=f"scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color=0x100e20,setsar=1,zoompan=z='min(1.035,1+on*0.000025)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s={w}x{h}:fps=24,format=yuv420p"
   run(['ffmpeg','-v','error','-nostdin','-n','-loop','1','-framerate','24','-i',str(OUT/'art'/f'{s["image"]}.png'),'-i',str(mp3),'-vf',vf,'-af',f'aresample=48000,apad,atrim=duration={seconds}', '-t',str(seconds),'-c:v','libx264','-threads','3','-preset','fast','-crf','21','-c:a','aac','-b:a','192k','-ar','48000','-ac','2',str(piece)])
  offset+=seconds
 write_json(f'{variant}-timeline.json',{'seconds':offset,'scenes':timeline,'captionTiming':'provider character alignment','fullListeningVerified':False})
 header=f'''[Script Info]
ScriptType: v4.00+
PlayResX: {w}
PlayResY: {h}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Noto Sans Telugu,{58 if short else 56},&H00FFFFFF,&H00FFFFFF,&H0020150B,&H90000000,1,0,0,0,100,100,0,0,1,3,1,2,{100 if short else 180},{140 if short else 180},{320 if short else 72},1
Style: Heading,Noto Sans Telugu,{49 if short else 45},&H0099DDFF,&H0099DDFF,&H0020150B,&H90000000,1,0,0,0,100,100,0,0,1,2,1,8,80,100,{160 if short else 54},1
Style: Brand,Noto Sans,22,&H00DADADA,&H00DADADA,&H0020150B,&H90000000,0,0,0,0,100,100,0,0,1,1,0,8,50,70,{104 if short else 22},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
 header+=f'Dialogue: 2,0:00:00.00,{ass_time(offset)},Brand,,0,0,0,,DIVINE WISDOM TELUGU\n'
 if not short:header+='Dialogue: 2,0:00:00.00,0:00:03.00,Heading,,0,0,0,,{\\pos(960,730)\\fs62}దీపావళి ఎందుకు జరుపుకుంటాం?\nDialogue: 2,0:00:00.00,0:00:03.00,Heading,,0,0,0,,{\\pos(960,840)\\fs38}కథలు · దీపాల ప్రాధాన్యం · లక్ష్మీపూజ\n'
 for s in timeline:
  header+=f'Dialogue: 2,{ass_time(s["start"])},{ass_time(s["end"])},Heading,,0,0,0,,{s["title"]}\n'
  if s.get('source'):header+=f'Dialogue: 2,{ass_time(s["start"])},{ass_time(s["end"])},Brand,,0,0,0,,{{\\pos({w//2},{260 if short else 125})\\fs26}}{s["source"]}\n'
 for ph in phrases:header+=f'Dialogue: 3,{ass_time(ph["start"])},{ass_time(ph["end"])},Caption,,0,0,0,,{ph["text"]}\n'
 ass=OUT/f'{variant}-captions.ass';ass.write_text(header,encoding='utf8')
 (OUT/f'{variant}-captions.srt').write_text('\n\n'.join(f'{i+1}\n{srt_time(ph["start"])} --> {srt_time(ph["end"])}\n{ph["text"]}' for i,ph in enumerate(phrases))+'\n',encoding='utf8')
 outro=timeline[-1]['start']
 header+=f'Dialogue: 2,{ass_time(outro)},{ass_time(offset)},Heading,,0,0,0,,{{\\pos({w//2},{int(h*.57) if short else 730})\\fs{40 if short else 42}}}LIKE  ·  SUBSCRIBE  ·  SHARE  ·  COMMENT\n'
 ass.write_text(header,encoding='utf8')
 concat=work/'concat.txt';concat.write_text(("file 'intro.mp4'\n" if not short else '')+'\n'.join(f"file '{s['index']:02}.mp4'" for s in P[variant])+'\n',encoding='utf8')
 target=OUT/f'diwali-telugu-{variant}-1080p.mp4'
 if not target.exists():
  rel=ass.relative_to(ROOT).as_posix()
  vf=f"drawbox=x=0:y={int(h*.76) if short else h-205}:w=iw:h={int(h*.24) if short else 205}:color=black@0.5:t=fill,drawbox=x=0:y=0:w=iw:h=ih:color=black@0.65:t=fill:enable='gte(t,{outro})',ass=filename='{rel}':fontsdir='public/fonts':shaping=complex"
  graph=f"[0:v]{vf}[base];[1:v]split=3[c][o][i];[c]scale={150 if short else 160}:-1[corner];[o]scale={430 if short else 420}:-1[end];[i]scale=460:-1[intro];[base][corner]overlay=W-w-30:{46 if short else 28}:enable='between(t,{0 if short else 3},{outro})'[v1];[v1][end]overlay=(W-w)/2:{390 if short else 220}:enable='gte(t,{outro})'[v2];[v2][intro]overlay=(W-w)/2:190:enable='lt(t,{0 if short else 3})',format=yuv420p[v]"
  run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(concat),'-i',str(OUT/'art/channel-logo-transparent.png'),'-filter_complex_threads','2','-filter_complex',graph,'-map','[v]','-map','0:a:0','-af','loudnorm=I=-16:TP=-1.5:LRA=11','-c:v','libx264','-threads','3','-preset','fast','-crf','20','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart',str(target)])
 info=probe(target);v=next(s for s in info['streams'] if s['codec_type']=='video');a=next(s for s in info['streams'] if s['codec_type']=='audio')
 assert (v['width'],v['height'])==(w,h);assert v['codec_name']=='h264' and a['codec_name']=='aac';assert abs(float(info['format']['duration'])-offset)<.3
 run(['ffmpeg','-v','error','-nostdin','-i',str(target),'-f','null','-'])
 for name,t in [('opening',2),('middle',offset/2),('ending',offset-4)]:
  frame=OUT/f'{variant}-review-{name}.jpg'
  if not frame.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(t),'-i',str(target),'-frames:v','1','-q:v','2',str(frame)])
 write_json(f'{variant}-verification.json',{'file':str(target),'seconds':float(info['format']['duration']),'width':w,'height':h,'video':'h264','audio':'aac','fullDecodePassed':True,'alignedCaptionPhrases':len(phrases),'fullListeningVerified':False,'published':False})
 (OUT/f'{variant}-chapters.txt').write_text('\n'.join(f'{int(s["start"])//60:02}:{int(s["start"])%60:02} {s["title"]}' for s in timeline)+'\n',encoding='utf8')
 print(json.dumps({'variant':variant,'seconds':offset,'file':str(target)}),flush=True)
if __name__=='__main__':
 for variant in (sys.argv[1:] or ['short','long']):render(variant)
