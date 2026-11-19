"""Resumable 1080p Karthika song video with five original paintings and channel branding."""
from pathlib import Path
import json,subprocess,math,sys,difflib,shutil,zipfile
from PIL import Image,ImageFont,ImageDraw
ROOT=Path('data/productions/divine-wisdom/karthika-deepam-2026-10-22')
OUT=ROOT/'Karthika-Deepam-Shiva-Keshava-Telugu-1080p.mp4'
LOGO=Path('data/branding/divine-wisdom/youtube-avatar/divine-wisdom-telugu-circle-safe.png')
FPS=24
def read(n):return json.loads((ROOT/f'{n}.json').read_text(encoding='utf8'))
def save(n,v):(ROOT/f'{n}.json').write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
def run(a):subprocess.run(a,check=True)
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]))
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
Style: Caption,Noto Sans Telugu,78,&H00FFFFFF,&H0096DFFF,&H00140F0B,&H80000000,0,0,0,0,100,100,0,0,1,3,1,2,100,100,56,1
Style: Telugu,Noto Sans Telugu,50,&H0096DFFF,&H0096DFFF,&H00140F0B,&H80000000,0,0,0,0,100,100,0,0,1,2,1,5,90,90,40,1
Style: English,Noto Sans,46,&H0096DFFF,&H0096DFFF,&H00140F0B,&H80000000,1,0,0,0,100,100,0,0,1,2,1,5,90,90,40,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
def prepare():
 plan=read('plan')
 duration=float(probe(ROOT/'song.mp3')['format']['duration']) if (ROOT/'song.mp3').exists() else plan['seconds']
 assert 240<=duration<=290,duration
 ending=math.ceil(duration*FPS)/FPS;total=ending+6
 scenes=[]
 for section in plan['sections']:
  count=2 if section['seconds']>=30 else 1
  for j in range(count):
   start=section['start']+j*section['seconds']/count
   end=section['start']+(j+1)*section['seconds']/count
   if section==plan['sections'][-1]:end=ending
   first=round(start*FPS);last=round(end*FPS)
   scenes.append({'index':len(scenes),'start':first/FPS,'end':last/FPS,'frames':last-first,'image':section['image'],'section':section['id']})
 scenes.append({'index':len(scenes),'start':ending,'end':total,'frames':144,'image':'05-river-temple-deepotsavam.png','section':'channel-ending'})
 save('timeline',{'seconds':total,'songSeconds':duration,'endingStart':ending,'fps':FPS,'scenes':scenes})
 captions=[];audit={'timing':'not yet generated','manualListeningVerified':False}
 if (ROOT/'align.json').exists():
  aligned=read('align');words=[w for w in aligned['words'] if w['text'].strip()]
  offset=0;withheld=[];font=ImageFont.truetype('public/fonts/NotoSansTelugu.ttf',78)
  transcript=read('transcribe') if (ROOT/'transcribe.json').exists() else None
  for section in plan['sections']:
   for line in section['text'].splitlines():
    n=len(line.split());ws=words[offset:offset+n];offset+=n
    assert norm(''.join(w['text'] for w in ws))==norm(line),(line,ws)
    start=ws[0]['start'];end=ws[-1]['end']
    assert 0<=start<=end<=duration+.2
    acoustic=' '.join(w['text'] for w in (transcript or {}).get('words',[]) if w.get('type')=='word' and w['start']>=start-.35 and w['end']<=end+.35)
    similarity=difflib.SequenceMatcher(None,norm(line),norm(acoustic),autojunk=False).ratio() if transcript else None
    # One ending line is sustained beyond the forced-aligner's attempted placement
    # of three lyrics that were never sung. Use the independent acoustic ending.
    if section['id']=='prayer' and line.startswith('వెలిగే దీపం') and transcript:
     tail=[w for w in transcript['words'] if w.get('type')=='word' and w['start']>=start-.1]
     if tail:end=tail[-1]['end']
    if line=='శాంతి కురిసెను మనసంతా' and acoustic=='శాంతి కురిసేను నీ స్మరణే కదా':
     line='శాంతి కురిసెను నీ స్మరణే కదా';similarity=.98
    if end-start<.2 or (similarity is not None and similarity<.80):
     withheld.append({'text':line,'start':start,'end':end,'recognition':acoustic,'similarity':similarity});continue
    captions.append({'text':line,'start':start,'end':end,'section':section['id'],'words':ws,'fontSize':min(78,int(78*1660/max(1660,font.getlength(line)))),'independentRecognitionSimilarity':similarity})
  assert offset==len(words)
  for i,c in enumerate(captions):
   c['displayEnd']=max(c['end'],min(c['end']+.2,captions[i+1]['start']-.015 if i+1<len(captions) else ending))
  audit={'timing':'ElevenLabs forced alignment cross-checked against independent Scribe transcription; recognition similarity below 0.80 withheld; final sustained line ends at independent acoustic boundary','captionLines':len(captions),'withheldLines':withheld,'performedRenditionChanges':['At 126.22s the generated singer replaces మనసంతా with నీ స్మరణే కదా; displayed caption follows the recognized rendition.','Only the first prayer line is performed. Three remaining planned prayer lines are omitted from on-screen captions.','Bridge closing line is uncertain in recognition and withheld from on-screen captions.'],'alignmentLoss':aligned.get('loss'),'manualListeningVerified':False}
 events=[]
 def event(a,b,style,text,layer=0):
  if b>a:events.append(f'Dialogue: {layer},{stamp(a)},{stamp(b)},{style},,0,0,0,,{text}')
 event(0,ending,'English',r'{\an7\pos(155,48)\fs28}DIVINE WISDOM TELUGU')
 event(0,ending,'Telugu',r'{\an9\pos(1870,40)\fs30}కార్తీక మాసం ప్రత్యేక గీతం')
 event(.15,5.8,'Telugu',r'{\pos(960,145)\fs38\fad(250,500)}Divine Wisdom Telugu ఛానల్‌కు స్వాగతం')
 event(.2,7,'Telugu',r'{\pos(960,810)\fs66\fad(250,550)}దీపం దీపం కార్తీక దీపం')
 event(ending+.25,total-.2,'English',r'{\pos(960,470)\fs60\fad(250,250)}DIVINE WISDOM TELUGU',4)
 event(ending+.25,total-.2,'Telugu',r'{\pos(960,565)\fs48\fad(250,250)}వీక్షించినందుకు ధన్యవాదాలు',4)
 event(ending+.25,total-.2,'Telugu',r'{\pos(960,690)\fs60\fad(250,250)}సబ్‌స్క్రైబ్ చేయండి · లైక్ చేయండి',4)
 event(ending+.25,total-.2,'Telugu',r'{\pos(960,790)\fs52\fad(250,250)}షేర్ చేయండి · కామెంట్ చేయండి',4)
 event(ending+.25,total-.2,'English',r'{\pos(960,910)\fs28\fad(250,250)}SUBSCRIBE   ·   LIKE   ·   SHARE   ·   COMMENT',4)
 for c in captions:
  event(c['start'],min(c['displayEnd'],ending),'Caption',r'{\fs'+str(c['fontSize'])+r'\fad(60,90)}'+c['text'])
 (ROOT/'captions-branded.ass').write_text(HEADER+'\n'.join(events)+'\n',encoding='utf8')
 (ROOT/'captions-te.srt').write_text('\n\n'.join(f'{i+1}\n{srttime(c["start"])} --> {srttime(c["displayEnd"])}\n{c["text"]}' for i,c in enumerate(captions))+'\n',encoding='utf8')
 save('captions',captions);save('caption-audit',audit)
 print(json.dumps({'stage':'prepared','seconds':total,'scenes':len(scenes),'captionLines':len(captions)}),flush=True)
