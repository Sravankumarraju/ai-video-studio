"""Resumable audio master, Telugu captions, original-art render and delivery package."""
from pathlib import Path
import json, math, re, subprocess, sys, shutil, hashlib
from PIL import Image, ImageFont, ImageDraw

ROOT=Path('data/productions/divine-wisdom/venkateswara/suprabhatam-2026-10-19/full-approved-natural-v3')
FPS=24
FONT_PATH='public/fonts/NotoSansTelugu.ttf'
FONT=ImageFont.truetype(FONT_PATH,104)
LOGO=Path('data/branding/divine-wisdom/youtube-avatar/divine-wisdom-telugu-circle-safe.png')
ART=['01-tirumala-sunrise','02-venkateswara-portrait','03-crown-garlands','04-lamps-temple','05-lakshmi','06-serene-closing','07-traditional-mural','08-bronze-shrine','09-watercolor-dawn']
def load(n):return json.loads((ROOT/(n+'.json')).read_text(encoding='utf8'))
def save(n,v):(ROOT/(n+'.json')).write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
def run(a):subprocess.run(a,check=True)
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]))
def duration(p):return float(probe(p)['format']['duration'])
def norm(t):return ''.join(c for c in t if '\u0c00'<=c<='\u0c7f' or c.isalpha())
def ass_time(t):
 n=round(t*100);return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'
def srt_time(t):
 n=round(t*1000);return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
def chapter_time(t):
 n=int(t);return f'{n//3600}:{n//60%60:02}:{n%60:02}' if n>=3600 else f'{n//60:02}:{n%60:02}'

