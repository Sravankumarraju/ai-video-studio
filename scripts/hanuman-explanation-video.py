"""Original Telugu explanation: timestamped narration, complete coverage, local 1080p film."""
from pathlib import Path
import json,re,subprocess,sys,importlib.util,math
spec=importlib.util.spec_from_file_location('hanuman_video','scripts/hanuman-full-video.py');v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
ROOT=Path('data/productions/divine-wisdom/hanuman-chalisa/explanation-te-2026-10-06');v.ROOT=ROOT
read=v.read;save=v.save;run=v.run
def probe(file):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-of','json',str(file)]))['format']
def assemble(partial=False):
 config=read('episode');timeline=[];allwords=[];offset=0;concat=[];(ROOT/'audio-pieces').mkdir(exist_ok=True)
 for s in config['sections']:
  b=config['batches'][s['batch']];stem=f'voice-{b["index"]:02}';repair=f'repair-{s["index"]:02}'
  if partial and not (ROOT/(stem+'-alignment.json')).exists():break
  alignment=read(stem+'-alignment');assert ''.join(alignment['characters'])==b['text']
  starts=alignment['character_start_times_seconds'];ends=alignment['character_end_times_seconds'];j=b['sections'].index(s['index'])
  raw=ROOT/(stem+'.mp3');origin=0 if j==0 else starts[s['charStart']]
  end=float(probe(raw)['duration']) if j+1==len(b['sections']) else starts[config['sections'][b['sections'][j+1]]['charStart']]
  charoffset=s['charStart'];repaired=False
  if (ROOT/(repair+'-alignment.json')).exists():
   alignment=read(repair+'-alignment');assert ''.join(alignment['characters'])==s['text']
   starts=alignment['character_start_times_seconds'];ends=alignment['character_end_times_seconds'];raw=ROOT/(repair+'.mp3');origin=0;end=float(probe(raw)['duration']);charoffset=0;repaired=True
  words=[]
  for m in re.finditer(r'\S+',s['text']):
   a=charoffset+m.start();z=charoffset+m.end();words.append({'text':m.group(),'start':offset+min(starts[a:z])-origin,'end':offset+max(ends[a:z])-origin})
  issues=[w for w in words if w['end']-w['start']<.01]
  if issues and partial:break
  assert not issues,f'Incomplete section {s["index"]}; repair required'
  seconds=math.ceil((end-origin)*24)/24;assert seconds>0
  piece=ROOT/'audio-pieces'/f'section-{s["index"]:02}.wav'
  if not piece.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(origin),'-i',str(raw),'-af',f'aresample=48000,apad,atrim=duration={seconds}','-c:a','pcm_s24le',str(piece)])
  concat.append(f"file 'audio-pieces/section-{s['index']:02}.wav'")
  allwords+=words;timeline.append({**s,'section':s['title'],'start':offset,'end':offset+seconds,'image':f'../hanuman-{s["image"]}-v1.png','words':words,'repaired':repaired});offset+=seconds
 save('timeline',{'seconds':offset,'scenes':timeline});save('words',{'words':allwords})
 if partial:
  print(json.dumps({'partialSections':len(timeline),'seconds':offset}),flush=True);return
 (ROOT/'audio-concat.txt').write_text('\n'.join(concat)+'\n',encoding='utf8')
 joined=ROOT/'explanation-raw.wav'
 if not joined.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'audio-concat.txt'),'-c','copy',str(joined)])
 master=ROOT/'hanuman-chalisa-full-master.wav'
 if not master.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(joined),'-af','rubberband=tempo=1:pitch=1.0293022366:formant=preserved:channels=together,bass=g=2.5:f=110:w=0.7,equalizer=f=320:t=q:w=1:g=-1,equalizer=f=2400:t=q:w=1:g=1.3,loudnorm=I=-16:TP=-1.5:LRA=9','-ar','48000','-c:a','pcm_s24le',str(master)])
 mp3=ROOT/'hanuman-chalisa-telugu-explanation.mp3'
 if not mp3.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(master),'-c:a','libmp3lame','-b:a','256k',str(mp3)])
 save('timeline',{'seconds':offset,'scenes':timeline});save('words',{'words':allwords});print(json.dumps({'sections':len(timeline),'seconds':offset,'words':len(allwords)}),flush=True)
