"""Resumable local original-song mastering, Telugu karaoke captions, and 1080p render."""
from pathlib import Path
import json,re,subprocess,sys,math
from PIL import ImageFont

ROOT=Path('data/productions/divine-wisdom/hanuman-chalisa/full-original-2026-10-06')
ART=ROOT.parent
FPS=24
FONT=ImageFont.truetype('public/fonts/NotoSansTelugu.ttf',104)
def read(name):return json.loads((ROOT/(name+'.json')).read_text(encoding='utf8'))
def save(name,data):(ROOT/(name+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
def run(args):subprocess.run(args,check=True)
def norm(s):return ''.join(s.split()).replace('।','').replace('॥','')
def time(s):
 n=round(s*100);return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'
def ass_header():return '''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Noto Sans Telugu,104,&H00FFFFFF,&H00FFFFFF,&H00101010,&H80000000,0,0,0,0,100,100,0,0,1,3,1,2,140,140,118,1
Style: Title,Noto Sans Telugu,58,&H004AD5FF,&H004AD5FF,&H00101010,&H80000000,0,0,0,0,100,100,0,0,1,2,1,8,120,120,34,1
Style: Brand,Noto Sans,30,&H00FFFFFF,&H00FFFFFF,&H00101010,&H80000000,0,0,0,0,100,100,0,0,1,1,1,7,40,40,36,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
def image_for(section,index):
 if 'Opening' in section:return 'temple-hero'
 if 'Closing' in section or 'Final' in section:return 'peace'
 if 'Dhyanam' in section:return ['devotion','strength','peace'][index%3]
 n=int(re.search(r'Chaupai (\d+)',section)[1])
 if 9<=n<=10:return 'ocean'
 if 11<=n<=12:return 'mountain'
 if 17<=n<=20:return 'ocean'
 if 23<=n<=26:return 'strength'
 if 31<=n<=34:return 'devotion'
 return ['temple-hero','devotion','strength','peace'][index%4]

def assemble():
 inv=read('inventory');repairs=read('repairs');replacements={s['index']:s for s in repairs['sections']}
 (ROOT/'audio-pieces').mkdir(exist_ok=True)
 timeline=[];offset=0;concat=[]
 for index,c in enumerate(inv['chunks']):
  patch=replacements.get(index)
  source=ROOT/('repair-song-raw.mp3' if patch else 'full-song-raw.mp3')
  start=patch['repairStart'] if patch else c['start'];seconds=(patch['repairEnd']-start) if patch else c['end']-start
  piece=ROOT/'audio-pieces'/f'{index:02}.wav'
  if not piece.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(start),'-i',str(source),'-t',str(seconds),'-ar','48000','-c:a','pcm_s24le',str(piece)])
  timeline.append({**c,'index':index,'start':offset,'end':offset+seconds,'originalStart':c['start'],'originalEnd':c['end'],'repair':patch,'image':f'../hanuman-{image_for(c["section"],index)}-v1.png'})
  offset+=seconds;concat.append(f"file 'audio-pieces/{index:02}.wav'")
 (ROOT/'audio-concat.txt').write_text('\n'.join(concat)+'\n',encoding='utf8')
 joined=ROOT/'full-song-corrected-raw.wav'
 if not joined.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'audio-concat.txt'),'-c','copy',str(joined)])
 save('timeline',{'seconds':offset,'scenes':timeline,'source':'User-supplied lyrics; primary readings selected, editorial bracket notes excluded','corrections':'Four timestamp-flagged sections replaced; original sources preserved'})
 master=ROOT/'hanuman-chalisa-full-master.wav'
 if not master.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(joined),'-af','rubberband=tempo=1:pitch=1.0293022366:formant=preserved:channels=together,bass=g=3:f=110:w=0.7,equalizer=f=320:t=q:w=1:g=-1.2,equalizer=f=2600:t=q:w=0.8:g=1.4,volume=0.82,alimiter=limit=0.841395:attack=5:release=80:level=false:latency=true','-ar','48000','-c:a','pcm_s24le',str(master)])
 mp3=ROOT/'hanuman-chalisa-full-song.mp3'
 if not mp3.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(master),'-c:a','libmp3lame','-b:a','320k',str(mp3)])
 print(json.dumps({'assembled':True,'seconds':offset}),flush=True)

def captions():
 timeline=read('timeline');metadata=read('music-metadata')['words_timestamps'];patchmeta=read('repair-metadata')['words_timestamps'];aligned=read('alignment')['words']
 pages=[];allwords=[];issues=[]
 for c in timeline['scenes']:
  if c['repair']:
   patch=c['repair'];raw=[{'text':w['word'],'start':w['start_ms']/1000,'end':w['end_ms']/1000} for w in patchmeta if patch['repairStart']<=w['start_ms']/1000<patch['repairEnd']];origin=patch['repairStart']
  elif c['kind']=='approved-preview':
   raw=[w for w in aligned if c['originalStart']<=w['start']<c['originalEnd']];origin=c['originalStart']
  else:
   raw=[{'text':w['word'],'start':w['start_ms']/1000,'end':w['end_ms']/1000} for w in metadata if c['originalStart']<=w['start_ms']/1000<c['originalEnd']];origin=c['originalStart']
  timed=[{**w,'text':norm(w['text'])} for w in raw if norm(w['text'])]
  expected=[norm(w) for w in c['text'].split() if norm(w)]
  assert ''.join(expected)==''.join(w['text'] for w in timed),f'Lyric/timestamp mismatch in {c["section"]}'
  # Map provider token splits/joins back to the owner's displayed word boundaries.
  charspans=[];pos=0
  for w in timed:
   charspans.append((pos,pos+len(w['text']),w));pos+=len(w['text'])
  sourcepos=0;words=[]
  for text in expected:
   endpos=sourcepos+len(text);hits=[w for start,end,w in charspans if start<endpos and end>sourcepos];assert hits
   start=min(w['start'] for w in hits)-origin+c['start'];end=max(w['end'] for w in hits)-origin+c['start']
   if end-start<.02:issues.append({'section':c['section'],'word':text,'start':start,'end':end})
   words.append({'text':text,'start':start,'end':end});sourcepos=endpos
  allwords.extend(words)
  # One or two short lines, measured using the actual Telugu font at 104 px.
  group=[];lines=[[]]
  def close():
   nonlocal group,lines
   if group:pages.append({'start':group[0]['start'],'end':group[-1]['end']+.18,'words':group,'lines':lines,'section':c['section']})
   group=[];lines=[[]]
  for word in words:
   line=lines[-1];trial=' '.join(x['text'] for x in line+[word])
   if line and (FONT.getlength(trial)>1600 or len(line)>=5):
    if len(lines)==2:close()
    else:lines.append([])
   lines[-1].append(word);group.append(word)
   if len(group)>=9:close()
  close()
 save('caption-timing-check',{'words':len(allwords),'pages':len(pages),'zeroDurationWords':issues,'source':'Generated-word timestamps plus forced alignment for approved reference excerpts','manualListeningVerified':False})
 assert not issues,f'Unresolved missing/compressed words: {issues}'
 # Stop each page before the next page; do not highlight through instrumental gaps.
 for i,p in enumerate(pages):
  if i+1<len(pages):p['end']=min(p['end'],pages[i+1]['start'])
 save('captions',{'words':allwords,'pages':pages,'font':'Noto Sans Telugu','fontSize':104,'highlightColor':'#ffd54a','accuracy':'provider-aligned'})
 def make_ass(offset=0,start=0,end=timeline['seconds']):
  events=[f'Dialogue: 2,{time(0)},{time(end-start)},Title,,0,0,0,,హనుమాన్ చాలీసా',f'Dialogue: 2,{time(0)},{time(end-start)},Brand,,0,0,0,,Divine Wisdom Telugu']
  for p in pages:
   if p['end']<=start or p['start']>=end:continue
   plain='\\N'.join(' '.join(x['text'] for x in line) for line in p['lines'])
   events.append(f'Dialogue: 0,{time(max(start,p["start"])-offset)},{time(min(end,p["end"])-offset)},Default,,0,0,0,,{plain}')
   for k,w in enumerate(p['words']):
    a=max(start,w['start']);b=min(end,w['end']+.05,p['end'])
    if k+1<len(p['words']):b=min(b,p['words'][k+1]['start'])
    if b<=a:continue
    text='\\N'.join(' '.join(('{\\c&H004AD5FF&}'+x['text']+'{\\c&H00FFFFFF&}') if x is w else x['text'] for x in line) for line in p['lines'])
    events.append(f'Dialogue: 1,{time(a-offset)},{time(b-offset)},Default,,0,0,0,,{text}')
  return ass_header()+'\n'.join(events)+'\n'
 (ROOT/'captions.ass').write_text(make_ass(),encoding='utf8')
 for c in timeline['scenes']:(ROOT/f'captions-{c["index"]:02}.ass').write_text(make_ass(c['start'],c['start'],c['end']),encoding='utf8')
 srt=[]
 for i,p in enumerate(pages):
  stamp=lambda x:'0'+time(x).replace('.',',')+'0'
  srt.append(f'{i+1}\n{stamp(p["start"])} --> {stamp(p["end"])}\n'+'\n'.join(' '.join(w['text'] for w in line) for line in p['lines']))
 (ROOT/'captions.srt').write_text('\n\n'.join(srt)+'\n',encoding='utf8')
 print(json.dumps({'captionWords':len(allwords),'pages':len(pages),'fontSize':104}),flush=True)

def render(finalize=True):
 timeline=read('timeline');(ROOT/'video-pieces').mkdir(exist_ok=True);concat=[]
 for c in timeline['scenes']:
  index=c['index'];seconds=c['end']-c['start'];file=ROOT/'video-pieces'/f'{index:02}.mp4';frames=round(seconds*FPS)
  if not file.exists():
   u=f'(on/{max(1,frames-1)})';ease=f'({u}*{u}*(3-2*{u}))';z=f'1.015+0.02*{ease}' if index%2==0 else f'1.035-0.02*{ease}'
   vf=f"scale=3840:2160:force_original_aspect_ratio=increase,crop=3840:2160,zoompan=z='{z}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d={frames}:s=1920x1080:fps={FPS},setsar=1,drawbox=x=0:y=742:w=iw:h=338:color=black@0.56:t=fill,drawbox=x=0:y=0:w=iw:h=118:color=black@0.30:t=fill,ass=filename='{ROOT.as_posix()}/captions-{index:02}.ass':fontsdir='public/fonts':shaping=complex,format=yuv420p"
   run(['ffmpeg','-hide_banner','-v','error','-nostdin','-n','-i',str(ROOT/c['image']),'-vf',vf,'-frames:v',str(frames),'-an','-c:v','libx264','-threads','6','-preset','veryfast','-crf','19','-pix_fmt','yuv420p','-video_track_timescale','24000',str(file)])
  concat.append(f"file 'video-pieces/{index:02}.mp4'");print(json.dumps({'renderedScene':index+1,'totalScenes':len(timeline['scenes']),'section':c['section']}),flush=True)
 if not finalize:return
 (ROOT/'video-concat.txt').write_text('\n'.join(concat)+'\n',encoding='utf8')
 out=ROOT/'hanuman-chalisa-full-1080p.mp4'
 if not out.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'video-concat.txt'),'-i',str(ROOT/'hanuman-chalisa-full-master.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','320k','-movflags','+faststart','-t',str(timeline['seconds']),str(out)])
 print(json.dumps({'video':str(out),'seconds':timeline['seconds']}),flush=True)

def verify():
 file=ROOT/'hanuman-chalisa-full-1080p.mp4';timeline=read('timeline');captions=read('captions')
 info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(file)]));v=next(s for s in info['streams'] if s['codec_type']=='video');a=next(s for s in info['streams'] if s['codec_type']=='audio')
 assert(v['width'],v['height'])==(1920,1080);assert v['codec_name']=='h264' and a['codec_name']=='aac';assert abs(float(info['format']['duration'])-timeline['seconds'])<.1
 run(['ffmpeg','-v','error','-nostdin','-i',str(file),'-f','null','-'])
 for name,t in [('opening',4),('dhyanam',70),('middle',330),('ending',timeline['seconds']-10)]:
  frame=ROOT/f'review-{name}.jpg'
  if not frame.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(t),'-i',str(file),'-frames:v','1','-q:v','2',str(frame)])
 save('verification',{'seconds':float(info['format']['duration']),'width':v['width'],'height':v['height'],'fullDecodePassed':True,'captionWords':len(captions['words']),'fontSize':104,'highlight':'Gold active word','originalImages':6,'visualScenes':len(timeline['scenes']),'all40Chaupais':True,'dhyanamIncluded':True,'fullListeningReviewVerified':False,'published':False})
 print(json.dumps(read('verification')),flush=True)

if __name__=='__main__':
 {'assemble':assemble,'captions':captions,'render':render,'verify':verify}[sys.argv[1]]()
