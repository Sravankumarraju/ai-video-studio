"""Render original Ayyappa story song with measured lyric timestamps."""
from pathlib import Path
import json,subprocess,math,sys,shutil,re,difflib
from PIL import Image,ImageDraw,ImageFont
THREE='--three-part' in sys.argv
ROOT=Path('data/productions/divine-wisdom/'+('ayyappa-birth-story-three-part-2026-10-22' if THREE else 'ayyappa-birth-story-2026-10-22'))
OLD=ROOT.parent/'bala-ayyappa-2026-10-22'
OUT=ROOT/'Ayyappa-Hariharasutuni-Avataram-Telugu-1080p.mp4'
FPS=24
def read(n):return json.loads((ROOT/f'{n}.json').read_text(encoding='utf8'))
def save(n,v):(ROOT/f'{n}.json').write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
def run(a):subprocess.run(a,check=True)
def probe(f):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(f)]))
def norm(s):return ''.join(c for c in s if '\u0c00'<=c<='\u0c7f')
def stamp(t):
 n=round(t*100);return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'
def srttime(t):
 n=round(t*1000);return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
HEADER='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Noto Sans Telugu,78,&H00FFFFFF,&H0096DFFF,&H00140F0B,&H90000000,0,0,0,0,100,100,0,0,1,3,1,2,100,100,58,1
Style: Title,Noto Sans Telugu,48,&H0096DFFF,&H0096DFFF,&H00140F0B,&H90000000,0,0,0,0,100,100,0,0,1,2,1,8,170,170,35,1
Style: Brand,Noto Sans,25,&H00FFFFFF,&H00FFFFFF,&H00140F0B,&H90000000,0,0,0,0,100,100,0,0,1,1,1,7,130,25,46,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
def prepare():
 plan=read('plan');duration=float(probe(ROOT/'song.mp3')['format']['duration']);assert 300<=duration<=360
 words=read('song-metadata').get('words_timestamps',[]);assert words,'Provider returned no timestamps'
 # Align lyric character spans to timestamped provider tokens, preserving Telugu clusters.
 chars='';spans=[]
 for w in words:
  token=norm(w['word']);start=len(chars);chars+=token;spans.append((start,len(chars),w))
 desired=''.join(norm(s['text']) for s in plan['sections']);matcher=difflib.SequenceMatcher(None,desired,chars,autojunk=False)
 mapping={a+j:b+j for a,b,n in matcher.get_matching_blocks() for j in range(n)}
 captions=[];offset=0;withheld=[]
 font=ImageFont.truetype('public/fonts/NotoSansTelugu.ttf',78)
 for section in plan['sections']:
  for line in section['text'].splitlines():
   normalized=norm(line);mapped=[mapping[k] for k in range(offset,offset+len(normalized)) if k in mapping];offset+=len(normalized)
   if len(mapped)<len(normalized)*.8:withheld.append(line);continue
   ws=[w for a,b,w in spans if b>min(mapped) and a<=max(mapped)]
   positive=[w for w in ws if w['end_ms']>w['start_ms']]
   if not positive:withheld.append(line);continue
   start=positive[0]['start_ms']/1000;end=positive[-1]['end_ms']/1000
   if end-start<.3:withheld.append(line);continue
   captions.append({'text':line,'start':start,'end':end,'size':min(78,int(78*1660/max(font.getlength(line),1660))),'section':section['id']})
 transcript=read('transcribe') if (ROOT/'transcribe.json').exists() else {}
 uncertain=[]
 if transcript:
  checked=[]
  for c in captions:
   acoustic=' '.join(w['text'] for w in transcript.get('words',[]) if w.get('type')=='word' and w['start']>=c['start']-.4 and w['end']<=c['end']+.4)
   score=difflib.SequenceMatcher(None,norm(c['text']),norm(acoustic),autojunk=False).ratio()
   if score<.72:
    uncertain.append({'text':c['text'],'start':c['start'],'end':c['end'],'recognition':acoustic,'similarity':score})
   else:checked.append(c)
  captions=checked
 events=[]
 def event(a,b,style,text,layer=0):events.append(f'Dialogue: {layer},{stamp(a)},{stamp(b)},{style},,0,0,0,,{text}')
 event(0,duration,'Brand','DIVINE WISDOM TELUGU')
 for s in plan['sections']:event(s['start']+.2,min(s['end']-.15,duration),'Title',r'{\fad(300,300)}'+s['title'])
 if not THREE:event(.4,8.7,'Title',r'{\an5\pos(960,760)\fs62\fad(500,600)}అయ్యప్ప స్వామి జన్మకథ\Nహరిహరసుతుని అవతారం',2)
 if THREE:event(0,duration,'Brand',r'{\an9\pos(1880,50)\fs23}భక్తి సంప్రదాయ కథనం')
 for i,c in enumerate(captions):
  c['displayEnd']=min(c['end']+.2,captions[i+1]['start']-.025 if i+1<len(captions) else duration)
  if c['displayEnd']<=c['start']:continue
  event(c['start'],c['displayEnd'],'Caption',r'{\fs'+str(c['size'])+r'\fad(80,100)}'+c['text'])
 (ROOT/'captions.ass').write_text(HEADER+'\n'.join(events)+'\n',encoding='utf8')
 (ROOT/'captions-te.srt').write_text('\n\n'.join(f'{i+1}\n{srttime(c["start"])} --> {srttime(c["displayEnd"])}\n{c["text"]}' for i,c in enumerate(captions)),encoding='utf8')
 save('captions',captions)
 similarity=difflib.SequenceMatcher(None,desired,norm(transcript.get('text','')),autojunk=False).ratio() if transcript else None
 save('caption-audit',{'source':'Music provider word timestamps cross-checked against independent Scribe recognition; captions withheld below 0.72 normalized character similarity','matchedLyricCharacters':len(mapping),'desiredLyricCharacters':len(desired),'withheldLines':withheld,'uncertainRecognitionLines':uncertain,'independentTranscriptSimilarity':similarity,'manualListeningVerified':False,'status':'Listening review required for uncertain lyrics; not certified exact performance'})
 for image in ['01-pamba-infant.png','02-divine-birth.png','03-pandalam-king.png','04-palace-blessing.png']:
  if not (ROOT/image).exists():shutil.copyfile(OLD/image,ROOT/image)
 scenes=[]
 for s in plan['sections']:
  # Give longer verses two gentle camera shots.
  cuts=2 if s['seconds']>=30 else 1
  for j in range(cuts):
   first=round((s['start']+j*s['seconds']/cuts)*FPS);last=round((s['start']+(j+1)*s['seconds']/cuts)*FPS)
   if s==plan['sections'][-1]:last=math.ceil(duration*FPS)
   scenes.append({'index':len(scenes),'image':s['image'],'frames':last-first,'start':first/FPS,'end':last/FPS})
 if THREE:
  # Every shot advances the narrative; the chorus holds the milestone just reached.
  scenes=[]
  art={'birth':['02-divine-birth.png','03-pandalam-king.png','04-palace-blessing.png'],'mission':['youth-learning.png','mission-victory.png'],'sabarimala':['tiger-return.png','arrow-sabarimala.png','hero-sabarimala.png']}
  chorus_art=iter(['04-palace-blessing.png','mission-victory.png','hero-sabarimala.png'])
  for s in plan['sections']:
   images=[next(chorus_art)] if s['id'].startswith('chorus') else art[s['id']]
   # Match image changes to sung lines rather than equal-time fractions.
   cue=[c for c in captions if c['section']==s['id']]
   if s['id']=='birth':inner=[s['start']+24,s['start']+48]
   elif s['id']=='mission':inner=[s['start']+36]
   elif s['id']=='sabarimala':inner=[s['start']+36,s['start']+54]
   else:inner=[]
   cuts=[s['start']]+inner+[s['end']]
   for j,image in enumerate(images):
    first=round(cuts[j]*FPS);last=round(cuts[j+1]*FPS)
    if s==plan['sections'][-1] and j==len(images)-1:last=math.ceil(duration*FPS)
    scenes.append({'index':len(scenes),'image':image,'frames':last-first,'start':first/FPS,'end':last/FPS})
 save('timeline',{'seconds':duration,'fps':FPS,'scenes':scenes});print(json.dumps({'stage':'prepared','seconds':duration,'captions':len(captions),'withheld':len(withheld),'similarity':similarity}),flush=True)