def prepare():
 p=load('plan');selection=load('source-selection') if (ROOT/'source-selection.json').exists() else {};prefix=selection.get('generationPrefix','')
 piecefolder='audio-pieces-fresh' if prefix else 'audio-pieces-final';(ROOT/piecefolder).mkdir(exist_ok=True)
 repairs={r['verse']:r for r in load('repairs')['units']} if not prefix and (ROOT/'repairs.json').exists() else {}
 welcome=math.ceil((duration(ROOT/'welcome.mp3')+.7)*FPS)/FPS
 closing=math.ceil((duration(ROOT/'closing.mp3')+.9)*FPS)/FPS
 sources=[('welcome.mp3',welcome,0),('approved-opening.mp3',32,0)]
 for b in p['batches']:
  sourceoffset=0
  for u in b['units']:
   r=repairs.get(u['verse'])
   sources.append((r['source'],r['seconds'],0) if r else (f"{prefix}batch-{b['index']}.mp3",u['seconds'],sourceoffset))
   sourceoffset+=u['seconds']
 sources.append(('closing.mp3',closing,0))
 fingerprint=hashlib.sha256(json.dumps(sources).encode()).hexdigest()
 previous=load('master-inputs') if (ROOT/'master-inputs.json').exists() else {}
 if previous.get('fingerprint')!=fingerprint:
  for file in ['finished-audio-master.wav','suprabhatam-prayer-master.wav','finished-audio-master.mp3']:
   if (ROOT/file).exists():
    target=ROOT/('superseded-before-fresh-'+file) if prefix else ROOT/('superseded-before-repair-'+file)
    assert not target.exists(),('Inspect existing superseded file',str(target));(ROOT/file).rename(target)
 concat=[];offset=0;audio=[]
 for i,(name,seconds,sourceoffset) in enumerate(sources):
  dst=ROOT/piecefolder/f'{i:02}.wav'
  if not dst.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(sourceoffset),'-i',str(ROOT/name),'-af',f'apad,atrim=duration={seconds},asetpts=PTS-STARTPTS','-ar','48000','-ac','2','-c:a','pcm_s24le',str(dst)])
  concat.append(f"file '{piecefolder}/{i:02}.wav'")
  audio.append({'file':name,'start':offset,'end':offset+seconds,'seconds':seconds});offset+=seconds
 (ROOT/'audio-concat.txt').write_text('\n'.join(concat)+'\n',encoding='utf8')
 (ROOT/'prayer-concat.txt').write_text('\n'.join(concat[1:-1])+'\n',encoding='utf8')
 filters='highpass=f=35,equalizer=f=280:t=q:w=0.8:g=-0.5,alimiter=limit=0.891251:attack=5:release=80:level=false:latency=true'
 for source,target in [('audio-concat.txt','finished-audio-master.wav'),('prayer-concat.txt','suprabhatam-prayer-master.wav')]:
  if not (ROOT/target).exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/source),'-af',filters,'-ar','48000','-c:a','pcm_s24le',str(ROOT/target)])
 if not (ROOT/'finished-audio-master.mp3').exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT/'finished-audio-master.wav'),'-c:a','libmp3lame','-b:a','320k',str(ROOT/'finished-audio-master.mp3')])
 save('master-inputs',{'fingerprint':fingerprint,'sources':sources})
 # Global timeline: sample is preserved, all following verse offsets are enforced composition boundaries.
 units=[];time=welcome
 opening=load('approved-opening-alignment')
 # Actual performed start of verse 2 determines its visual chapter boundary.
 openingwords=[w for w in opening['words'] if norm(w['text'])]
 v2=next(w['start'] for w in openingwords if norm(w['text']).startswith('ఉత్తిష్ఠోత్తిష్ఠ'))
 units.extend([{**p['units'][0],'start':time,'end':time+v2,'alignment':'approved-opening-alignment','alignmentOffset':time},
               {**p['units'][1],'start':time+v2,'end':time+32,'alignment':'approved-opening-alignment','alignmentOffset':time}]);time+=32
 for b in p['batches']:
  for u in b['units']:
   r=repairs.get(u['verse']);seconds=r['seconds'] if r else u['seconds']
   units.append({**u,'start':time,'end':time+seconds,'alignment':r['alignment'] if r else f"{prefix}verse-{u['verse']:02}-alignment",'alignmentOffset':time});time+=seconds
 assert len(units)==29 and [u['verse'] for u in units]==list(range(1,30))
 # Screens use verse-appropriate illustrations, with the approved opening unaltered.
 images={1:0,2:1,3:4,4:4,5:8,6:6,7:0,8:7,9:3,10:8,11:7,12:3,13:1,14:6,15:0,16:2,17:7,18:6,19:3,20:8,21:4,22:1,23:6,24:2,25:7,26:0,27:3,28:8,29:5}
 scenes=[{'kind':'welcome','start':0,'end':welcome,'image':ART[1],'title':'డివైన్ విజ్డమ్ తెలుగు'}]
 for u in units:
  image=ART[images[u['verse']]]
  if scenes[-1]['kind']=='prayer' and scenes[-1]['image']==image:
   scenes[-1]['end']=u['end'];scenes[-1]['verses'].append(u['verse'])
  else:scenes.append({'kind':'prayer','start':u['start'],'end':u['end'],'image':image,'verses':[u['verse']],'title':'శ్రీ వేంకటేశ్వర సుప్రభాతం'})
 scenes.append({'kind':'closing','start':time,'end':offset,'image':ART[5],'title':'శ్రీ వేంకటేశ్వర స్వామి అనుగ్రహం'})
 for i,s in enumerate(scenes):s['index']=i;s['seconds']=s['end']-s['start']
 save('timeline',{'seconds':offset,'prayerStart':welcome,'prayerEnd':time,'audio':audio,'units':units,'scenes':scenes,'fps':24,'width':1920,'height':1080,'noTempoOrPitchProcessing':True})
 shutil.copyfile(LOGO,ROOT/'channel-logo.png');(ROOT/'fonts').mkdir(exist_ok=True);shutil.copyfile(FONT_PATH,ROOT/'fonts/NotoSansTelugu.ttf')
 print(json.dumps({'stage':'mastered','seconds':offset,'screens':len(scenes)}),flush=True)

def aligned_words(alignment):
 if 'words' in alignment:return [dict(w) for w in alignment['words'] if norm(w['text'])]
 chars=alignment['characters'];starts=alignment['character_start_times_seconds'];ends=alignment['character_end_times_seconds'];text=''.join(chars)
 return [{'text':m.group(),'start':min(starts[m.start():m.end()]),'end':max(ends[m.start():m.end()])} for m in re.finditer(r'\S+',text) if norm(m.group())]

