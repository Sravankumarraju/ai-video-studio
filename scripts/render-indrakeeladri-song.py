"""Divine Wisdom Telugu song delivery; original audio and timed Telugu highlights."""
from pathlib import Path
import json, math, subprocess, sys, os, hashlib, zipfile
from PIL import Image, ImageOps, ImageDraw, ImageFont

PROJECT=Path(__file__).resolve().parents[1]
ROOT=PROJECT/'output/divine-wisdom-telugu/indrakeeladri-kanakadurgamma'
FPS=24
OUT=ROOT/'Indrakeeladri-Kanaka-Durgamma-1080p.mp4'
TITLE='ఇంద్రకీలాద్రి వెలుగువమ్మా | కనకదుర్గమ్మా | Telugu Durga Song | Divine Wisdom Telugu'
def run(args): subprocess.run(args,check=True)
def read(n): return json.loads((ROOT/(n+'.json')).read_text(encoding='utf8'))
def save(n,v): (ROOT/(n+'.json')).write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
def probe(p): return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]))
DURATION=float(probe(ROOT/'assets/song-original.m4a')['format']['duration'])
def stamp(t):
 n=round(t*100);return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'
def st(t):
 n=round(t*1000);return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
HEADER='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Lyric,Noto Sans Telugu,100,&H00FFFFFF,&H00FFFFFF,&H00100804,&H90000000,0,0,0,0,100,100,0,0,1,4,2,2,100,100,78,1
Style: Telugu,Noto Sans Telugu,68,&H007CE2FF,&H00FFFFFF,&H00100804,&H90000000,0,0,0,0,100,100,0,0,1,3,1,5,90,90,60,1
Style: Channel,Noto Sans,64,&H007CE2FF,&H00FFFFFF,&H00100804,&H90000000,1,0,0,0,100,100,0,0,1,3,1,5,90,90,60,1
Style: Brand,Noto Sans,28,&H00D5E9FF,&H00FFFFFF,&H00100804,&H90000000,0,0,0,0,100,100,0,0,1,2,1,7,38,38,28,1
Style: Label,Noto Sans Telugu,36,&H007CE2FF,&H00FFFFFF,&H00100804,&H90000000,0,0,0,0,100,100,0,0,1,2,1,7,38,38,80,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''

