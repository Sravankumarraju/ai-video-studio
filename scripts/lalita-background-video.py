"""Resumable local Video 1 assembly from preserved narration and reviewed image assets."""
from pathlib import Path
from PIL import ImageFont
import json, re, math, subprocess, sys
ROOT=Path('data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12/video-01-background')
FPS=24
FONT=ImageFont.truetype('public/fonts/NotoSansTelugu.ttf',88)
def read(name):return json.loads((ROOT/(name+'.json')).read_text(encoding='utf-8'))
def save(name,value):(ROOT/(name+'.json')).write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')
def run(args):subprocess.run(args,check=True)
def probe(file):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(file)]))
def stamp(seconds):
 n=round(seconds*100);return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'

def assemble():
 config=read('episode');offset=0;scenes=[];allwords=[];concat=[];issues=[]
 (ROOT/'audio-pieces').mkdir(exist_ok=True)
 for s in config['sections']:
  stem=f'voice-{s["index"]:02}';a=read(stem+'-alignment');assert ''.join(a['characters'])==s['text'],'Narration text changed'
  native=float(probe(ROOT/(stem+'.mp3'))['format']['duration']);seconds=math.ceil(native*FPS)/FPS+(3 if s['index']==10 else .25)
  words=[]
  for m in re.finditer(r'\S+',s['text']):
   start=min(a['character_start_times_seconds'][m.start():m.end()]);end=max(a['character_end_times_seconds'][m.start():m.end()])
   w={'text':m.group(),'start':offset+start,'end':offset+end};words.append(w)
   if end-start<.015 and any('\u0c00'<=c<='\u0c7f' for c in m.group()):issues.append({'section':s['index'],'word':m.group(),'start':start,'end':end})
  clip=ROOT/'audio-pieces'/f'{s["index"]:02}.wav'
  if not clip.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT/(stem+'.mp3')),'-af',f'aresample=48000,apad,atrim=duration={seconds}','-ac','2','-c:a','pcm_s24le',str(clip)])
  concat.append(f"file 'audio-pieces/{s['index']:02}.wav'")
  scenes.append({**s,'section':s['title'],'start':offset,'end':offset+seconds,'words':words,'imagePath':f'assets/{s["image"]}.png'})
  allwords.extend(words);offset+=seconds
 save('narration-timing-check',{'words':len(allwords),'collapsedWords':issues,'allSourceTextMatches':True,'humanListeningVerified':False});assert not issues,f'Incomplete narration: {issues}'
 (ROOT/'audio-concat.txt').write_text('\n'.join(concat)+'\n',encoding='utf-8')
 raw=ROOT/'narration-raw.wav'
 if not raw.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'audio-concat.txt'),'-c','copy',str(raw)])
 master=ROOT/'video-01-master.wav';bed=Path('data/productions/divine-wisdom/animation-samples/original-devotional-bed.wav');assert bed.exists()
 if not master.exists():
  filters=f'[0:a]asplit=2[voice][side];[1:a]volume=0.12[music];[music][side]sidechaincompress=threshold=0.025:ratio=8:attack=10:release=350[ducked];[voice][ducked]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=9,afade=t=out:st={offset-2}:d=2[out]'
  run(['ffmpeg','-v','error','-nostdin','-n','-i',str(raw),'-stream_loop','-1','-i',str(bed),'-filter_complex',filters,'-map','[out]','-t',str(offset),'-ar','48000','-c:a','pcm_s24le',str(master)])
 save('timeline',{'seconds':offset,'scenes':scenes});save('words',{'words':allwords})
 print(json.dumps({'stage':'assembled','sections':len(scenes),'seconds':offset,'words':len(allwords)}),flush=True)

HEADER='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Noto Sans Telugu,88,&H004AD5FF,&H004AD5FF,&H00101010,&H95000000,0,0,0,0,100,100,0,0,3,2,0,2,130,130,90,1
Style: Title,Noto Sans Telugu,42,&H00FFFFFF,&H00FFFFFF,&H00101010,&H90000000,0,0,0,0,100,100,0,0,3,1,0,7,34,240,32,1
Style: Context,Noto Sans Telugu,30,&H00FFFFFF,&H00FFFFFF,&H00101010,&H90000000,0,0,0,0,100,100,0,0,3,1,0,7,34,240,94,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
def captions():
 t=read('timeline');pages=[]
 for s in t['scenes']:
  group=[];lines=[[]]
  def close():
   nonlocal group,lines
   if group:pages.append({'section':s['index'],'start':group[0]['start'],'end':min(s['end'],group[-1]['end']+.13),'lines':lines,'words':group})
   group=[];lines=[[]]
  for w in s['words']:
   if lines[-1] and (FONT.getlength(' '.join(x['text'] for x in lines[-1]+[w]))>1600 or len(lines[-1])>=5):
    if len(lines)==2:close()
    else:lines.append([])
   lines[-1].append(w);group.append(w)
   if len(group)>=8:close()
  close()
 for i,p in enumerate(pages):
  if i+1<len(pages):p['end']=min(p['end'],pages[i+1]['start'])
 assert all(p['start']<p['end'] for p in pages)
 for s in t['scenes']:
  length=s['end']-s['start'];events=[f'Dialogue: 1,{stamp(0)},{stamp(length)},Title,,0,0,0,,{s["title"]}']
  if s['index']==3:events.append(f'Dialogue: 1,{stamp(0)},{stamp(length)},Context,,0,0,0,,పురాణ సంప్రదాయం · దృశ్య రూపకల్పన')
  for p in pages:
   if p['section']!=s['index']:continue
   text='\\N'.join(' '.join(w['text'] for w in line) for line in p['lines'])
   events.append(f'Dialogue: 0,{stamp(p["start"]-s["start"])},{stamp(p["end"]-s["start"])},Caption,,0,0,0,,{text}')
  (ROOT/f'captions-{s["index"]:02}.ass').write_text(HEADER+'\n'.join(events)+'\n',encoding='utf-8')
 save('captions',{'pages':pages,'words':read('words')['words'],'fontSize':88,'highlightUnit':'phrase','highlightColor':'#ffd54a'})
 def srttime(sec):
  n=round(sec*1000);return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
 (ROOT/'captions.srt').write_text('\n\n'.join(f'{i+1}\n{srttime(p["start"])} --> {srttime(p["end"])}\n'+'\n'.join(' '.join(w['text'] for w in l) for l in p['lines']) for i,p in enumerate(pages))+'\n',encoding='utf-8')
 print(json.dumps({'stage':'captions','pages':len(pages)}),flush=True)