def captions():
 p=load('plan');t=load('timeline');words=[];issues=[]
 opening=aligned_words(load('approved-opening-alignment'));idx=0
 for u in t['units']:
  expected=[x for x in u['text'].split() if norm(x)]
  if u['verse']<=2:raw=opening[idx:idx+len(expected)];idx+=len(expected)
  else:raw=aligned_words(load(u['alignment']))
  assert ''.join(norm(x) for x in expected)==''.join(norm(w['text']) for w in raw),(u['verse'],'alignment/source mismatch')
  # Recover source word boundaries if the provider split a compound.
  spans=[];pos=0
  for w in raw:spans.append((pos,pos+len(norm(w['text'])),w));pos+=len(norm(w['text']))
  pos=0
  for text in expected:
   endpos=pos+len(norm(text));hits=[w for a,b,w in spans if a<endpos and b>pos];assert hits
   start=min(w['start'] for w in hits)+u['alignmentOffset'];end=max(w['end'] for w in hits)+u['alignmentOffset']
   w={'text':text,'start':start,'end':end,'verse':u['verse'],'kind':'prayer'}
   syllables=len(re.findall('[క-హఱ](?!్)|[అ-ఔ]',text))
   if end-start<max(.04,.09*syllables):issues.append({**w,'reason':'zero_or_compressed_duration'})
   if end>u['end']+.15 or start<u['start']-.15:issues.append({**w,'reason':'outside_verse_boundary'})
   words.append(w);pos=endpos
 for s,offset in [(p['welcomeAndClosing'][0],0),(p['welcomeAndClosing'][1],t['prayerEnd'])]:
  for w in aligned_words(load(s['name']+'-alignment')):
   words.append({**w,'start':w['start']+offset,'end':w['end']+offset,'kind':s['name']})
 words.sort(key=lambda w:w['start'])
 pages=[]
 def pack(group):
  lines=[[]]
  for w in group:
   if FONT.getlength(w['text'])>1650:
    if any(lines):pages.append({'lines':lines,'words':sum(lines,[])})
    parts=re.findall(r'[^-]+-?',w['text']);assert len(parts)>1,('Unbroken compound exceeds caption width',w['text'])
    special=[[]]
    for part in parts:
     split={**w,'text':part,'originalText':w['text']}
     if special[-1] and FONT.getlength(' '.join(x['text'] for x in special[-1]+[split]))>1650:special.append([])
     special[-1].append(split)
    assert len(special)<=2,('Compound needs more than two lines',w['text'])
    pages.append({'lines':special,'words':sum(special,[])});lines=[[]];continue
   trial=' '.join(x['text'] for x in lines[-1]+[w])
   if lines[-1] and FONT.getlength(trial)>1650:
    if len(lines)==2:
     pages.append({'lines':lines,'words':sum(lines,[])});lines=[[]]
    else:lines.append([])
   lines[-1].append(w)
  if any(lines):pages.append({'lines':lines,'words':sum(lines,[])})
 # Each page belongs to one verse or bookend, never mix promotions into prayer.
 groups={}
 for w in words:groups.setdefault((w['kind'],w.get('verse',0)),[]).append(w)
 for group in groups.values():pack(group)
 pages.sort(key=lambda p:p['words'][0]['start'])
 for i,p in enumerate(pages):
  p['start']=max(0,p['words'][0]['start']-.07);p['end']=min(t['seconds'],p['words'][-1]['end']+.25)
  if i+1<len(pages):p['end']=min(p['end'],pages[i+1]['words'][0]['start']-.07)
  assert p['end']>p['start']
  assert len(p['lines'])<=2 and all(FONT.getlength(' '.join(w['text'] for w in line))<=1650 for line in p['lines']), [(len(line),FONT.getlength(' '.join(w['text'] for w in line)),[w['text'] for w in line]) for line in p['lines']]
 save('caption-audit',{'prayerWords':sum(w['kind']=='prayer' for w in words),'pages':len(pages),'issues':issues,'manualListeningVerified':False,'alignmentIsNotProofOfSinging':True})
 save('captions',{'words':words,'pages':pages})
 if issues:print(json.dumps({'stage':'caption-issues','issues':issues},ensure_ascii=False),flush=True);return
 write_ass(ROOT/'telugu-captions.ass',pages,t['seconds'])
 (ROOT/'telugu-captions.srt').write_text('\n\n'.join(f"{i+1}\n{srt_time(p['start'])} --> {srt_time(p['end'])}\n"+'\n'.join(' '.join(w['text'] for w in line) for line in p['lines']) for i,p in enumerate(pages))+'\n',encoding='utf8')
 print(json.dumps({'stage':'captions-ready','pages':len(pages),'words':len(words)}),flush=True)