def prepare():
 lines=(ROOT/'lyrics-performed.txt').read_text(encoding='utf-8-sig').splitlines()
 forced=[dict(w) for w in read('align')['words'] if w['text'].strip()]
 tokens=[w for l in lines for w in l.split()]
 assert tokens==[w['text'] for w in forced]
 # Independent Scribe onset, rather than the aligner's false start in the instrumental.
 forced[0]['start']=19.30
 captions=[];offset=0;events=[]
 def event(a,b,style,text,layer=3):
  if b>a:events.append(f'Dialogue: {layer},{stamp(a)},{stamp(b)},{style},,0,0,0,,{text}')
 event(0,DURATION,'Brand','Divine Wisdom Telugu')
 event(.6,5.6,'Channel',r'{\pos(960,828)\fad(600,450)}Divine Wisdom Telugu')
 event(.6,5.6,'Telugu',r'{\pos(960,938)\fs54\c&HFFFFFF&\fad(600,450)}ఛానల్‌కు స్వాగతం')
 event(6,17.8,'Telugu',r'{\pos(960,850)\fs90\fad(600,650)}ఇంద్రకీలాద్రి వెలుగువమ్మా')
 event(6,17.8,'Telugu',r'{\pos(960,970)\fs58\c&HFFFFFF&\fad(600,650)}కనకదుర్గమ్మా · తెలుగు భక్తి గీతం')
 event(41,44.8,'Telugu',r'{\pos(960,940)\fs58\fad(350,350)}పూలకన్నా గొప్పది మన ప్రేమ')
 event(94,99,'Telugu',r'{\pos(960,940)\fs58\fad(350,350)}ధైర్యం · కరుణ · సేవ')
 event(100.4,118.7,'Label','ధైర్యం · కరుణ · సేవ')
 event(118.86,133.68,'Label','మనసే నిజమైన కానుక')
 event(176,180.65,'Channel',r'{\pos(960,704)\fs62\fad(300,500)}Divine Wisdom Telugu')
 event(176,180.65,'Telugu',r'{\pos(960,806)\fs56\c&HFFFFFF&\fad(300,500)}లైక్ చేయండి · సబ్‌స్క్రైబ్ చేయండి')
 event(176,180.65,'Telugu',r'{\pos(960,906)\fs50\c&HFFFFFF&\fad(300,500)}షేర్ చేయండి · జై దుర్గమ్మా అని కామెంట్ చేయండి')
 event(176,180.65,'Channel',r'{\pos(960,1002)\fs28\c&HFFFFFF&\fad(300,500)}LIKE  /  SUBSCRIBE  /  SHARE  /  COMMENT')
 for i,line in enumerate(lines):
  n=len(line.split());ws=forced[offset:offset+n];offset+=n
  # A very short word may be collapsed by the aligner. Preserve order and make its
  # highlight visible inside the surrounding phrase without crossing the next word.
  for j,w in enumerate(ws):
   if w['end']<=w['start']:
    w['end']=min(w['start']+.08,ws[j+1]['start'] if j+1<len(ws) and ws[j+1]['start']>w['start'] else w['start']+.08)
  a=ws[0]['start'];b=max(w['end'] for w in ws)
  end=min(b+.22,forced[offset]['start']-.01 if offset<len(forced) else 175.9)
  end=max(b,end)
  size=next(s for s in (106,100,94,88,82,76,70) if ImageFont.truetype(str(PROJECT/'public/fonts/NotoSansTelugu.ttf'),s).getlength(line)<=1680)
  bounds=sorted(set([a,end]+[t for w in ws for t in (w['start'],w['end']) if a<=t<=end]))
  for x,y in zip(bounds,bounds[1:]):
   if round(y*100)<=round(x*100):continue
   mid=(x+y)/2
   active=next((k for k,w in reversed(list(enumerate(ws))) if w['start']<=mid<w['end']),None)
   text=' '.join((r'{\c&H004AD5FF&}'+w['text']+r'{\c&H00FFFFFF&}') if k==active else w['text'] for k,w in enumerate(ws))
   event(x,y,'Lyric',r'{\pos(960,1002)\fs'+str(size)+'}'+text,4)
  captions.append({'text':line,'start':a,'end':end,'fontSize':size,'words':ws})
 (ROOT/'captions-highlight.ass').write_text(HEADER+'\n'.join(events)+'\n',encoding='utf8')
 srt='\n\n'.join(f'{i+1}\n{st(c["start"])} --> {st(c["end"])}\n{c["text"]}' for i,c in enumerate(captions))+'\n'
 (ROOT/'captions-te.srt').write_text(srt,encoding='utf8')
 (ROOT/'captions-te.vtt').write_text('WEBVTT\n\n'+srt.replace(',', '.'),encoding='utf8')
 save('captions',captions)
 save('caption-audit',{'lines':len(captions),'words':len(forced),'fontSizes':sorted(set(c['fontSize'] for c in captions)),'firstSungOnset':19.30,'lastSungEnd':175.62,'timing':'ElevenLabs forced alignment of supplied lyrics with independent acoustic transcription onset correction','manualListeningVerified':False,'reviewNeeded':['Sung wording differs from written lyrics in several places; supplied spelling retained.','Three unperformed verse 2 lines omitted from timed captions.','Final chorus contains melisma and compressed alignment; human listening review recommended.'],'shaping':'libass complex shaping with bundled Noto Sans Telugu','highlight':'Gold active word; white other words'})
 cuts=[(0,1),(19.3,1),(25.7,2),(32.84,1),(40,2),(45.58,3),(51.56,3),(57.42,1),(63.76,3),(70.6,1),(78.7,2),(85.12,1),(92,4),(100.42,4),(107.88,4),(118.86,3),(125.4,3),(133.68,1),(139.86,2),(146.84,1),(155.44,1),(163.94,2),(176,1)]
 scenes=[]
 for i,(t,img) in enumerate(cuts):
  first=round(t*FPS);last=round(cuts[i+1][0]*FPS) if i+1<len(cuts) else math.ceil(DURATION*FPS)
  scenes.append({'index':i,'start':first/FPS,'frames':last-first,'image':f'{img:02}.png'})
 save('timeline',scenes)
 save('arrangement-notes',{'originalAudioPreserved':True,'sourceDuration':DURATION,'writtenLyricsStoredSeparately':True,'unperformedWrittenLines':['కష్టపడే చేతులకు — ఓర్పును అందించమ్మా','కన్నీటిని తుడిచేందుకు — ముందడుగు వేయించమ్మా','నిన్ను కొలిచే భక్తిలో — మంచితనం పెరగాలమ్మా'],'manualListeningVerified':False})
 print(f'Prepared {len(captions)} caption lines / {len(forced)} words / {len(scenes)} shots',flush=True)