def captions():
 t=read('timeline');pages=[]
 for s in t['scenes']:
  lines=[[]];group=[]
  def close():
   nonlocal lines,group
   if group:pages.append({'start':max(s['start'],group[0]['start']),'end':min(s['end'],group[-1]['end']+.12),'lines':lines,'words':group,'section':s['section']})
   lines=[[]];group=[]
  for w in s['words']:
   if lines[-1] and (v.FONT.getlength(' '.join(x['text'] for x in lines[-1]+[w]))>1600 or len(lines[-1])>=5):
    if len(lines)==2:close()
    else:lines.append([])
   lines[-1].append(w);group.append(w)
   if len(group)>=8:close()
  close()
 for i,p in enumerate(pages):
  if i+1<len(pages):p['end']=min(p['end'],pages[i+1]['start'])
 def ass(scene=None):
  a=scene['start'] if scene else 0;z=scene['end'] if scene else t['seconds'];title=scene['section'] if scene else 'హనుమాన్ చాలీసా · పూర్తి తెలుగు అర్థం'
  h=v.ass_header().replace('Style: Title,Noto Sans Telugu,58','Style: Title,Noto Sans Telugu,48').replace('Style: Brand,Noto Sans,30','Style: Brand,Noto Sans,24')
  events=[f'Dialogue: 2,{v.time(0)},{v.time(z-a)},Title,,0,0,0,,{title}',f'Dialogue: 2,{v.time(0)},{v.time(z-a)},Brand,,0,0,0,,Divine Wisdom Telugu']
  for p in pages:
   if p['end']<=a or p['start']>=z:continue
   plain='\\N'.join(' '.join(w['text'] for w in line) for line in p['lines'])
   events.append(f'Dialogue: 0,{v.time(max(a,p["start"])-a)},{v.time(min(z,p["end"])-a)},Default,,0,0,0,,{plain}')
   for k,w in enumerate(p['words']):
    start=max(a,w['start']);end=min(z,w['end']+.03,p['end'])
    if k+1<len(p['words']):end=min(end,p['words'][k+1]['start'])
    if end<=start:continue
    text='\\N'.join(' '.join(('{\\c&H004AD5FF&}'+x['text']+'{\\c&H00FFFFFF&}') if x is w else x['text'] for x in line) for line in p['lines'])
    events.append(f'Dialogue: 1,{v.time(start-a)},{v.time(end-a)},Default,,0,0,0,,{text}')
  return h+'\n'.join(events)+'\n'
 (ROOT/'captions.ass').write_text(ass(),encoding='utf8')
 for s in t['scenes']:(ROOT/f'captions-{s["index"]:02}.ass').write_text(ass(s),encoding='utf8')
 def stamp(seconds):
  n=round(seconds*1000);return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
 (ROOT/'captions.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(p["start"])} --> {stamp(p["end"])}\n'+'\n'.join(' '.join(w['text'] for w in line) for line in p['lines']) for i,p in enumerate(pages))+'\n',encoding='utf8')
 save('captions',{'words':read('words')['words'],'pages':pages,'fontSize':104,'highlight':'#ffd54a'})
 issues=[w for w in read('words')['words'] if w['end']<=w['start']];save('caption-timing-check',{'words':len(read('words')['words']),'pages':len(pages),'zeroDurationWords':issues,'manualListeningVerified':False});assert not issues
 print(json.dumps({'pages':len(pages),'fontSize':104}),flush=True)
def render(finalize=True,begin=0):
 t=read('timeline');(ROOT/'video-pieces').mkdir(exist_ok=True);concat=[]
 for s in t['scenes']:
  index=s['index']
  if index<begin:continue
  seconds=s['end']-s['start'];frames=round(seconds*24);file=ROOT/'video-pieces'/f'{index:02}.mp4'
  if file.exists():
   try:valid=abs(float(probe(file)['duration'])-seconds)<.05
   except Exception:valid=False
   if not valid:
    backup=file.with_suffix('.interrupted.mp4');assert not backup.exists();file.rename(backup)
  if not file.exists():
   vf=f"scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,drawbox=x=0:y=742:w=iw:h=338:color=black@0.56:t=fill,drawbox=x=0:y=0:w=iw:h=118:color=black@0.30:t=fill,ass=filename='{ROOT.as_posix()}/captions-{index:02}.ass':fontsdir='public/fonts':shaping=complex,format=yuv420p"
   run(['ffmpeg','-hide_banner','-v','error','-nostdin','-n','-loop','1','-framerate','24','-i',str(ROOT/s['image']),'-vf',vf,'-frames:v',str(frames),'-an','-c:v','libx264','-threads','6','-preset','veryfast','-crf','19','-pix_fmt','yuv420p','-video_track_timescale','24000',str(file)])
  concat.append(f"file 'video-pieces/{index:02}.mp4'");print(json.dumps({'renderedScene':index+1,'totalScenes':len(t['scenes'])}),flush=True)
 if not finalize:return
 (ROOT/'video-concat.txt').write_text('\n'.join(concat)+'\n',encoding='utf8');target=ROOT/'hanuman-chalisa-telugu-explanation-1080p.mp4'
 if not target.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'video-concat.txt'),'-i',str(ROOT/'hanuman-chalisa-full-master.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','256k','-movflags','+faststart','-t',str(t['seconds']),str(target)])
 print(json.dumps({'video':str(target),'seconds':t['seconds']}),flush=True)
def verify():
 file=ROOT/'hanuman-chalisa-telugu-explanation-1080p.mp4';t=read('timeline');c=read('captions');info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(file)]));video=next(x for x in info['streams'] if x['codec_type']=='video');audio=next(x for x in info['streams'] if x['codec_type']=='audio')
 assert (video['width'],video['height'])==(1920,1080);assert audio['codec_name']=='aac';assert abs(float(info['format']['duration'])-t['seconds'])<.1
 assert [s['verseNumber'] for s in t['scenes'] if s.get('verseNumber')]==list(range(1,41))
 run(['ffmpeg','-v','error','-nostdin','-i',str(file),'-f','null','-'])
 for name,seconds in [('opening',12),('dhyanam',t['scenes'][5]['start']+5),('middle',t['seconds']/2),('ending',t['seconds']-15)]:
  out=ROOT/f'review-{name}.jpg'
  if not out.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(seconds),'-i',str(file),'-frames:v','1','-q:v','2',str(out)])
 save('verification',{'seconds':float(info['format']['duration']),'width':1920,'height':1080,'all40VerseMeanings':True,'openingDhyanamAndClosing':True,'fullDecodePassed':True,'scenes':len(t['scenes']),'captionWords':len(c['words']),'captionFontSize':104,'fullListeningVerified':False,'published':False})
 (ROOT/'chapters.txt').write_text('\n'.join(f'{int(s["start"])//60:02}:{int(s["start"])%60:02} {s["title"]}' for s in t['scenes'])+'\n',encoding='utf8');print(json.dumps(read('verification')),flush=True)
def partial():
 assemble(True);captions();render(False)
if __name__=='__main__':{'assemble':assemble,'captions':captions,'render':render,'verify':verify,'partial':partial,'tail':lambda:render(False,28)}[sys.argv[1]]()