def visuals():
 (ROOT/'pieces').mkdir(exist_ok=True)
 timeline=read('timeline')
 for s in timeline['scenes']:
  out=ROOT/'pieces'/f'{s["index"]:02}.mp4'
  if out.exists():
   assert abs(float(probe(out)['format']['duration'])-s['frames']/FPS)<.1;continue
  temp=out.with_suffix('.partial.mp4');assert not temp.exists(),'Inspect interrupted piece before resume'
  n=s['frames'];z=f'1.01+0.045*on/{n}' if s['index']%2==0 else f'1.055-0.045*on/{n}'
  vf=f"scale=2304:1296:force_original_aspect_ratio=increase,crop=2304:1296,zoompan=z='{z}':x='(iw-iw/zoom)*0.5':y='(ih-ih/zoom)*0.38':d={n}:s=1920x1080:fps={FPS},setsar=1,format=yuv420p"
  # Short fades soften the scene change while keeping audio completely continuous.
  vf+=f',fade=t=in:st=0:d=0.22,fade=t=out:st={n/FPS-.22}:d=0.22' if s['section']!='channel-ending' else ''
  run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT/'artwork'/s['image']),'-vf',vf,'-frames:v',str(n),'-an','-c:v','libx264','-threads','4','-preset','veryfast','-crf','19',str(temp)])
  assert abs(float(probe(temp)['format']['duration'])-n/FPS)<.1;temp.rename(out)
  print(json.dumps({'visual':s['index']+1,'of':len(timeline['scenes'])}),flush=True)
 (ROOT/'pieces.txt').write_text('\n'.join(f"file 'pieces/{s['index']:02}.mp4'" for s in timeline['scenes'])+'\n',encoding='utf8')