def visuals():
 (ROOT/'pieces').mkdir(exist_ok=True)
 for s in read('timeline')['scenes']:
  dest=ROOT/'pieces'/f'{s["index"]:02}.mp4'
  if dest.exists():continue
  n=s['frames'];z=f'1.01+0.05*on/{n}' if s['index']%2==0 else f'1.06-0.05*on/{n}'
  vf=f"scale=2560:1440:force_original_aspect_ratio=increase,crop=2560:1440,zoompan=z='{z}':x='(iw-iw/zoom)*0.5':y='(ih-ih/zoom)*0.40':d={n}:s=1920x1080:fps={FPS},setsar=1,fade=t=in:st=0:d=0.3,fade=t=out:st={n/FPS-.3}:d=0.3,format=yuv420p"
  run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT/s['image']),'-vf',vf,'-frames:v',str(n),'-an','-c:v','libx264','-threads','4','-preset','veryfast','-crf','19',str(dest)])
  print(f'Visual {s["index"]+1}/{len(read("timeline")["scenes"])}',flush=True)
 (ROOT/'pieces.txt').write_text('\n'.join(f"file 'pieces/{s['index']:02}.mp4'" for s in read('timeline')['scenes'])+'\n',encoding='utf8')
def render():
 duration=read('timeline')['seconds'];logo='data/branding/divine-wisdom/youtube-avatar/divine-wisdom-telugu-circle-safe.png'
 graph=f"[0:v]drawbox=x=0:y=0:w=iw:h=110:color=black@0.28:t=fill,drawbox=x=0:y=885:w=iw:h=195:color=black@0.45:t=fill,ass=filename='{ROOT.as_posix()}/captions.ass':fontsdir='public/fonts':shaping=complex[base];[2:v]scale=76:76[logo];[base][logo]overlay=30:20:format=auto,format=yuv420p[v]"
 run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'pieces.txt'),'-i',str(ROOT/'song.mp3'),'-i',logo,'-filter_complex_threads','2','-filter_complex',graph,'-map','[v]','-map','1:a:0','-c:v','libx264','-threads','6','-preset','veryfast','-crf','19','-c:a','aac','-b:a','192k','-ar','48000','-t',str(duration),'-movflags','+faststart','-metadata','title=అయ్యప్ప స్వామి జన్మకథ — హరిహరసుతుని అవతారం',str(OUT)])
 print(str(OUT),flush=True)
