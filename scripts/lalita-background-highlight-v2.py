"""Correct Video 1 captions, preserving the approved audio and prior export."""
from pathlib import Path
import json, subprocess, sys, math

ROOT=Path('data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12/video-01-background')
OUT=ROOT/'word-highlight-v2'
OUT.mkdir(exist_ok=True)
def read(name):return json.loads((ROOT/(name+'.json')).read_text(encoding='utf-8'))
def save(name,data):(OUT/(name+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
def run(args):subprocess.run(args,check=True)
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]))
def stamp(t):
 n=round(t*100);return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'
HEADER='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Noto Sans Telugu,88,&H00FFFFFF,&H00FFFFFF,&H00101010,&H95000000,0,0,0,0,100,100,0,0,3,2,0,2,130,130,90,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''

def prepare():
 t=read('timeline');captions=read('captions');allwords=read('words')['words'];checks=[]
 assert [w for p in captions['pages'] for w in p['words']]==allwords,'Caption words differ from original narration'
 for s in t['scenes']:
  events=[];intervals=[];count=0
  for p in captions['pages']:
   if p['section']!=s['index']:continue
   a=p['start'];b=p['end'];bounds=sorted(set([a,b]+[max(a,min(b,w['start'])) for w in p['words']]))
   for x,y in zip(bounds,bounds[1:]):
    start=round((x-s['start'])*100)/100;end=round((y-s['start'])*100)/100
    if end<=start:continue
    mid=(x+y)/2;active=next((w for w in reversed(p['words']) if w['start']<=mid),None);assert active
    text='\\N'.join(' '.join(('{\\c&H004AD5FF&}'+w['text']+'{\\c&H00FFFFFF&}') if w == active else w['text'] for w in line) for line in p['lines'])
    assert text.count('{\\c&H004AD5FF&}')==1
    events.append(f'Dialogue: 0,{stamp(start)},{stamp(end)},Caption,,0,0,0,,{text}');intervals.append((start,end));count+=1
   assert len(p['words'])==len([w for w in p['words'] if w['start']>=a and w['start']<b])
  assert all(a[1]<=b[0] for a,b in zip(intervals,intervals[1:])),'Caption overlap'
  (OUT/f'captions-{s["index"]:02}.ass').write_text(HEADER+'\n'.join(events)+'\n',encoding='utf-8')
  checks.append({'section':s['index'],'highlightEvents':count,'leftTopTitleEvents':0})
 save('CAPTION-CHECK',{'words':len(allwords),'pages':len(captions['pages']),'events':sum(c['highlightEvents'] for c in checks),'sections':checks,'whiteInactiveWords':True,'goldActiveWord':'#ffd54a','maximumActiveWords':1,'leftTopTextRemoved':True,'sourceAudioUnchanged':True,'userConfirmationReceived':False,'nextVideoStarted':False})
 print(json.dumps({'phase':'captions_prepared',**json.loads((OUT/'CAPTION-CHECK.json').read_text())}),flush=True)

def render():
 t=read('timeline');(OUT/'video-pieces').mkdir(exist_ok=True);concat=[]
 for s in t['scenes']:
  seconds=s['end']-s['start'];frames=round(seconds*24);target=OUT/'video-pieces'/f'{s["index"]:02}.mp4'
  if target.exists():assert abs(float(probe(target)['format']['duration'])-seconds)<.08,'Inspect incomplete clip'
  else:
   z="min(1.035,1+on*0.00004)" if s['index']%2==0 else "max(1,1.035-on*0.00004)"
   vf=f"[0:v]scale=2400:1350:force_original_aspect_ratio=increase,crop=2400:1350,zoompan=z='{z}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d={frames}:s=1920x1080:fps=24,setsar=1[bg];[1:v]scale=150:150[logo];[bg][logo]overlay=W-w-28:20,ass=filename='{OUT.as_posix()}/captions-{s['index']:02}.ass':fontsdir='public/fonts':shaping=complex,format=yuv420p[out]"
   run(['ffmpeg','-hide_banner','-v','error','-nostdin','-n','-i',str(ROOT/s['imagePath']),'-i',str(ROOT/'assets/logo.png'),'-filter_complex',vf,'-map','[out]','-frames:v',str(frames),'-an','-c:v','libx264','-threads','2','-filter_complex_threads','1','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-video_track_timescale','24000',str(target)])
  concat.append(f"file 'video-pieces/{s['index']:02}.mp4'\nduration {seconds:.9f}");print(json.dumps({'scene':s['index']+1,'total':11}),flush=True)
 (OUT/'video-concat.txt').write_text('\n'.join(concat)+'\n',encoding='utf-8')
 final=OUT/'Lalita-Video-01-Word-Highlighted-V2.mp4'
 if not final.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(OUT/'video-concat.txt'),'-i',str(ROOT/'lalita-video-01-background-telugu-1080p.mp4'),'-map','0:v:0','-map','1:a:0','-c','copy','-t',str(t['seconds']),'-movflags','+faststart',str(final)])
 print(json.dumps({'file':str(final),'seconds':t['seconds']}),flush=True)

def verify():
 t=read('timeline');final=OUT/'Lalita-Video-01-Word-Highlighted-V2.mp4';info=probe(final);v=next(s for s in info['streams'] if s['codec_type']=='video');assert(v['width'],v['height'])==(1920,1080);assert abs(float(info['format']['duration'])-t['seconds'])<.1
 run(['ffmpeg','-v','error','-nostdin','-i',str(final),'-f','null','-'])
 # Exact decoded-audio digest, preserving the approved old export's AAC stream.
 def audiohash(file):return subprocess.check_output(['ffmpeg','-v','error','-i',str(file),'-map','0:a:0','-f','hash','-hash','sha256','-']).decode().strip()
 same=audiohash(final)==audiohash(ROOT/'lalita-video-01-background-telugu-1080p.mp4');assert same,'Approved audio changed'
 captions=read('captions');p=captions['pages'][1]
 samples=[('highlight-a',(p['words'][1]['start']+p['words'][1]['end'])/2),('highlight-b',(p['words'][2]['start']+p['words'][2]['end'])/2),('dialogue',t['scenes'][3]['start']+6),('ending',t['seconds']-12)]
 for label,sec in samples:
  target=OUT/f'review-{label}.png'
  if not target.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(sec),'-i',str(final),'-frames:v','1',str(target)])
 save('VERIFICATION',{'file':final.name,'seconds':float(info['format']['duration']),'resolution':'1920x1080','fullDecodePassed':True,'approvedAudioDecodedSHA256Matches':same,'leftTopTextRemoved':True,'wordHighlight':True,'inactiveColor':'#ffffff','activeWordColor':'#ffd54a','reviewFrames':dict(samples),'userConfirmationReceived':False,'nextVideoStarted':False})
 print(json.dumps(json.loads((OUT/'VERIFICATION.json').read_text())),flush=True)

if __name__=='__main__':{'prepare':prepare,'render':render,'verify':verify}[sys.argv[1]]()