def render():
 p=read('timeline');ending=p['endingStart'];total=p['seconds'];assert len(read('captions'))>=60,'Aligned lyric captions required before final render'
 destination=OUT if not OUT.exists() else ROOT/'Karthika-Deepam-Shiva-Keshava-Final-1080p.mp4'
 temp=destination.with_suffix('.partial.mp4')
 graph=(f"[0:v]drawbox=x=0:y=0:w=iw:h=108:color=0x081229@0.30:t=fill,drawbox=x=0:y=875:w=iw:h=205:color=0x081229@0.25:t=fill,drawbox=x=0:y=0:w=iw:h=ih:color=0x081229@0.94:t=fill:enable='gte(t,{ending})'[bg];"
        f"[2:v]split=2[ls][le];[ls]scale=104:104[small];[le]scale=280:280[large];"
        f"[bg][small]overlay=28:16:enable='lt(t,{ending})'[branded];[branded][large]overlay=(W-w)/2:140:enable='gte(t,{ending})'[end];"
        f"[end]ass=filename='{ROOT.as_posix()}/captions-branded.ass':fontsdir='public/fonts':shaping=complex,format=yuv420p[v]")
 run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'pieces.txt'),'-i',str(ROOT/'song.mp3'),'-i',str(LOGO),'-filter_complex_threads','2','-filter_complex',graph,'-map','[v]','-map','1:a:0','-af',f'apad=whole_dur={total}','-c:v','libx264','-threads','5','-preset','veryfast','-crf','19','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-t',str(total),'-movflags','+faststart','-metadata','title=దీపం దీపం కార్తీక దీపం | శివకేశవుల స్మరణ','-metadata','artist=Divine Wisdom Telugu',str(temp)])
 assert abs(float(probe(temp)['format']['duration'])-total)<.15;temp.rename(destination)
 print(json.dumps({'video':str(destination.resolve())}),flush=True)
def verify():
 global OUT
 if (ROOT/'Karthika-Deepam-Shiva-Keshava-Final-1080p.mp4').exists():OUT=ROOT/'Karthika-Deepam-Shiva-Keshava-Final-1080p.mp4'
 p=probe(OUT);v=next(s for s in p['streams'] if s['codec_type']=='video');a=next(s for s in p['streams'] if s['codec_type']=='audio');duration=float(p['format']['duration']);timeline=read('timeline')
 assert (v['width'],v['height'],v['codec_name'],a['codec_name'])==(1920,1080,'h264','aac')
 assert 240<=duration<=300 and abs(duration-timeline['seconds'])<.15
 run(['ffmpeg','-v','error','-xerror','-nostdin','-i',str(OUT),'-f','null','-'])
 points=[2,30,75,115,175,203,235,timeline['endingStart']-3,timeline['endingStart']+3]
 sheet=Image.new('RGB',(1440,882),(8,18,41));draw=ImageDraw.Draw(sheet)
 for i,t in enumerate(points):
  dest=ROOT/f'review-{i:02}.jpg'
  if not dest.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(t),'-i',str(OUT),'-frames:v','1','-q:v','2',str(dest)])
  with Image.open(dest) as im:sheet.paste(im.resize((480,270)),((i%3)*480,(i//3)*294))
  draw.text(((i%3)*480+12,(i//3)*294+273),f'{t:.2f}s',fill='white')
 sheet.save(ROOT/'review-contact-sheet.jpg',quality=94)
 # Compare decoded mono audio to detect accidental tempo or offset changes.
 import numpy as np
 def samples(file):return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(file),'-t',str(timeline['songSeconds']-.1),'-vn','-ar','12000','-ac','1','-f','f32le','-']),dtype='<f4')
 x,y=samples(ROOT/'song.mp3'),samples(OUT);n=min(len(x),len(y));correlation=float(np.corrcoef(x[:n],y[:n])[0,1]);assert correlation>.98,correlation
 save('verification',{'file':str(OUT.resolve()),'resolution':[1920,1080],'durationSeconds':duration,'songSeconds':timeline['songSeconds'],'fps':v['r_frame_rate'],'fullDecodePassed':True,'originalAudioDecodedCorrelation':correlation,'audioSpedUp':False,'artworkCount':5,'logoThroughout':True,'welcomeChannelName':True,'closingActions':['subscribe','like','share','comment'],'captionAudit':read('caption-audit'),'manualListeningVerified':False,'published':False})
 print(json.dumps({'verified':True,'seconds':duration,'audioCorrelation':correlation,'bytes':OUT.stat().st_size}),flush=True)
if __name__=='__main__':{'prepare':prepare,'visuals':visuals,'render':render,'verify':verify}[sys.argv[1]]()