def render():
 t=read('timeline');(ROOT/'video-pieces').mkdir(exist_ok=True);concat=[]
 for s in t['scenes']:
  seconds=s['end']-s['start'];frames=round(seconds*FPS);target=ROOT/'video-pieces'/f'{s["index"]:02}.mp4'
  if target.exists():assert abs(float(probe(target)['format']['duration'])-seconds)<.08,'Existing incomplete clip needs inspection'
  else:
   assert (ROOT/s['imagePath']).exists(),s['imagePath']
   z="min(1.035,1+on*0.00004)" if s['index']%2==0 else "max(1,1.035-on*0.00004)"
   vf=f"[0:v]scale=2400:1350:force_original_aspect_ratio=increase,crop=2400:1350,zoompan=z='{z}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d={frames}:s=1920x1080:fps=24,setsar=1[bg];[1:v]scale=150:150[logo];[bg][logo]overlay=W-w-28:20,ass=filename='{ROOT.as_posix()}/captions-{s['index']:02}.ass':fontsdir='public/fonts':shaping=complex,format=yuv420p[out]"
   run(['ffmpeg','-hide_banner','-v','error','-nostdin','-n','-i',str(ROOT/s['imagePath']),'-i',str(ROOT/'assets/logo.png'),'-filter_complex',vf,'-map','[out]','-frames:v',str(frames),'-an','-c:v','libx264','-threads','2','-filter_complex_threads','1','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-video_track_timescale','24000',str(target)])
  concat.append(f"file 'video-pieces/{s['index']:02}.mp4'\nduration {seconds:.9f}")
  print(json.dumps({'stage':'render','scene':s['index']+1,'total':11}),flush=True)
 (ROOT/'video-concat.txt').write_text('\n'.join(concat)+'\n',encoding='utf-8')
 final=ROOT/'lalita-video-01-background-telugu-1080p.mp4'
 if not final.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'video-concat.txt'),'-i',str(ROOT/'video-01-master.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','256k','-t',str(t['seconds']),'-movflags','+faststart',str(final)])
 print(json.dumps({'stage':'final','seconds':t['seconds'],'file':str(final)}),flush=True)

def verify():
 t=read('timeline');file=ROOT/'lalita-video-01-background-telugu-1080p.mp4';info=probe(file);video=next(s for s in info['streams'] if s['codec_type']=='video');assert(video['width'],video['height'])==(1920,1080);assert abs(float(info['format']['duration'])-t['seconds'])<.1
 run(['ffmpeg','-v','error','-nostdin','-i',str(file),'-f','null','-'])
 for label,sec in [('opening',6),('dialogue',t['scenes'][3]['start']+6),('family',t['scenes'][6]['start']+5),('ending',t['seconds']-12)]:
  target=ROOT/f'review-{label}.png'
  if not target.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(sec),'-i',str(file),'-frames:v','1',str(target)])
 (ROOT/'chapters.txt').write_text('\n'.join(f'{int(s["start"])//60:02}:{int(s["start"])%60:02} {s["title"]}' for s in t['scenes'])+'\n',encoding='utf-8')
 save('verification',{'video':file.name,'seconds':float(info['format']['duration']),'width':1920,'height':1080,'sections':11,'allSourceTextMatches':True,'fullDecodePassed':True,'collapsedNarrationWords':len(read('narration-timing-check')['collapsedWords']),'captionPages':len(read('captions')['pages']),'font':'Noto Sans Telugu','highlightUnit':'phrase','fullHumanListeningVerified':False,'published':False})
 print(json.dumps(read('verification')),flush=True)

if __name__=='__main__':{'assemble':assemble,'captions':captions,'render':render,'verify':verify}[sys.argv[1]]()
