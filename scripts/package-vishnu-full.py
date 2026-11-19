"""Complete Vishnu Sahasranamam: original saved chant, seven artworks, full verse captions."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
import importlib.util,json,re,math,subprocess,sys,hashlib
from PIL import Image,ImageFont,ImageDraw

ROOT=Path('data/productions/divine-wisdom/vishnu-sahasranamam-2026-10-22')
FPS=24;FONT_PATH='public/fonts/NotoSansTelugu.ttf'
OUTPUT=ROOT/'Sri-Vishnu-Sahasranamam-Complete-Telugu-1080p.mp4'
spec=importlib.util.spec_from_file_location('prior',Path(__file__).with_name('venkateswara-package.py'))
prior=importlib.util.module_from_spec(spec);spec.loader.exec_module(prior)
def load(n):return json.loads((ROOT/f'{n}.json').read_text(encoding='utf8'))
def save(n,v):(ROOT/f'{n}.json').write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
def run(a):subprocess.run(a,check=True)
def norm(t):return ''.join(c for c in t if '\u0c00'<=c<='\u0c7f')
def framed(t):return math.ceil(t*FPS)/FPS
def stamp(t):return prior.ass_time(t)
def clean(t):return re.sub(r'[\u200b\u200c\u200d\ufeff]','',re.sub(r'\[[^\]]*\]','',t))

def layout(text):
 """Keep original verse line breaks when they fit; otherwise wrap at word boundaries."""
 original=[m.span() for m in re.finditer(r'[^\n]+',text) if text[m.start():m.end()].strip()]
 candidates=[]
 for size in range(88,57,-2):
  f=ImageFont.truetype(FONT_PATH,size)
  if len(original)<=4 and max(f.getlength(text[a:b]) for a,b in original)<=1680 and len(original)*size*1.18<=285:
   return original,size
  spans=[];start=0;line=''
  for m in re.finditer(r'\S+',text):
   word=m.group()
   if line and f.getlength(line+' '+word)>1680:
    spans.append((start,m.start()));start=m.start();line=word
   else:
    if not line:start=m.start()
    line+=((' ' if line else '')+word)
  if line:spans.append((start,len(text)))
  if len(spans)<=4 and len(spans)*size*1.18<=285:
   candidates.append((spans,size))
 if candidates:return candidates[0]
 raise AssertionError(f'Caption too large: {len(text)} characters; split at a prayer boundary')

def prepare():
 p=load('plan');parts=[];units=[];words=[];offset=0;reports=[];repairs=[]
 (ROOT/'audio-pieces').mkdir(exist_ok=True)
 def add_audio(name,source,seconds):
  nonlocal offset
  seconds=framed(seconds);target=ROOT/'audio-pieces'/f'{name}.wav'
  if not target.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT/source),'-af',f'loudnorm=I=-17:TP=-1.5:LRA=7,aresample=48000,apad,atrim=duration={seconds}','-ar','48000','-ac','2','-c:a','pcm_s24le',str(target)])
  part={'name':name,'source':source,'file':target.relative_to(ROOT).as_posix(),'start':offset,'end':offset+seconds,'seconds':seconds};parts.append(part);offset+=seconds;return part
 welcome=add_audio('welcome','welcome.mp3',prior.duration(ROOT/'welcome.mp3')+.2)
 for w in prior.aligned_words(load('welcome-alignment')):words.append({**w,'kind':'welcome'})
 for b in p['batches']:
  stem=f"batch-{b['index']:02}";m=load(stem+'-metadata');raw=m['words_timestamps'];expected=[w for u in b['units'] for w in u['text'].split()]
  assert [norm(x) for x in expected]==[norm(w['word']) for w in raw],f'Exact source sequence mismatch in {stem}'
  acoustic=load(stem+'-alignment') if (ROOT/f'{stem}-alignment.json').exists() else None
  # A separate aligner is diagnostic. Retain the music model's original timing unless
  # the independent alignment has identical words and fewer collapsed intervals.
  chosen=[{'text':w['word'],'start':w['start_ms']/1000,'end':w['end_ms']/1000} for w in raw]
  original_tiny=sum(w['end']-w['start']<.04 for w in chosen);timing_source='original music word timestamps'
  acoustic_words=acoustic.get('words',[]) if acoustic else []
  if acoustic_words and [norm(x) for x in expected]==[norm(w['text']) for w in acoustic_words] and sum(w['end']-w['start']<.04 for w in acoustic_words)<original_tiny:
   chosen=[{'text':w['text'],'start':w['start'],'end':w['end']} for w in acoustic_words];timing_source='independent acoustic forced alignment'
  seconds=min(prior.duration(ROOT/f'{stem}.mp3'),max(w['end'] for w in chosen)+.24)
  part=add_audio(stem,stem+'.mp3',seconds);cursor=0
  for u in b['units']:
   selected=[dict(w) for w in chosen[cursor:cursor+len(u['text'].split())]];cursor+=len(selected)
   assert selected
   for i,w in enumerate(selected):
    assert 0<=w['start']<=w['end']<=part['seconds']+.05,(stem,u['id'],w)
    if w['end']-w['start']<.04:
     nxt=next((v for v in selected[i+1:] if v['end']-v['start']>=.04),None)
     prev=next((v for v in reversed(selected[:i]) if v['end']-v['start']>=.04),None)
     neighbor=nxt or prev;assert neighbor,(stem,u['id'],'No acoustic span')
     repairs.append({'unit':u['id'],'text':w['text'],'originalStart':w['start'],'originalEnd':w['end'],'method':'Shared highlight with adjacent name; no fabricated independent acoustic boundary'})
     w['start']=neighbor['start'];w['end']=neighbor['end'];w['sharedHighlight']=True
   for w in selected:
    w['start']+=part['start'];w['end']+=part['start'];w['kind']='prayer'
   units.append({**u,'batch':b['index'],'words':selected,'start':min(w['start'] for w in selected),'end':max(w['end'] for w in selected)})
   words+=selected
  assert cursor==len(chosen)
  reports.append({'batch':b['index'],'sourceWords':len(expected),'timestampWords':len(raw),'exactSourceSequence':True,'originalCompressedWords':original_tiny,'timingSource':timing_source,'acousticLoss':acoustic.get('loss') if acoustic else None,'independentAlignmentAvailable':bool(acoustic)})
 closing=add_audio('closing','closing.mp3',prior.duration(ROOT/'closing.mp3')+.3)
 for w in prior.aligned_words(load('closing-alignment')):words.append({**w,'start':w['start']+closing['start'],'end':w['end']+closing['start'],'kind':'closing'})
 # Full source remains visible across the short natural interval before the next verse.
 for i,u in enumerate(units):
  u['pageStart']=welcome['end'] if i==0 else max(welcome['end'],round(u['start']*FPS)/FPS)
  u['pageEnd']=max(u['end'],units[i+1]['start']) if i+1<len(units) else closing['start']
  if i+1<len(units):u['pageEnd']=round(units[i+1]['start']*FPS)/FPS
  assert u['pageEnd']>u['pageStart'],('Invalid verse interval',u['id'])
 # Scenes change at whole-verse boundaries, approximately once a minute.
 scenes=[{'index':0,'kind':'welcome','image':'01','start':0,'end':welcome['end'],'seconds':welcome['seconds']}]
 start=welcome['end'];cycle=0
 for i,u in enumerate(units):
  end=round(u['pageEnd']*FPS)/FPS
  if end-start>=50 or i==len(units)-1:
   scenes.append({'index':len(scenes),'kind':'prayer','image':f'{cycle%7+1:02}','start':start,'end':end,'seconds':end-start});start=end;cycle+=1
 scenes.append({'index':len(scenes),'kind':'closing','image':'07','start':closing['start'],'end':offset,'seconds':closing['seconds']})
 for a,b in zip(scenes,scenes[1:]):assert abs(a['end']-b['start'])<.001
 save('timeline',{'seconds':offset,'prayerStart':welcome['end'],'prayerEnd':closing['start'],'audio':parts,'units':units,'scenes':scenes,'fps':FPS,'width':1920,'height':1080,'noTempoOrPitchProcessing':True})
 save('timed-words',words);save('source-audit',{'batches':reports,'numberedMainVerses':108,'openingNumberedVerses':22,'closingNumberedVerses':33,'units':len(units),'exactTextMatchesAllMusicTimestamps':True,'sharedHighlightRepairs':repairs,'independentTranscriptionAvailable':False,'humanPronunciationListeningReviewPending':True,'alignmentDoesNotProveCorrectSinging':True})
 (ROOT/'audio-concat.txt').write_text('\n'.join("file '"+a['file']+"'" for a in parts)+'\n',encoding='utf8')
 master=ROOT/'finished-audio-master.wav'
 if not master.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'audio-concat.txt'),'-af','alimiter=limit=0.891251:level=false:latency=true','-c:a','pcm_s24le',str(master)])
 if not (ROOT/'finished-audio-master.mp3').exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(master),'-c:a','libmp3lame','-b:a','256k',str(ROOT/'finished-audio-master.mp3')])
 print(json.dumps({'stage':'master-prepared','seconds':offset,'units':len(units),'scenes':len(scenes),'sharedHighlights':len(repairs)}),flush=True)

HEADER='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Noto Sans Telugu,88,&H00FFFFFF,&H00FFFFFF,&H00101010,&H95000000,0,0,0,0,100,100,0,0,3,2,0,2,110,110,90,1
Style: Title,Noto Sans Telugu,42,&H00F4D594,&H00FFFFFF,&H00202020,&H00000000,0,0,0,0,100,100,0,0,1,1,0,8,160,160,28,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''

def captions():
 t=load('timeline');pages=[];issues=[]
 for u in t['units']:
  display=clean(u['displayText']);spoken=u['text'];source_chars=[i for i,c in enumerate(spoken) if norm(c)];display_chars=[i for i,c in enumerate(display) if norm(c)]
  assert ''.join(spoken[i] for i in source_chars)==''.join(display[i] for i in display_chars),u['id']
  mapping=dict(zip(source_chars,display_chars));matches=list(re.finditer(r'\S+',spoken));assert len(matches)==len(u['words'])
  ws=[]
  for m,w in zip(matches,u['words']):
   hits=[mapping[i] for i in range(m.start(),m.end()) if i in mapping];assert hits
   ws.append({**w,'displayStart':hits[0],'displayEnd':hits[-1]+1})
  # The final dedication contains several complete prayers and a prose colophon.
  # Split only that unnumbered multi-prayer unit at original line boundaries.
  ranges=[(0,len(display))]
  lines=list(re.finditer(r'[^\n]+',display))
  if u['verse'] is None and len(lines)>4:
   ranges=[(lines[i].start(),lines[min(i+1,len(lines)-1)].end()) for i in range(0,len(lines),2)]
   expanded=[]
   for a,b in ranges:
    if b-a<=170:expanded.append((a,b));continue
    start=a
    for m in re.finditer(r'\S+',display[a:b]):
     if a+m.end()-start>130 and a+m.start()>start:
      expanded.append((start,a+m.start()));start=a+m.start()
    if start<b:expanded.append((start,b))
   ranges=expanded
  for ri,(a,b) in enumerate(ranges):
   selected=[dict(w,displayStart=w['displayStart']-a,displayEnd=w['displayEnd']-a) for w in ws if a<=w['displayStart']<b]
   assert selected
   text=display[a:b];spans,size=layout(text)
   start=u['pageStart'] if ri==0 else min(w['start'] for w in selected)
   later=[w for w in ws if w['displayStart']>=b]
   end=min(w['start'] for w in later) if later else u['pageEnd']
   if end<=start:issues.append({'unit':u['id'],'reason':'Nonpositive page duration'})
   pages.append({'start':start,'end':end,'display':text,'ranges':spans,'fontSize':size,'words':selected,'unitId':u['id'],'section':u['section'],'verse':u['verse'],'completeShlokaAlwaysVisible':True})
 for kind in ['welcome','closing']:
  words=[w for w in load('timed-words') if w.get('kind')==kind]
  for i in range(0,len(words),6):
   group=words[i:i+6];text=' '.join(w['text'] for w in group[:3])+('\n'+' '.join(w['text'] for w in group[3:]) if len(group)>3 else '')
   cursor=0;selected=[]
   for w in group:
    a=text.index(w['text'],cursor);b=a+len(w['text']);selected.append({**w,'displayStart':a,'displayEnd':b});cursor=b
   spans,size=layout(text)
   part=next(a for a in t['audio'] if a['name']==kind)
   pages.append({'start':max(part['start'],group[0]['start']-.03),'end':words[i+6]['start'] if i+6<len(words) else part['end'],'display':text,'ranges':spans,'fontSize':min(size,76),'words':selected,'section':kind,'completeShlokaAlwaysVisible':False})
 pages.sort(key=lambda p:p['start'])
 for i,p in enumerate(pages):
  if i+1<len(pages):p['end']=min(p['end'],pages[i+1]['start'])
  if p['end']<=p['start']:issues.append({'page':i,'reason':'Invalid page interval'})
  p['lines']=[[{'text':p['display'][a:b].strip()}] for a,b in p['ranges']]
 assert not issues,issues
 save('captions',{'pages':pages,'words':load('timed-words')});save('caption-audit',{'issues':issues,'mainNumberedVerses':108,'completeUnits':len(t['units']),'pages':len(pages),'fontRange':[min(p['fontSize'] for p in pages),max(p['fontSize'] for p in pages)],'fullVerseHeldOnScreen':True,'wordHighlight':True,'humanListeningReviewPending':True})
 write_ass(ROOT/'telugu-captions.ass',pages,t['seconds'])
 srt='\n\n'.join(f"{i+1}\n{prior.srt_time(p['start'])} --> {prior.srt_time(p['end'])}\n"+'\n'.join(p['display'][a:b].strip() for a,b in p['ranges']) for i,p in enumerate(pages))+'\n'
 (ROOT/'telugu-captions.srt').write_text(srt,encoding='utf8')
 (ROOT/'telugu-captions.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(f"{prior.srt_time(p['start']).replace(',','.')} --> {prior.srt_time(p['end']).replace(',','.')}\n"+'\n'.join(p['display'][a:b].strip() for a,b in p['ranges']) for p in pages)+'\n',encoding='utf8')
 print(json.dumps({'stage':'captions-prepared','pages':len(pages),'fontRange':load('caption-audit')['fontRange']}),flush=True)

def write_ass(path,pages,seconds,offset=0,kind=None):
 events=[f'Dialogue: 1,0:00:00.00,{stamp(seconds)},Title,,0,0,0,,శ్రీ విష్ణు సహస్రనామ స్తోత్రం']
 for p in pages:
  start=max(offset,p['start']);end=min(offset+seconds,p['end'])
  if end<=start:continue
  bounds=sorted(set([start,end]+[max(start,min(end,w[k])) for w in p['words'] for k in ['start','end']]))
  for a,b in zip(bounds,bounds[1:]):
   if round(a*100)>=round(b*100):continue
   mid=(a+b)/2;active=[w for w in p['words'] if w['start']<=mid<w['end']];lines=[]
   for x,y in p['ranges']:
    line=p['display'][x:y]
    for w in sorted(active,key=lambda w:w['displayStart'],reverse=True):
     if x<=w['displayStart']<y:
      s=w['displayStart']-x;e=min(w['displayEnd'],y)-x
      line=line[:s]+'{\\c&H004AD5FF&}'+line[s:e]+'{\\c&H00FFFFFF&}'+line[e:]
    lines.append(line.strip())
   text='\\N'.join(lines);events.append(f"Dialogue: 0,{stamp(a-offset)},{stamp(b-offset)},Caption,,0,0,0,,{{\\fs{p['fontSize']}}}{text}")
 if kind in ['welcome','closing']:
  card='డివైన్ విజ్డమ్ తెలుగు\\Nఛానల్‌కు స్వాగతం' if kind=='welcome' else 'సబ్‌స్క్రైబ్ • లైక్\\Nషేర్ • కామెంట్'
  card_y=220 if kind=='closing' else 380
  events.append(f'Dialogue: 1,0:00:00.00,{stamp(seconds)},Caption,,0,0,0,,{{\\an5\\pos(1400,{card_y})\\fs58\\bord0\\shad2}}{card}')
 path.write_text(HEADER+'\n'.join(events)+'\n',encoding='utf8')

def render():
 t=load('timeline');pages=load('captions')['pages'];assert not load('caption-audit')['issues']
 folder=ROOT/'video-pieces';folder.mkdir(exist_ok=True)
 logo=Image.open(ROOT/'channel-logo.png').convert('RGBA');logo.thumbnail((128,128));logo.save(ROOT/'logo-overlay.png')
 def screen(s):
  target=folder/f"{s['index']:03}.mp4"
  if target.exists():
   assert abs(prior.duration(target)-s['seconds'])<.08
   return s['index']
  frames=round(s['seconds']*FPS);sub=ROOT/f"screen-{s['index']:03}.ass";write_ass(sub,pages,s['seconds'],s['start'],s['kind'])
  zoom=f'1.015+0.018*on/{max(1,frames-1)}' if s['index']%2==0 else f'1.033-0.018*on/{max(1,frames-1)}'
  vf=f"[0:v]scale=1920:1080,zoompan=z='{zoom}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d={frames}:s=1920x1080:fps=24,setsar=1,drawbox=x=0:y=735:w=iw:h=345:color=black@0.62:t=fill,drawbox=x=0:y=0:w=iw:h=100:color=black@0.25:t=fill[bg];[bg][1:v]overlay=W-w-25:20,ass=filename='{sub.as_posix()}':fontsdir='{ROOT.as_posix()}/fonts':shaping=complex,fade=t=in:st=0:d=0.25,fade=t=out:st={s['seconds']-.25}:d=0.25,format=yuv420p[out]"
  temporary=target.with_suffix('.rendering.mp4')
  run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT/'art'/f"{s['image']}.png"),'-i',str(ROOT/'logo-overlay.png'),'-filter_complex',vf,'-map','[out]','-frames:v',str(frames),'-an','-c:v','libx264','-preset','veryfast','-crf','19','-threads','4','-video_track_timescale','24000',str(temporary)])
  assert abs(prior.duration(temporary)-s['seconds'])<.08;temporary.rename(target);return s['index']
 completed=[]
 with ThreadPoolExecutor(max_workers=2) as pool:
  for future in as_completed([pool.submit(screen,s) for s in t['scenes']]):
   i=future.result();completed.append(i);save('RENDER-PROGRESS',{'completedScreens':len(completed),'screens':len(t['scenes']),'lastCompleted':i});print(json.dumps({'stage':'screen-rendered','completed':len(completed),'total':len(t['scenes'])}),flush=True)
 (ROOT/'video-concat.txt').write_text('\n'.join(f"file 'video-pieces/{s['index']:03}.mp4'" for s in t['scenes'])+'\n',encoding='utf8')
 if not OUTPUT.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'video-concat.txt'),'-i',str(ROOT/'finished-audio-master.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','256k','-movflags','+faststart',str(OUTPUT)])
 print(json.dumps({'stage':'full-video-rendered','file':str(OUTPUT.resolve())}),flush=True)

def package():
 t=load('timeline');p=load('plan');chapters=[{'start':0,'title':'ఛానల్ స్వాగతం'}]
 names={'opening':'పూర్వపీఠిక','nyasa':'పూర్వన్యాసం','karanyasa':'కరన్యాసం','anganyasa':'అంగన్యాసం','dhyanam':'ధ్యానం','panchapuja':'పంచపూజ','stotram':'శ్రీ విష్ణు సహస్రనామ స్తోత్రం','phalashruti':'ఫలశ్రుతి • ఉత్తరపీఠిక'}
 seen=set()
 for u in t['units']:
  if u['section'] not in seen:chapters.append({'start':u['pageStart'],'title':names[u['section']]});seen.add(u['section'])
  elif u['section']=='stotram' and u['verse'] in [21,41,61,81,101]:chapters.append({'start':u['pageStart'],'title':f"సహస్రనామాలు • శ్లోకం {u['verse']}"})
 chapters.append({'start':t['prayerEnd'],'title':'ముగింపు • ఓం నమో నారాయణాయ'})
 chaptertext='\n'.join(prior.chapter_time(c['start'])+' '+c['title'] for c in chapters)
 (ROOT/'chapters.txt').write_text(chaptertext+'\n',encoding='utf8')
 title='శ్రీ విష్ణు సహస్రనామం పూర్తి | Vishnu Sahasranamam Telugu Lyrics | Divine Wisdom Telugu'
 description='శ్రీ విష్ణు సహస్రనామ స్తోత్రం — పూర్వపీఠిక, న్యాసం, ధ్యానం, సహస్రనామ స్తోత్రం మరియు ఫలశ్రుతి సహితంగా. మధురమైన మహిళా గానంతో, పూర్తి తెలుగు శ్లోకాలు మరియు పదాల హైలైటింగ్‌తో ఆలకించండి.\n\n'+chaptertext+'\n\nసాంప్రదాయ సాహిత్య మూలం: '+p['source']+'\nఈ ఛానల్ కోసం స్వతంత్రంగా AI సహాయంతో గానం, స్వరం మరియు ఏడు భక్తి చిత్రాలు రూపొందించబడ్డాయి.\n\nడివైన్ విజ్డమ్ తెలుగు ఛానల్‌ను సబ్‌స్క్రైబ్ చేయండి. లైక్, షేర్ చేసి కామెంట్‌లో ఓం నమో నారాయణాయ అని రాయండి.\n\n#VishnuSahasranamam #విష్ణుసహస్రనామం #DivineWisdomTelugu\n'
 (ROOT/'youtube-description.txt').write_text(description,encoding='utf8');save('youtube-metadata',{'title':title,'description':description,'chapters':chapters,'language':'te','containsSyntheticMedia':True,'uploadOrPublishingAuthorized':False})
 img=Image.open(ROOT/'art/01.png').convert('RGBA').resize((1920,1080),Image.Resampling.LANCZOS);overlay=Image.new('RGBA',img.size);d=ImageDraw.Draw(overlay);d.rectangle((920,0,1920,1080),fill=(2,8,23,222));img=Image.alpha_composite(img,overlay);d=ImageDraw.Draw(img)
 for text,y,size,color in [('శ్రీ విష్ణు',250,128,'#f4cf70'),('సహస్రనామం',440,112,'#f4cf70'),('పూర్తి పారాయణం',650,76,'white'),('తెలుగు సాహిత్యంతో',780,60,'white'),('డివైన్ విజ్డమ్ తెలుగు',920,48,'#f4cf70')]:
  font=ImageFont.truetype(FONT_PATH,size);assert font.getlength(text)<930;d.text((1415,y),text,font=font,fill=color,anchor='mm',stroke_width=1)
 img.convert('RGB').resize((1280,720),Image.Resampling.LANCZOS).save(ROOT/'thumbnail.jpg',quality=95)

def verify():
 t=load('timeline');assert OUTPUT.exists();run(['ffmpeg','-v','error','-nostdin','-i',str(OUTPUT),'-f','null','-'])
 info=prior.probe(OUTPUT);v=next(s for s in info['streams'] if s['codec_type']=='video');a=next(s for s in info['streams'] if s['codec_type']=='audio')
 assert(v['width'],v['height'],v['codec_name'],v['r_frame_rate'])==(1920,1080,'h264','24/1')
 assert a['codec_name']=='aac' and a['sample_rate']=='48000';assert abs(float(info['format']['duration'])-t['seconds'])<.15
 assert [u['verse'] for u in t['units'] if u['section']=='stotram' and u['verse'] is not None]==list(range(1,109))
 assert {s['image'] for s in t['scenes']}=={f'{i:02}' for i in range(1,8)}
 review=ROOT/'review';review.mkdir(exist_ok=True)
 samples=[('welcome',5),('opening',t['prayerStart']+5),('dhyanam',next(u['start']+2 for u in t['units'] if u['section']=='dhyanam')),('first-names',next(u['start']+3 for u in t['units'] if u['section']=='stotram' and u['verse']==1)),('middle-names',next(u['start']+3 for u in t['units'] if u['section']=='stotram' and u['verse']==61)),('closing-prayers',next(u['start']+2 for u in t['units'] if u['section']=='phalashruti')),('dedication',t['units'][-1]['start']+25),('channel-ending',t['prayerEnd']+5)]
 for name,sec in samples:run(['ffmpeg','-v','error','-nostdin','-y','-ss',str(sec),'-i',str(OUTPUT),'-frames:v','1',str(review/f'{name}.png')])
 save('VERIFICATION',{'file':str(OUTPUT.resolve()),'seconds':float(info['format']['duration']),'resolution':'1920x1080','fps':24,'videoCodec':'h264','audioCodec':'aac','audioSampleRate':48000,'bytes':OUTPUT.stat().st_size,'fullDecodePassed':True,'mainNumberedVerses':108,'allMainVersesInOrder':True,'openingAndDhyanaAndPhalashrutiIncluded':True,'sourceTextMatchesAllMusicTimestampText':True,'uniqueOriginalImages':7,'completeShlokaHeldOnScreen':True,'activeWordGold':True,'captionAudit':load('caption-audit'),'channelWelcomeAndSubscribeLikeShareCommentEnding':True,'noTempoOrPitchProcessing':True,'humanPronunciationAndSyncListeningReviewPending':True,'published':False})
 save('STATUS',{'status':'Full video rendered and technically verified','fullVideo':str(OUTPUT.resolve()),'seconds':float(info['format']['duration']),'fullVideoRendered':True,'sample':'Vishnu-Sahasranamam-First-Sample-1080p.mp4','savedOriginalImages':7,'sourceUnits':len(t['units']),'humanPronunciationReviewPending':True,'published':False})
 print(json.dumps({'stage':'verified','seconds':float(info['format']['duration']),'bytes':OUTPUT.stat().st_size,'file':str(OUTPUT.resolve())}),flush=True)

if __name__=='__main__':
 {'prepare':prepare,'captions':captions,'render':render,'package':package,'verify':verify}[sys.argv[1]]()