def render(limit=None):
 os.chdir(ROOT);(ROOT/'pieces').mkdir(exist_ok=True)
 scenes=read('timeline')
 for s in (scenes[:limit] if limit else scenes):
  target=ROOT/'pieces'/f'{s["index"]:02}.mp4'
  if target.exists() and target.stat().st_size>0:continue
  frames=s['frames'];u=f'(on/{max(frames-1,1)})';ease=f'({u}*{u}*(3-2*{u}))'
  zoom=f'1.01+0.055*{ease}' if s['index']%2==0 else f'1.065-0.055*{ease}'
  graph=(f"[0:v]scale=2560:1440:force_original_aspect_ratio=increase,crop=2560:1440,zoompan=z='{zoom}':x='(iw-iw/zoom)*{[.5,.46,.54][s['index']%3]}':y='(ih-ih/zoom)*0.4':d={frames}:s=1920x1080:fps={FPS},setsar=1,drawbox=x=0:y=810:w=iw:h=270:color=black@0.38:t=fill[bg];"
   f"[1:v]scale=132:132[logo];[bg][logo]overlay=W-w-28:20,setpts=PTS+{s['start']}/TB,ass=filename='captions-highlight.ass':fontsdir='../../../public/fonts':shaping=complex,setpts=PTS-STARTPTS,format=yuv420p[out]")
  run(['ffmpeg','-hide_banner','-v','error','-nostdin','-n','-i',f'images/{s["image"]}','-i','assets/channel-logo.png','-filter_complex_threads','1','-filter_complex',graph,'-map','[out]','-frames:v',str(frames),'-an','-c:v','libx264','-threads','4','-preset','veryfast','-crf','18','-video_track_timescale','24000',str(target)])
  print(f'Rendered shot {s["index"]+1}/{len(scenes)}',flush=True)
 if limit:return
 (ROOT/'pieces.txt').write_text('\n'.join(f"file 'pieces/{s['index']:02}.mp4'" for s in scenes)+'\n')
 run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i','pieces.txt','-i','assets/song-original.m4a','-map','0:v:0','-map','1:a:0','-c','copy','-t',str(DURATION),'-map_metadata','-1','-metadata','title='+TITLE,'-metadata','artist=Divine Wisdom Telugu','-movflags','+faststart',str(OUT)])