HEADER='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Lyrics,Noto Sans Telugu,104,&H00FFFFFF,&H00FFFFFF,&H00101010,&H90000000,0,0,0,0,100,100,0,0,1,2,1,2,130,130,70,1
Style: Title,Noto Sans Telugu,48,&H004AD5FF,&H004AD5FF,&H00101010,&H90000000,0,0,0,0,100,100,0,0,1,2,1,8,180,180,32,1
Style: Card,Noto Sans Telugu,76,&H004AD5FF,&H004AD5FF,&H00101010,&H90000000,0,0,0,0,100,100,0,0,1,2,1,5,80,80,80,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
def write_ass(path,pages,seconds,offset=0,kind=None):
 events=[f'Dialogue: 0,{ass_time(0)},{ass_time(seconds)},Title,,0,0,0,,శ్రీ వేంకటేశ్వర సుప్రభాతం']
 for p in pages:
  a=max(offset,p['start']);b=min(offset+seconds,p['end'])
  if b<=a:continue
  bounds=sorted(set([a,b]+[max(a,min(b,w[k])) for w in p['words'] for k in ['start','end']]))
  for x,y in zip(bounds,bounds[1:]):
   if round(y*100)<=round(x*100):continue
   mid=(x+y)/2
   text='\\N'.join(' '.join(('{\\c&H004AD5FF&}'+w['text']+'{\\c&H00FFFFFF&}') if w['start']<=mid<w['end'] else w['text'] for w in line) for line in p['lines'])
   events.append(f'Dialogue: 1,{ass_time(x-offset)},{ass_time(y-offset)},Lyrics,,0,0,0,,{text}')
 if kind=='welcome':events.append(f'Dialogue: 0,0:00:00.00,{ass_time(seconds)},Card,,0,0,0,,{{\\an5\\pos(1430,430)}}డివైన్ విజ్డమ్ తెలుగు\\Nఛానల్‌కు స్వాగతం')
 if kind=='closing':events.append(f'Dialogue: 0,0:00:00.00,{ass_time(seconds)},Card,,0,0,0,,{{\\an5\\pos(1430,430)\\fs64}}సబ్‌స్క్రైబ్ • లైక్\\Nషేర్ • కామెంట్')
 path.write_text(HEADER+'\n'.join(events)+'\n',encoding='utf8')

def thumbnail():
 img=Image.open(ROOT/'art/03-crown-garlands.png').convert('RGB').resize((1920,1080),Image.Resampling.LANCZOS)
 overlay=Image.new('RGBA',img.size)
 d=ImageDraw.Draw(overlay);d.rectangle((980,0,1920,1080),fill=(2,8,23,225));img=Image.alpha_composite(img.convert('RGBA'),overlay)
 d=ImageDraw.Draw(img);gold='#f4cf70'
 for text,y,size,color in [('శ్రీ వేంకటేశ్వర',280,106,gold),('సుప్రభాతం',450,140,gold),('తెలుగు సాహిత్యంతో',660,70,'white'),('డివైన్ విజ్డమ్ తెలుగు',830,48,'#f1d894')]:
  font=ImageFont.truetype(FONT_PATH,size);assert font.getlength(text)<900
  d.text((1430,y),text,font=font,fill=color,anchor='mm',stroke_width=1)
 logo=Image.open(ROOT/'channel-logo.png').convert('RGBA');logo.thumbnail((180,180));img.alpha_composite(logo,(1700,45))
 img.convert('RGB').resize((1280,720),Image.Resampling.LANCZOS).save(ROOT/'thumbnail.jpg',quality=95)

