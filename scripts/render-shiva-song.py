"""Resumable 1080p Shiva song video, original audio and acoustically timed Telugu captions."""
from pathlib import Path
import json,subprocess,sys,math
from PIL import ImageFont
ROOT=Path('data/productions/divine-wisdom/shiva-tandavam-2026-10-15')
FPS=24
DURATION=180.245
def read(n):return json.loads((ROOT/f'{n}.json').read_text(encoding='utf8'))
def save(n,v):(ROOT/f'{n}.json').write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
def run(args):subprocess.run(args,check=True)
def stamp(t):
 n=round(t*100);return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'
def srtstamp(t):
 n=round(t*1000);return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
HEADER='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Noto Sans Telugu,94,&H00FFFFFF,&H00FFFFFF,&H0020140C,&H90000000,0,0,0,0,100,100,0,0,1,3,1,2,110,110,68,1
Style: Title,Noto Sans Telugu,78,&H007CE2FF,&H007CE2FF,&H0020140C,&H90000000,0,0,0,0,100,100,0,0,1,2,1,2,100,100,116,1
Style: Small,Noto Sans Telugu,35,&H00FFFFFF,&H00FFFFFF,&H0020140C,&H90000000,0,0,0,0,100,100,0,0,1,1,1,2,100,100,64,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
def prepare():
 words=[w for w in read('align')['words'] if w['text'].strip()]
 lines=read('performed-lines');offset=0;captions=[];font=ImageFont.truetype('public/fonts/NotoSansTelugu.ttf',94)
 for i,line in enumerate(lines):
  n=len(line['text'].split());ws=words[offset:offset+n];offset+=n
  assert ''.join(w['text'] for w in ws)==''.join(line['text'].split())
  # Withhold active-word flashes for tokens below perceptible duration; retain their lyric text.
  line={**line,'start':ws[0]['start'],'end':ws[-1]['end'],'words':ws,'index':i}
  line['fontSize']=94 if font.getlength(line['text'])<1680 else 84
  captions.append(line)
 assert offset==len(words)
 for i,c in enumerate(captions):
  c['displayEnd']=min(c['end']+.32,captions[i+1]['start']-.025 if i+1<len(captions) else DURATION)
  assert c['displayEnd']>c['start']
 events=[]
 def event(layer,a,b,style,text):return f'Dialogue: {layer},{stamp(a)},{stamp(b)},{style},,0,0,0,,{text}'
 events.append(event(1,.7,9.6,'Title',r'{\fad(650,700)}నా గుండె చప్పుడు\Nశివ తాండవం'))
 events.append(event(1,.7,9.6,'Small',r'{\fad(650,700)}శివ భక్తి గీతం'))
 events.append(event(1,175.5,180.1,'Title',r'{\fad(650,1000)}ఓం నమః శివాయ'))
 skipped=[]
 for c in captions:
  size='{\\fs'+str(c['fontSize'])+'}'
  events.append(event(0,c['start'],c['displayEnd'],'Caption',size+c['text']))
  for k,w in enumerate(c['words']):
   if w['end']-w['start']<.07:
    skipped.append({'text':w['text'],'start':w['start'],'seconds':w['end']-w['start']});continue
   a=w['start'];b=min(w['end']+.025,c['displayEnd'],c['words'][k+1]['start'] if k+1<len(c['words']) else c['displayEnd'])
   if b-a<.02:continue
   text=' '.join((r'{\c&H007CE2FF&}'+x['text']+r'{\c&H00FFFFFF&}') if j==k else x['text'] for j,x in enumerate(c['words']))
   events.append(event(1,a,b,'Caption',size+text))
 (ROOT/'captions.ass').write_text(HEADER+'\n'.join(events)+'\n',encoding='utf8')
 srt='\n\n'.join(f'{i+1}\n{srtstamp(c["start"])} --> {srtstamp(c["displayEnd"])}\n{c["text"]}' for i,c in enumerate(captions))+'\n'
 (ROOT/'captions-te.srt').write_text(srt,encoding='utf8')
 (ROOT/'captions-te.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(f'{srtstamp(c["start"]).replace(",",".")} --> {srtstamp(c["displayEnd"]).replace(",",".")}\n{c["text"]}' for c in captions)+'\n',encoding='utf8')
 save('captions',captions)
 save('caption-audit',{'captionLines':len(captions),'captionWords':len(words),'withheldSub70msWordFlashes':skipped,'timing':'ElevenLabs Scribe transcription checked against supplied lyrics, then forced alignment','manualListeningVerified':False,'fontSizeRange':[84,94],'shaping':'libass complex shaping with bundled Noto Sans Telugu'})
 # All edits land on sung phrase starts or the beginning of an instrumental break.
 cuts=[(0,'kailash-meditation'),(11.52,'ganga-blessing'),(23.12,'kailash-meditation'),(32.9,'tandavam-fire'),(43.34,'tandavam-fire'),(51.9,'tandavam-fire'),(60.5,'ganga-blessing'),(70.14,'ganga-blessing'),(79.68,'devotee-courage'),(90.6,'kailash-meditation'),(100.12,'tandavam-fire'),(110.56,'tandavam-fire'),(114.98,'devotee-courage'),(124.9,'devotee-courage'),(134.26,'tandavam-fire'),(144.16,'tandavam-fire'),(149.1,'ganga-blessing'),(155.2,'kailash-meditation'),(168.5,'ganga-blessing'),(175.1,'kailash-meditation')]
 total_frames=math.ceil(DURATION*FPS)
 scenes=[]
 for i,(start,image) in enumerate(cuts):
  first=round(start*FPS);last=round(cuts[i+1][0]*FPS) if i+1<len(cuts) else total_frames
  scenes.append({'index':i,'start':first/FPS,'end':last/FPS,'frames':last-first,'image':image+'.png','motion':'zoom-in' if i%2==0 else 'zoom-out','focalX':.48 if i%3 else .53,'focalY':.42})
 save('timeline',{'seconds':DURATION,'fps':FPS,'frames':total_frames,'scenes':scenes})
 print(json.dumps({'captions':len(captions),'scenes':len(scenes),'shortHighlightTokensSkipped':len(skipped)}),flush=True)
def visuals():
 (ROOT/'pieces').mkdir(exist_ok=True)
 for s in read('timeline')['scenes']:
  out=ROOT/'pieces'/f'{s["index"]:02}.mp4'
  if out.exists():continue
  assert (ROOT/s['image']).exists(),s['image']
  frames=s['frames'];u=f'(on/{frames-1})';ease=f'({u}*{u}*(3-2*{u}))'
  z=f'1.01+0.055*{ease}' if s['index']%2==0 else f'1.065-0.055*{ease}'
  vf=f"scale=2560:1440:force_original_aspect_ratio=increase,crop=2560:1440,zoompan=z='{z}':x='(iw-iw/zoom)*{s['focalX']}':y='(ih-ih/zoom)*{s['focalY']}':d={frames}:s=1920x1080:fps={FPS},setsar=1,format=yuv420p"
  if s['index']==0:vf+=',fade=t=in:st=0:d=0.7'
  if s['index']==19:vf+=f",fade=t=out:st={frames/FPS-1.3}:d=1.3"
  run(['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-n','-i',str(ROOT/s['image']),'-vf',vf,'-frames:v',str(frames),'-an','-c:v','libx264','-threads','4','-preset','veryfast','-crf','18','-video_track_timescale','24000',str(out)])
  print(json.dumps({'visualScene':s['index']+1,'of':20}),flush=True)
 (ROOT/'pieces.txt').write_text('\n'.join(f"file 'pieces/{s['index']:02}.mp4'" for s in read('timeline')['scenes'])+'\n',encoding='utf8')
def render():
 out=ROOT/'shiva-tandavam-telugu-1080p.mp4'
 if out.exists():raise RuntimeError('Final output exists; inspect before replacing')
 vf=f"ass=filename='{ROOT.as_posix()}/captions.ass':fontsdir='public/fonts':shaping=complex"
 run(['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'pieces.txt'),'-i',str(ROOT/'song-original.m4a'),'-map','0:v:0','-map','1:a:0','-vf',vf,'-c:v','libx264','-threads','6','-preset','fast','-crf','18','-c:a','copy','-t',str(DURATION),'-movflags','+faststart',str(out)])
 print(json.dumps({'video':str(out)}),flush=True)
def frames():
 file=ROOT/'shiva-tandavam-telugu-1080p.mp4'
 for i,t in enumerate([5,13,34,49,67,82,105,119,138,159,170,177]):
  out=ROOT/f'review-{i:02}-{t}s.jpg'
  if not out.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(t),'-i',str(file),'-frames:v','1','-q:v','2',str(out)])
def verify():
 file=ROOT/'shiva-tandavam-telugu-1080p.mp4';info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(file)]))
 v=next(s for s in info['streams'] if s['codec_type']=='video');a=next(s for s in info['streams'] if s['codec_type']=='audio')
 assert (v['width'],v['height'])==(1920,1080);assert v['codec_name']=='h264' and a['codec_name']=='aac'
 assert abs(float(info['format']['duration'])-DURATION)<.1
 run(['ffmpeg','-v','error','-nostdin','-i',str(file),'-f','null','-'])
 # Packet-level comparison proves the AAC audio was carried through without a remix/re-encode.
 def audiohash(f):return subprocess.check_output(['ffmpeg','-v','error','-i',str(f),'-map','0:a:0','-c','copy','-f','hash','-hash','sha256','-']).decode().strip()
 original_hash=audiohash(ROOT/'song-original.m4a');export_hash=audiohash(file);assert original_hash==export_hash
 save('verification',{'width':v['width'],'height':v['height'],'seconds':float(info['format']['duration']),'fps':v['r_frame_rate'],'fullDecodePassed':True,'originalAudioPacketsUnchanged':True,'audioSHA256':export_hash,'captionLines':len(read('captions')),'originalGeneratedIllustrations':4,'cameraShots':20,'manualListeningVerified':False,'published':False})
 print(json.dumps(read('verification')),flush=True)
if __name__=='__main__':{'prepare':prepare,'visuals':visuals,'render':render,'frames':frames,'verify':verify}[sys.argv[1]]()