def package():
 chapters='00:00 Divine Wisdom Telugu | పరిచయం\n00:19 ఇంద్రకీలాద్రి వెలుగువమ్మా\n00:45 కొండపై కొలువైన బంగారు తల్లి\n01:10 కనకదుర్గమ్మా పల్లవి\n01:40 ధైర్యం · కరుణ · సేవ\n01:58 మనసే నిజమైన కానుక\n02:13 చివరి పల్లవి\n02:43 జై జై దుర్గమ్మా\n02:56 లైక్ · సబ్‌స్క్రైబ్ · షేర్ · కామెంట్\n'
 # YouTube chapter markers require each chapter to be at least ten seconds.
 youtube_chapters='\n'.join(chapters.strip().splitlines()[:-1])+'\n'
 desc='''ఇంద్రకీలాద్రి వెలుగువమ్మా — కనకదుర్గమ్మా! 🙏
విజయవాడ కనకదుర్గమ్మను స్మరిస్తూ, ధైర్యం, కరుణ, సేవాభావాన్ని కోరుకునే తెలుగు భక్తి గీతం.

కృష్ణమ్మ అలలలో అమ్మ కీర్తి, మన ఇంటి దీపంలో అమ్మ ప్రేమ, మన చేతుల సేవలో అమ్మ పూజ — ఈ పాటలోని భావం.
తెలుగు పాట సాహిత్యం తెరపై కనిపిస్తుంది. పాడుతున్న పదం బంగారు రంగులో హైలైట్ అవుతుంది.

Welcome to Divine Wisdom Telugu. A Telugu devotional song for Kanaka Durga, with cinematic devotional illustrations and highlighted Telugu lyrics.

🙏 మీకు నచ్చితే లైక్ చేయండి.
🔔 Divine Wisdom Telugu ఛానల్‌ను సబ్‌స్క్రైబ్ చేయండి.
🌼 ఈ భక్తి గీతాన్ని కుటుంబ సభ్యులు, స్నేహితులతో షేర్ చేయండి.
💬 మీకు నచ్చిన పంక్తిని లేదా “జై దుర్గమ్మా” అని కామెంట్ చేయండి.

పాటలోని భాగాలు / Chapters
'''+youtube_chapters+'''
Audio: Creator-supplied recording, preserved without remixing.
Visuals: AI-generated devotional illustrations; imaginative depictions, not temple footage.
Captions: Based on supplied Telugu lyrics and automated audio alignment. Some sung wording varies from the written lyrics.

#కనకదుర్గమ్మ #దుర్గమ్మపాట #TeluguDevotionalSongs #KanakaDurga #DivineWisdomTelugu
'''
 tags='కనకదుర్గమ్మ, ఇంద్రకీలాద్రి వెలుగువమ్మా, దుర్గమ్మ పాట, విజయవాడ కనకదుర్గమ్మ, తెలుగు భక్తి పాటలు, Kanaka Durga song, Kanakadurgamma Telugu song, Indrakeeladri Veluguvamma, Vijayawada Durga song, Telugu devotional songs, Durga devotional song, Divine Wisdom Telugu'
 for name,text in [('youtube-title.txt',TITLE),('youtube-description.txt',desc),('youtube-tags.txt',tags),('youtube-chapters.txt',youtube_chapters),('scene-cue-sheet.txt',chapters),('pinned-comment.txt','జై కనకదుర్గమ్మా! 🙏 ఈ పాటలో మీ మనసును తాకిన పంక్తి ఏది? కామెంట్ చేయండి. Divine Wisdom Telugu ను సబ్‌స్క్రైబ్ చేసి, ఈ గీతాన్ని మీ కుటుంబంతో పంచుకోండి.')]:
  (ROOT/name).write_text(text,encoding='utf8')
 assert len(TITLE)<=100 and len(desc)<=5000 and len(tags)<=500
 for i in (1,2):
  source=ROOT/f'thumbnail-{i}-master.png'
  if source.exists():
   im=ImageOps.fit(Image.open(source).convert('RGB'),(1280,720),method=Image.Resampling.LANCZOS)
   im.save(ROOT/f'youtube-thumbnail-{i}.jpg',quality=94,optimize=True)
   assert (ROOT/f'youtube-thumbnail-{i}.jpg').stat().st_size<2_000_000
 save('upload-settings',{'title':TITLE,'descriptionFile':'youtube-description.txt','tagsFile':'youtube-tags.txt','language':'te','category':'Music','visibility':'Not uploaded','audience':'General audience; creator to confirm made-for-kids setting','aiVisuals':'AI devotional artwork disclosed in description; review YouTube altered-content setting for final upload','rights':'Creator to confirm rights to supplied audio before publishing','thumbnail':'youtube-thumbnail-1.jpg','alternativeThumbnail':'youtube-thumbnail-2.jpg','pinnedComment':'pinned-comment.txt'})
 (ROOT/'START-HERE.txt').write_text('''DIVINE WISDOM TELUGU — INDRAKEELADRI KANAKA DURGAMMA

MAIN VIDEO: Indrakeeladri-Kanaka-Durgamma-1080p.mp4
1920 x 1080, 24 fps, original supplied AAC audio preserved.

THUMBNAILS: youtube-thumbnail-1.jpg (song title), youtube-thumbnail-2.jpg (motherly blessing).
UPLOAD COPY: youtube-title.txt, youtube-description.txt, youtube-tags.txt, youtube-chapters.txt.
COMMENT: pinned-comment.txt contains a suggested pinned comment; it has not been posted.
CAPTIONS: Telugu subtitles are burned into the video, with gold active-word highlights.
captions-te.srt and captions-te.vtt are optional closed-caption files.
captions-highlight.ass retains the colored caption source.

Four new devotional illustrations were generated with the built-in image_gen tool.
images/ contains the source illustrations; image-prompts.json contains all six prompts.
assets/ contains the original song and established channel logo.

REVIEW NOTES:
Automated transcription indicates three written verse 2 lines are absent from this recording.
These remain in lyrics-supplied.txt, but are omitted from the timed captions.
The sung phrasing varies from the supplied written text in places. Supplied spelling is retained.
The final refrain has compressed alignment and needs a human listening check for exact word sync.
Manual listening verification has not been performed. See caption-audit.json.

verification.json records full decoding, resolution, duration and original-audio packet checks.
review-contact-sheet.jpg shows sampled frames throughout the finished video.
Nothing has been uploaded or published to YouTube.
''',encoding='utf8')