def verify():
 p=probe(OUT);v=next(s for s in p['streams'] if s['codec_type']=='video');a=next(s for s in p['streams'] if s['codec_type']=='audio');seconds=float(p['format']['duration'])
 assert (v['width'],v['height'],v['codec_name'],a['codec_name'])==(1920,1080,'h264','aac');assert 300<=seconds<=360
 assert abs(seconds-read('timeline')['seconds'])<.1
 run(['ffmpeg','-v','error','-xerror','-nostdin','-i',str(OUT),'-f','null','-'])
 sheet=Image.new('RGB',(1440,3*294),(14,18,29));draw=ImageDraw.Draw(sheet)
 for i,t in enumerate([3,18,50,95,135,170,210,260,min(300,seconds-4)]):
  dest=ROOT/f'review-{t}.jpg';run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(t),'-i',str(OUT),'-frames:v','1','-q:v','2',str(dest)])
  with Image.open(dest) as im:sheet.paste(im.resize((480,270)),((i%3)*480,(i//3)*294))
  draw.text(((i%3)*480+12,(i//3)*294+274),f'{t}s',fill='white')
 sheet.save(ROOT/'review-contact-sheet.jpg',quality=93)
 correlations=[]
 if THREE:
  import numpy as np
  choruses=[s for s in read('plan')['sections'] if s['id'].startswith('chorus')]
  length=min(s['seconds'] for s in choruses)-.10
  arrays=[]
  for s in choruses:
   raw=subprocess.check_output(['ffmpeg','-v','error','-ss',str(s['start']+.05),'-i',str(OUT),'-t',str(length),'-map','0:a:0','-ar','12000','-ac','1','-f','f32le','-'])
   arrays.append(np.frombuffer(raw,dtype='<f4'))
  n=min(len(x) for x in arrays)
  correlations=[float(np.corrcoef(arrays[0][:n],x[:n])[0,1]) for x in arrays[1:]]
  assert min(correlations)>.995,correlations
 save('verification',{'file':str(OUT.resolve()),'durationSeconds':seconds,'resolution':[1920,1080],'fullDecodePassed':True,'audioDuration':a.get('duration'),'chorusAudioCorrelations':correlations,'captionAudit':read('caption-audit'),'published':False,'aiGeneratedMusicAndArt':True,'manualListeningVerified':False})
 print(json.dumps({'verified':True,'seconds':seconds,'bytes':OUT.stat().st_size}),flush=True)
if __name__=='__main__':{'prepare':prepare,'visuals':visuals,'render':render,'verify':verify}[sys.argv[1]]()