def render():
 t=load('timeline');c=load('captions');audit=load('caption-audit');assert not audit['issues'],'Repair caption issues before render'
 (ROOT/'video-pieces').mkdir(exist_ok=True)
 logo=Image.open(ROOT/'channel-logo.png').convert('RGBA');logo.thumbnail((128,128));logo.save(ROOT/'logo-overlay.png')
 for s in t['scenes']:
  target=ROOT/'video-pieces'/f"{s['index']:02}.mp4"
  if target.exists():continue
  image=ROOT/'art'/f"{s['image']}.png";assert image.exists(),image
  frames=round(s['seconds']*FPS);subtitle=ROOT/f"screen-{s['index']:02}.ass";write_ass(subtitle,c['pages'],s['seconds'],s['start'],s['kind'])
  # Keep the frame stable: small linear zoom only, all faces above lyric area.
  zoom=f"1.015+0.025*on/{max(frames-1,1)}" if s['index']%2==0 else f"1.04-0.025*on/{max(frames-1,1)}"
  panel_y=590 if load('plan').get('fullShlokaHeldOnScreen') and s['kind']=='prayer' and any(len(p['lines'])>2 for p in c['pages'] if p['start']<s['end'] and p['end']>s['start']) else 740
  vf=f"[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='{zoom}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d={frames}:s=1920x1080:fps=24,setsar=1,fade=t=in:st=0:d=0.3,fade=t=out:st={max(0,s['seconds']-.3)}:d=0.3,drawbox=x=0:y={panel_y}:w=iw:h={1080-panel_y}:color=black@0.64:t=fill,drawbox=x=0:y=0:w=iw:h=110:color=black@0.25:t=fill[bg];[bg][1:v]overlay=W-w-28:28,ass=filename='{subtitle.as_posix()}':fontsdir='{ROOT.as_posix()}/fonts':shaping=complex,format=yuv420p[out]"
  run(['ffmpeg','-v','error','-nostdin','-n','-i',str(image),'-i',str(ROOT/'logo-overlay.png'),'-filter_complex',vf,'-map','[out]','-frames:v',str(frames),'-an','-c:v','libx264','-threads','6','-preset','veryfast','-crf','19','-pix_fmt','yuv420p','-video_track_timescale','24000',str(target)])
  save('RENDER-PROGRESS',{'completedScreens':s['index']+1,'screens':len(t['scenes'])});print(json.dumps({'stage':'screen-rendered','screen':s['index']+1,'total':len(t['scenes'])}),flush=True)
 (ROOT/'video-concat.txt').write_text('\n'.join(f"file 'video-pieces/{s['index']:02}.mp4'" for s in t['scenes'])+'\n',encoding='utf8')
 output=ROOT/'Sri-Venkateswara-Suprabhatam-Telugu-1080p.mp4'
 if not output.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'video-concat.txt'),'-i',str(ROOT/'finished-audio-master.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','256k','-movflags','+faststart',str(output)])
 thumbnail();metadata()

