"""Local recitation assembly, using saved acoustic timing and existing repair metadata only."""
from pathlib import Path
from PIL import ImageFont
import json,math,subprocess,sys,re,unicodedata
BASE=Path('data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12')
ROOT=BASE/'video-02-recitation';FPS=24
def load(name):return json.loads((ROOT/(name+'.json')).read_text(encoding='utf-8'))
def save(name,d):(ROOT/(name+'.json')).write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
def run(args):subprocess.run(args,check=True)
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]))
def stamp(t):
 n=round(t*100);return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'
def telugu(s):
 out=''
 for c in s:
  n=ord(c)
  if n==0x950:out+='ఓం'
  elif 0x966<=n<=0x96f:out+=str(n-0x966)
  elif 0x901<=n<=0x963:out+=chr(n+0x300)
  else:out+=c
 return out

def assemble():
 selected=load('units-selected');assert len(selected)==globals().get('EXPECTED_UNITS',188) and not any(u['issues'] for u in selected)
 assert [u['verse'] for u in selected if u['verse'] is not None]==list(range(1,184))
 scenes=[];offset=0;concat=[];(ROOT/'audio-pieces').mkdir(exist_ok=True)
 for u in selected:
  first=u.get('clipStart',max(0,u['sourceStart']-.15));end=min(float(probe(ROOT/u['sourceFile'])['format']['duration']),u.get('clipEnd',u['sourceEnd']+.30));seconds=math.ceil((end-first)*FPS)/FPS
  assert seconds>.5
  piece=ROOT/'audio-pieces'/f'{u["index"]:03}.wav'
  if not piece.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(first),'-i',str(ROOT/u['sourceFile']),'-af',f'aresample=48000,apad,atrim=duration={seconds}','-ac','2','-c:a','pcm_s24le',str(piece)])
  words=[{'text':telugu(w['text']),'sanskrit':w['text'],'start':offset+w['start']-first,'end':offset+w['end']-first} for w in u['words']]
  scenes.append({**u,'start':offset,'end':offset+seconds,'words':words,'image':str(BASE/'video-01-background/assets'/('lamp-manuscript.png' if u['name']=='nyasa' else 'hero.png'))})
  concat.append(f"file 'audio-pieces/{u['index']:03}.wav'");offset+=seconds
 # Reuse only the existing approved spoken CTA, after the completed prayer.
 old=BASE/'video-01-background';a=json.loads((old/'voice-10-alignment.json').read_text(encoding='utf-8'));episode=json.loads((old/'episode.json').read_text(encoding='utf-8'));text=episode['sections'][10]['text'];start=text.index('లైక్ చేయండి');s=a['character_start_times_seconds'][start];end=float(probe(old/'voice-10.mp3')['format']['duration']);seconds=math.ceil((end-s+3)*FPS)/FPS
 cta_index=len(selected);clip=ROOT/'audio-pieces'/f'{cta_index:03}.wav'
 if not clip.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(s),'-i',str(old/'voice-10.mp3'),'-af',f'aresample=48000,apad,atrim=duration={seconds}','-ac','2','-c:a','pcm_s24le',str(clip)])
 words=[]
 for m in re.finditer(r'\S+',text[start:]):
  i=start+m.start();j=start+m.end();words.append({'text':m.group(),'start':offset+min(a['character_start_times_seconds'][i:j])-s,'end':offset+max(a['character_end_times_seconds'][i:j])-s})
 scenes.append({'index':cta_index,'name':'closing-cta','verse':None,'text':text[start:],'start':offset,'end':offset+seconds,'words':words,'image':str(BASE/'video-01-background/assets/hero.png'),'timingSource':'approved existing Telugu narration alignment'})
 concat.append(f"file 'audio-pieces/{cta_index:03}.wav'");offset+=seconds
 (ROOT/'audio-concat.txt').write_text('\n'.join(concat)+'\n',encoding='utf-8')
 raw=ROOT/'recitation-raw.wav'
 if not raw.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'audio-concat.txt'),'-c','copy',str(raw)])
 master=ROOT/'recitation-master.wav'
 if not master.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(raw),'-af',f'loudnorm=I=-16:TP=-1.5:LRA=9,afade=t=out:st={offset-2}:d=2','-ar','48000','-ac','2','-c:a','pcm_s24le',str(master)])
 save('timeline',{'seconds':offset,'scenes':scenes,'verseUnits':183,'nytDhyanaUnits':5,'ctaAfterPrayer':True,'unapprovedAcousticUploadsPerformed':False,'phoneticHumanApprovalClaimed':False})
 print(json.dumps({'stage':'assembled','scenes':len(scenes),'seconds':offset}),flush=True)