def verify():
 p=probe(OUT);v=next(s for s in p['streams'] if s['codec_type']=='video');a=next(s for s in p['streams'] if s['codec_type']=='audio')
 assert (v['width'],v['height'])==(1920,1080) and v['codec_name']=='h264' and a['codec_name']=='aac'
 assert abs(float(p['format']['duration'])-DURATION)<.1
 assert abs(float(v['duration'])-float(a['duration']))<.1
 run(['ffmpeg','-v','error','-nostdin','-i',str(OUT),'-f','null','-'])
 def ah(p):return subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-map','0:a:0','-c','copy','-f','hash','-hash','sha256','-']).decode().strip()
 assert ah(OUT)==ah(ROOT/'assets/song-original.m4a')
 times=[3,10,20.9,27.6,48,60,88,102.4,113,126,141.8,157.2,170.5,178.2]
 sheet=Image.new('RGB',(1280,392*math.ceil(len(times)/2)),(8,12,20));draw=ImageDraw.Draw(sheet)
 for i,t in enumerate(times):
  path=ROOT/f'review-{t:06.2f}.jpg';run(['ffmpeg','-v','error','-nostdin','-y','-ss',str(t),'-i',str(OUT),'-frames:v','1','-q:v','2',str(path)])
  x=i%2*640;y=i//2*392;sheet.paste(Image.open(path).resize((640,360)),(x,y));draw.text((x+12,y+368),str(t)+' seconds',fill='white')
 sheet.save(ROOT/'review-contact-sheet.jpg',quality=92)
 data={'video':str(OUT),'channel':'Divine Wisdom Telugu','resolution':[1920,1080],'fps':FPS,'duration':float(p['format']['duration']),'fullDecodePassed':True,'originalAudioPacketsUnchanged':True,'captions':read('caption-audit'),'newDevotionalScenes':4,'thumbnailVariants':2,'logoThroughout':True,'welcomeAndClosing':True,'published':False,'videoSha256':hashlib.sha256(OUT.read_bytes()).hexdigest()}
 save('verification',data);save('delivery-manifest',data)
 names=[OUT.name,'youtube-thumbnail-1.jpg','youtube-thumbnail-2.jpg','thumbnail-1-master.png','thumbnail-2-master.png','youtube-title.txt','youtube-description.txt','youtube-tags.txt','youtube-chapters.txt','pinned-comment.txt','captions-te.srt','captions-te.vtt','captions-highlight.ass','delivery-manifest.json','verification.json','caption-audit.json','lyrics-supplied.txt','lyrics-performed.txt','upload-settings.json','review-contact-sheet.jpg','image-prompts.json','START-HERE.txt','timeline.json','captions.json']
 with zipfile.ZipFile(ROOT.parent/'indrakeeladri-kanakadurgamma-youtube-package.zip','w',zipfile.ZIP_STORED) as z:
  for name in names:z.write(ROOT/name,name)
  for folder in ('images','assets'):
   for path in (ROOT/folder).glob('*'):z.write(path,path.relative_to(ROOT).as_posix())
  z.write(PROJECT/'scripts/render-indrakeeladri-song.py','production/render-indrakeeladri-song.py')
 print('Verified full video and packaged delivery',flush=True)

if __name__=='__main__':
 {'prepare':prepare,'preview':lambda:render(3),'render':render,'package':package,'verify':verify}[sys.argv[1]]()
