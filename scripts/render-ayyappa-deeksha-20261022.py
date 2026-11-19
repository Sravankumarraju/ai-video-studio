"""Resume-safe Ayyappa explainer assembly; original audio pacing and aligned Telugu captions."""
from pathlib import Path
import json,subprocess,re,math,sys
from PIL import Image,ImageDraw,ImageFont
ROOT=Path('data/productions/divine-wisdom/ayyappa-deeksha-2026-10-22')
FPS=24
OUT=ROOT/'Ayyappa-Deeksha-41-Days-Telugu-1080p.mp4'
def load(n):return json.loads((ROOT/f'{n}.json').read_text(encoding='utf8'))
def save(n,v):(ROOT/f'{n}.json').write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
def run(args):subprocess.run(args,check=True)
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]))
def astamp(t):
 n=round(t*100);return f'{n//360000}:{n//6000%60:02}:{n%6000//100:02}.{n%100:02}'
def sstamp(t,sep=','):
 n=round(t*1000);return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02}{sep}{n%1000:03}'
def header():return '''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Noto Sans Telugu,62,&H00FFFFFF,&H00FFFFFF,&H00100C09,&H90000000,0,0,0,0,100,100,0,0,1,2.5,1,2,110,110,85,1
Style: Title,Noto Sans Telugu,43,&H00FFFFFF,&H00FFFFFF,&H00100C09,&H90000000,0,0,0,0,100,100,0,0,1,1,1,7,155,80,37,1
Style: Brand,Noto Sans,22,&H00E6C782,&H00FFFFFF,&H00100C09,&H90000000,0,0,0,0,100,100,0,0,1,1,0,7,158,80,105,1
Style: Badge,Noto Sans Telugu,29,&H00E6C782,&H00FFFFFF,&H00100C09,&H90000000,0,0,0,0,100,100,0,0,1,1,0,9,60,65,39,1
Style: Call,Noto Sans Telugu,71,&H00FFFFFF,&H00FFFFFF,&H00100C09,&H90000000,0,0,0,0,100,100,0,0,1,2,1,5,100,100,0,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
def event(a,z,style,text,layer=0):return f'Dialogue: {layer},{astamp(a)},{astamp(z)},{style},,0,0,0,,{text}'
def prepare():
 plan=load('plan');scenes=[];words=[];pages=[];offset=0;issues=[]
 font=ImageFont.truetype('public/fonts/NotoSansTelugu.ttf',62)
 (ROOT/'audio-pieces').mkdir(exist_ok=True)
 # Omit two supplementary reflective passages to fit 7–9 minutes; keep all ritual facts.
 omitted={'daily-vow','journey'}
 save('edit-decisions',{'omittedSectionIds':sorted(omitted),'reason':'Fit requested 7–9 minutes at original narration speed; omit only supplementary reflective passages. All practice, variation, interpretation and evidence distinctions retained.'})
 for section in [s for s in plan['sections'] if s['id'] not in omitted]:
  i=section['index'];stem=f'voice-{i:02}';a=load(stem+'-alignment');text=section['text'];assert ''.join(a['characters'])==text,f'Text mismatch {i}'
  starts=a['character_start_times_seconds'];ends=a['character_end_times_seconds'];duration=float(probe(ROOT/(stem+'.mp3'))['format']['duration'])
  # Provider character alignment can extend slightly past MP3 container duration.
  seconds=math.ceil((max(duration,max(ends))+.5)*FPS)/FPS
  local=[]
  for match in re.finditer(r'\S+',text):
   first,last=match.span();start=min(starts[first:last]);end=max(ends[first:last]);assert end<=seconds
   if end-start<.015:issues.append({'section':i,'word':match.group(),'start':start,'end':end})
   local.append({'text':match.group(),'start':start,'end':end})
  scene={**section,'start':offset,'end':offset+seconds,'seconds':seconds,'words':local};scenes.append(scene)
  group=[];lines=[[]]
  def close():
   nonlocal group,lines
   if group:
    pages.append({'section':i,'start':offset+group[0]['start'],'end':min(offset+seconds,offset+group[-1]['end']+.12),'text':'\n'.join(' '.join(w['text'] for w in line) for line in lines),'words':[{**w,'start':offset+w['start'],'end':offset+w['end']} for w in group]})
   group=[];lines=[[]]
  for w in local:
   candidate=' '.join(x['text'] for x in lines[-1]+[w])
   if lines[-1] and (font.getlength(candidate)>1640 or len(lines[-1])>=6):
    if len(lines)==2:close()
    else:lines.append([])
   lines[-1].append(w);group.append(w)
   if len(group)>=10 or (len(group)>=4 and re.search(r'[.!?]$',w['text'])):close()
  close()
  words.extend({**w,'start':offset+w['start'],'end':offset+w['end']} for w in local)
  piece=ROOT/'audio-pieces'/f'{i:02}.wav'
  if not piece.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT/(stem+'.mp3')),'-af',f'aresample=48000,apad,atrim=duration={seconds}','-ac','2','-c:a','pcm_s16le',str(piece)])
  offset+=seconds
 assert not issues,f'Compressed or zero-length words require review: {issues}'
 for j,p in enumerate(pages):
  if j+1<len(pages):p['end']=min(p['end'],pages[j+1]['start'])
  assert p['end']>p['start']
 for s in scenes:
  events=[event(0,s['seconds'],'Title',s['title']),event(0,s['seconds'],'Brand','DIVINE WISDOM TELUGU'),event(0,s['seconds'],'Badge',s['classification'])]
  if s['id']=='welcome':events.append(event(.2,8,'Call',r'{\pos(960,625)\fs55\fad(300,400)}డివైన్ విజ్డమ్ తెలుగు\Nఛానల్‌కు స్వాగతం'))
  if s['id']=='closing':
   events.append(event(max(0,s['seconds']-24),s['seconds'],'Call',r'{\pos(960,585)\fs68\fad(300,300)}సబ్‌స్క్రైబ్ చేయండి\N{\fs39}లైక్  •  షేర్  •  కామెంట్'))
  for p in pages:
   if p['section']==s['index']:events.append(event(p['start']-s['start'],p['end']-s['start'],'Caption',p['text'].replace('\n',r'\N')))
  (ROOT/f'captions-{s["index"]:02}.ass').write_text(header()+'\n'.join(events)+'\n',encoding='utf8')
 srt='\n\n'.join(f'{i+1}\n{sstamp(p["start"])} --> {sstamp(p["end"])}\n{p["text"]}' for i,p in enumerate(pages))+'\n'
 (ROOT/'telugu-captions.srt').write_text(srt,encoding='utf8')
 (ROOT/'telugu-captions.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(f'{sstamp(p["start"],".")} --> {sstamp(p["end"],".")}\n{p["text"]}' for p in pages)+'\n',encoding='utf8')
 (ROOT/'audio-concat.txt').write_text('\n'.join(f"file 'audio-pieces/{s['index']:02}.wav'" for s in scenes)+'\n',encoding='utf8')
 master=ROOT/'narration-master.wav'
 if not master.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'audio-concat.txt'),'-af','loudnorm=I=-16:TP=-1.5:LRA=9','-ar','48000','-ac','2','-c:a','pcm_s16le',str(master)])
 save('timeline',{'seconds':offset,'fps':FPS,'scenes':scenes});save('captions',{'pages':pages,'words':words});save('caption-audit',{'issues':issues,'exactSourceText':True,'wordCount':len(words),'phraseCount':len(pages),'timingSource':'ElevenLabs character alignment','manualListeningVerified':False})
 print(json.dumps({'stage':'prepared','seconds':offset,'words':len(words),'pages':len(pages)}),flush=True)
def render():
 t=load('timeline');(ROOT/'video-pieces').mkdir(exist_ok=True)
 for s in t['scenes']:
  i=s['index'];dest=ROOT/'video-pieces'/f'{i:02}.mp4';n=round(s['seconds']*FPS)
  if dest.exists():
   if abs(float(probe(dest)['format']['duration'])-s['seconds'])<.06:continue
   raise RuntimeError(f'Existing incomplete segment needs review: {dest}')
  assert (ROOT/'art'/f'{s["image"]}.png').exists(),f'Missing image {s["image"]}'
  zoom=f'1.01+0.035*on/{n}' if i%2==0 else f'1.045-0.035*on/{n}'
  vf=f"[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='{zoom}':x='(iw-iw/zoom)*0.5':y='(ih-ih/zoom)*0.4':d={n}:s=1920x1080:fps={FPS},setsar=1,drawbox=x=0:y=0:w=iw:h=145:color=black@0.58:t=fill,drawbox=x=0:y=805:w=iw:h=275:color=black@0.66:t=fill,ass=filename='{ROOT.as_posix()}/captions-{i:02}.ass':fontsdir='public/fonts':shaping=complex[base];[1:v]scale=100:100[logo];[base][logo]overlay=30:22,fade=t=in:st=0:d=0.25,fade=t=out:st={s['seconds']-.25}:d=0.25,format=yuv420p[v]"
  run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT/'art'/f'{s["image"]}.png'),'-i',str(ROOT/'channel-logo.png'),'-filter_complex_threads','2','-filter_complex',vf,'-map','[v]','-frames:v',str(n),'-an','-c:v','libx264','-threads','4','-preset','veryfast','-crf','19','-video_track_timescale','24000',str(dest)])
  print(json.dumps({'renderedScene':i+1,'totalScenes':len(t['scenes'])}),flush=True)
 (ROOT/'video-concat.txt').write_text('\n'.join(f"file 'video-pieces/{s['index']:02}.mp4'" for s in t['scenes'])+'\n',encoding='utf8')
 if not OUT.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'video-concat.txt'),'-i',str(ROOT/'narration-master.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-t',str(t['seconds']),'-movflags','+faststart','-metadata','title=అయ్యప్ప దీక్ష ఎందుకు? — 41 రోజుల ఆచారం, అర్థం',str(OUT)])
 print(json.dumps({'stage':'rendered','file':str(OUT)}),flush=True)
def verify():
 t=load('timeline');p=probe(OUT);v=next(s for s in p['streams'] if s['codec_type']=='video');a=next(s for s in p['streams'] if s['codec_type']=='audio');seconds=float(p['format']['duration'])
 assert (v['width'],v['height'],v['codec_name'],a['codec_name'])==(1920,1080,'h264','aac');assert abs(seconds-t['seconds'])<.1
 run(['ffmpeg','-v','error','-xerror','-nostdin','-i',str(OUT),'-f','null','-'])
 assert len(list((ROOT/'art').glob('*.png')))==5
 font=ImageFont.truetype('public/fonts/NotoSans.ttf',18);sheet=Image.new('RGB',(1440,4*294),(13,18,27));d=ImageDraw.Draw(sheet)
 picks=sorted(set(round(j*(len(t['scenes'])-1)/11) for j in range(12)))
 for j,i in enumerate(picks):
  s=t['scenes'][i];when=s['start']+min(s['seconds']*.5,18);dest=ROOT/f'review-{i:02}.jpg'
  if not dest.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(when),'-i',str(OUT),'-frames:v','1','-q:v','2',str(dest)])
  with Image.open(dest) as im:sheet.paste(im.resize((480,270)),((j%3)*480,(j//3)*294))
  d.text(((j%3)*480+10,(j//3)*294+272),f'{when:.1f}s | {s["id"]}',font=font,fill='white')
 sheet.save(ROOT/'video-review-contact-sheet.jpg',quality=93)
 save('VERIFICATION',{'file':str(OUT.resolve()),'seconds':seconds,'resolution':[1920,1080],'videoCodec':v['codec_name'],'audioCodec':a['codec_name'],'fullDecodePassed':True,'fiveIllustrations':True,'originalChannelLogo':True,'welcomeChannelName':True,'closingSubscribeLikeShareComment':True,'captionAudit':load('caption-audit'),'naturalAudioSpeed':True,'targetRangeMet':420<=seconds<=540,'published':False,'manualListeningVerified':False})
 print(json.dumps({'verified':True,'seconds':seconds,'targetRangeMet':420<=seconds<=540,'bytes':OUT.stat().st_size}),flush=True)
if __name__=='__main__':{'prepare':prepare,'render':render,'verify':verify}[sys.argv[1]]()