def captions():
 t=load('timeline');pages=[];eventsCount=0
 for scene in t['scenes']:
  longest=max(scene['words'],key=lambda w:len(w['text']))['text']
  size=76
  while ImageFont.truetype('public/fonts/NotoSansTelugu.ttf',size).getlength(longest)>1600 and size>40:size-=4
  font=ImageFont.truetype('public/fonts/NotoSansTelugu.ttf',size);lines=[[]];group=[];local=[]
  def close():
   nonlocal lines,group
   if group:local.append({'scene':scene['index'],'start':group[0]['start'],'end':min(scene['end'],group[-1]['end']+.15),'lines':lines,'words':group,'fontSize':size})
   lines=[[]];group=[]
  for w in scene['words']:
   if lines[-1] and (font.getlength(' '.join(v['text'] for v in lines[-1]+[w]))>1600 or len(lines[-1])>=5):
    if len(lines)==2:close()
    else:lines.append([])
   lines[-1].append(w);group.append(w)
   if len(group)>=8:close()
  close();pages.extend(local)
  events=[]
  for i,p in enumerate(local):
   if i+1<len(local):p['end']=min(p['end'],local[i+1]['start'])
   bounds=sorted(set([p['start'],p['end']]+[w['start'] for w in p['words']]))
   for a,b in zip(bounds,bounds[1:]):
    if round(b*100)<=round(a*100):continue
    active=next(w for w in reversed(p['words']) if w['start']<=(a+b)/2)
    text='\\N'.join(' '.join(('{\\c&H004AD5FF&}'+w['text']+'{\\c&H00FFFFFF&}') if w==active else w['text'] for w in line) for line in p['lines'])
    events.append(f'Dialogue: 0,{stamp(a-scene["start"])},{stamp(b-scene["start"])},Caption,,0,0,0,,{text}')
  header=f'''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Noto Sans Telugu,{size},&H00FFFFFF,&H00FFFFFF,&H00101010,&H95000000,0,0,0,0,100,100,0,0,3,2,0,2,130,130,90,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
  (ROOT/f'captions-{scene["index"]:03}.ass').write_text(header+'\n'.join(events)+'\n',encoding='utf-8');eventsCount+=len(events)
 save('captions',{'pages':pages,'wordHighlight':True,'leftTopTextRemoved':True,'events':eventsCount,'sanskritCompoundsNotSplitIntoGuessedWords':True,'repairTimingSource':'already-returned provider timestamps; separate acoustic check not performed'})
 print(json.dumps({'stage':'captions','pages':len(pages),'highlightEvents':eventsCount}),flush=True)

def render():
 t=load('timeline');(ROOT/'video-pieces').mkdir(exist_ok=True);concat=[]
 for s in t['scenes']:
  seconds=s['end']-s['start'];frames=round(seconds*FPS);clip=ROOT/'video-pieces'/f'{s["index"]:03}.mp4'
  if not clip.exists():
   z="min(1.025,1+on*0.000025)" if s['index']%2==0 else "max(1,1.025-on*0.000025)"
   vf=f"scale=2200:1238:force_original_aspect_ratio=increase,crop=2200:1238,zoompan=z='{z}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d={frames}:s=1920x1080:fps=24,setsar=1,ass=filename='{ROOT.as_posix()}/captions-{s['index']:03}.ass':fontsdir='public/fonts':shaping=complex,format=yuv420p"
   run(['ffmpeg','-hide_banner','-v','error','-nostdin','-n','-i',s['image'],'-vf',vf,'-frames:v',str(frames),'-an','-c:v','libx264','-threads','2','-filter_threads','1','-preset','veryfast','-crf','22','-pix_fmt','yuv420p','-video_track_timescale','24000',str(clip)])
  concat.append(f"file 'video-pieces/{s['index']:03}.mp4'\nduration {seconds:.9f}")
  if s['index']%10==0 or s['index']==len(t['scenes'])-1:print(json.dumps({'stage':'render','scene':s['index']+1,'total':len(t['scenes'])}),flush=True)
 (ROOT/'video-concat.txt').write_text('\n'.join(concat)+'\n',encoding='utf-8')
 final=ROOT/'Lalita-Video-02-Complete-Recitation-Telugu-Script.mp4'
 if not final.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'video-concat.txt'),'-i',str(ROOT/'recitation-master.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-t',str(t['seconds']),'-movflags','+faststart',str(final)])
 print(json.dumps({'stage':'complete','file':str(final),'seconds':t['seconds']}),flush=True)

def verify():
 t=load('timeline');file=ROOT/'Lalita-Video-02-Complete-Recitation-Telugu-Script.mp4';info=probe(file);v=next(s for s in info['streams'] if s['codec_type']=='video');assert(v['width'],v['height'])==(1920,1080);assert abs(float(info['format']['duration'])-t['seconds'])<.1
 run(['ffmpeg','-v','error','-nostdin','-i',str(file),'-f','null','-'])
 for name,seconds in [('nyasa',5),('dhyana',t['scenes'][1]['start']+5),('stotram',t['scenes'][5]['start']+5),('middle',t['seconds']/2),('ending',t['seconds']-12)]:
  target=ROOT/f'review-{name}.png'
  if not target.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(seconds),'-i',str(file),'-frames:v','1',str(target)])
 labels=[('nyasa','న్యాసం'),('dhyana-1','ధ్యాన శ్లోకాలు'),('stotram-001','వెయ్యి నామాల స్తోత్రం')]+[(f'stotram-{i:03}',f'శ్లోకం {i}') for i in [25,50,75,100,125,150,175]]+[('stotram-183-half-and-closing','ముగింపు ప్రార్థన'),('closing-cta','ముగింపు సందేశం')]
 chapters=[]
 for key,label in labels:
  s=next(x for x in t['scenes'] if x['name']==key);seconds=0 if not chapters else int(s['start']);chapters.append(f'{seconds//60:02}:{seconds%60:02} {label}')
 (ROOT/'chapters.txt').write_text('\n'.join(chapters)+'\n',encoding='utf-8')
 save('verification',{'file':file.name,'seconds':float(info['format']['duration']),'resolution':'1920x1080','fullDecodePassed':True,'all182AndFinalHalfVersePresent':True,'nyasaAndFourDhyanaPresent':True,'wordHighlight':True,'leftTopTextRemoved':True,'separatePhalashrutiIncluded':False,'repairsUseExistingProviderWordTiming':True,'extraAcousticRepairUploadPerformed':False,'competentReciterReviewCompleted':False,'fullHumanListeningReviewCompleted':False,'published':False})
 print(json.dumps(load('verification')),flush=True)

if __name__=='__main__':{'assemble':assemble,'captions':captions,'render':render,'verify':verify}[sys.argv[1]]()