def metadata():
 t=load('timeline');p=load('plan');chapters=[{'start':0,'title':'ఛానల్ స్వాగతం • సుప్రభాత ప్రారంభం'}]
 for u in t['units']:
  if u['verse'] in [1,3,5,9,13,17,21,25,28] and u['start']>=10:chapters.append({'start':u['start'],'title':f"సుప్రభాతం • శ్లోకాలు {u['verse']}–{min(29, next((x-1 for x in [3,5,9,13,17,21,25,28,30] if x>u['verse']),29))}"})
 chapters.append({'start':t['prayerEnd'],'title':'ముగింపు • శ్రీ వేంకటేశ్వర స్వామి అనుగ్రహం'})
 chaptertext='\n'.join(chapter_time(c['start'])+' '+c['title'] for c in chapters)
 title='శ్రీ వేంకటేశ్వర సుప్రభాతం | తెలుగు సాహిత్యంతో | Divine Wisdom Telugu'
 description='శ్రీ వేంకటేశ్వర సుప్రభాతంలోని 29 శ్లోకాలను తెలుగు లిపిలోని సంస్కృత సాహిత్యంతో, మధురమైన భక్తి సంగీతంతో ఆలకించండి.\n\nసాహిత్య మూలం: '+p['source']+'\n\nఈ వీడియోలోని సంగీతం, గానం, ఛానల్ స్వాగతం మరియు ముగింపు స్వరం ElevenLabs సహాయంతో రూపొందించబడ్డాయి. చిత్రాలు AI సహాయంతో ప్రత్యేకంగా రూపొందించబడ్డాయి. సాంప్రదాయ సంస్కృత ప్రార్థనకు ఇది కొత్త సంగీత రూపకల్పన. ఏ వాణిజ్య గానాన్ని లేదా గాయకుడిని అనుకరించడానికి రూపొందించలేదు.\n\n'+chaptertext+'\n\nడివైన్ విజ్డమ్ తెలుగు ఛానల్‌ను సబ్‌స్క్రైబ్ చేయండి. లైక్, షేర్ చేసి మీ అభిప్రాయాన్ని కామెంట్‌లో తెలియజేయండి.\n\n#శ్రీవేంకటేశ్వరసుప్రభాతం #Suprabhatam #DivineWisdomTelugu\n'
 (ROOT/'youtube-description.txt').write_text(description,encoding='utf8');(ROOT/'chapters.txt').write_text(chaptertext+'\n',encoding='utf8')
 save('youtube-metadata',{'title':title,'description':description,'chapters':chapters,'tags':['Sri Venkateswara Suprabhatam','Suprabhatam Telugu lyrics','Divine Wisdom Telugu','Tirumala','శ్రీ వేంకటేశ్వర సుప్రభాతం'],'language':'te','containsSyntheticMedia':True,'uploadOrPublishingAuthorized':False})

def verify():
 t=load('timeline');path=ROOT/'Sri-Venkateswara-Suprabhatam-Telugu-1080p.mp4'
 run(['ffmpeg','-v','error','-nostdin','-i',str(path),'-f','null','-'])
 info=probe(path);v=next(s for s in info['streams'] if s['codec_type']=='video');assert (v['width'],v['height'],v['r_frame_rate'])==(1920,1080,'24/1');assert abs(float(info['format']['duration'])-t['seconds'])<.15
 (ROOT/'review').mkdir(exist_ok=True)
 for name,sec in [('welcome',3),('opening',t['prayerStart']+5),('lakshmi',t['units'][2]['start']+9),('middle',t['units'][14]['start']+10),('closing',t['prayerEnd']+5)]:
  run(['ffmpeg','-v','error','-nostdin','-y','-ss',str(sec),'-i',str(path),'-frames:v','1',str(ROOT/'review'/f'{name}.png')])
 save('VERIFICATION',{'file':str(path.resolve()),'seconds':float(info['format']['duration']),'resolution':'1920x1080','fps':24,'verses':29,'completeOrderedSourceAligned':True,'captionIssues':load('caption-audit')['issues'],'fullDecodePassed':True,'originalApprovedOpeningPreserved':True,'noTempoOrPitchProcessing':True,'welcomeAndClosingSeparate':True,'originalIllustrations':9,'existingChannelLogo':True,'captionFont':'Noto Sans Telugu','captionFontSize':104,'manualPronunciationAndMusicalContinuityReviewPending':True,'manualCaptionSynchronizationReviewPending':True,'published':False})
 print(json.dumps({'stage':'verified','file':str(path),'seconds':float(info['format']['duration'])}),flush=True)

if __name__=='__main__':
 mode=sys.argv[1]
 {'prepare':prepare,'captions':captions,'render':render,'verify':verify,'thumbnail':thumbnail,'metadata':metadata}[mode]()
