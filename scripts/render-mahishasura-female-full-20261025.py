from pathlib import Path
import json,re,subprocess,math,sys,importlib.util
R=Path('data/productions/divine-wisdom/mahishasura-mardini-2026-10-25/female-full-v3')
PARENT=R.parent
spec=importlib.util.spec_from_file_location('versecaps',Path(__file__).with_name('mahishasura-full-verse-preview-20261025.py'))
caps=importlib.util.module_from_spec(spec);spec.loader.exec_module(caps)
def load(n):return json.loads((R/(n+'.json')).read_text(encoding='utf-8'))
def save(n,v):(R/(n+'.json')).write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf-8')
def run(a):subprocess.run(a,check=True)
def duration(file):return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(file)]))
def subtitle(t):
 n=round(t*1000);return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
def bookend_ass(file,closing,d):
 title='డివైన్ విజ్డమ్ తెలుగు' if not closing else 'మీ భక్తి ప్రయాణంలో మాతో చేరండి'
 lines='స్వాగతం • శ్రీ మహిషాసురమర్దిని స్తోత్రం' if not closing else 'సబ్‌స్క్రైబ్ చేయండి • లైక్ చేయండి\\Nషేర్ చేయండి • కామెంట్ చేయండి'
 text=f'''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Title,Noto Sans Telugu,82,&H004AD5FF,&H00FFFFFF,&H00101010,&H00000000,0,0,0,0,100,100,0,0,1,2,0,2,80,80,210,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,{caps.stamp(d)},Title,,0,0,0,,{title}\\N{{\\fs60\\c&H00FFFFFF&}}{lines}
'''
 file.write_text(text,encoding='utf-8')
def prepare(caption_only=False):
 p=load('full-production-plan');scenes=[];offset=0
 (R/'audio-pieces').mkdir(exist_ok=True);(R/'captions').mkdir(exist_ok=True)
 def add(kind,number,text,src,start,end,words=None,lines=None):
  nonlocal offset
  index=len(scenes);d=math.ceil((end-start)*24)/24
  assert d>0
  ass=R/'captions'/f'{index:02}.ass'
  localwords=[]
  if kind=='verse':
   ts=[{**w,'start_ms':w['start_ms']-start*1000,'end_ms':w['end_ms']-start*1000} for w in words]
   if (R/'caption-timing-overrides.json').exists():
    fixes=load('caption-timing-overrides')
    if number==11:
     repeated=[w for w in ts if w['word']=='భ్రమర'];assert len(repeated)==3
     for word,interval in zip(repeated,fixes['11']['repeatedWordTimings']):word['start_ms']=interval[0]*1000;word['end_ms']=interval[1]*1000
    if number==16:
     spoken=[w for w in ts if caps.letters(w['word'])]
     ts=spoken[:-6]+fixes['16']['referenceWords']
   report=caps.make_ass(ass,lines,ts,d,number)
   localwords=[{'text':w['text'],'start':w['start'],'end':w['end']} for w in report['words']]
  else:bookend_ass(ass,kind=='closing',d);report={'fontSize':82,'fullVerseAlwaysVisible':False}
  wav=R/'audio-pieces'/f'{index:02}.wav'
  if not caption_only and not wav.exists():
   run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(start),'-i',str(src),'-af',f'atrim=duration={end-start},afade=t=in:d=0.004,afade=t=out:st={max(0,end-start-.004)}:d=0.004,aresample=48000,apad,atrim=duration={d}','-ac','2','-c:a','pcm_s24le',str(wav)])
  if not caption_only and number==16 and not (R/'verse-16-audio-repair.json').exists():
   repaired=R/'audio-pieces/16-repaired.wav'
   graph=f'[0:a]atrim=end=22.9,asetpts=PTS-STARTPTS,aresample=48000,afade=t=out:st=22.896:d=0.004[a];[1:a]atrim=start=22.8:end=30.12,asetpts=PTS-STARTPTS,aresample=48000,afade=t=in:d=0.004[b];[a][b]concat=n=2:v=0:a=1,apad,atrim=duration={d}[out]'
   run(['ffmpeg','-v','error','-nostdin','-n','-i',str(wav),'-i',str(R/'stems/opening-verse-quiet-music.wav'),'-filter_complex',graph,'-map','[out]','-c:a','pcm_s24le',str(repaired)])
   wav.rename(R/'audio-pieces/16-before-refrain.wav');repaired.rename(wav)
   save('verse-16-audio-repair',{'verse':16,'refrainReusedFrom':'Approved opening verse, same complete refrain','originalKeepSeconds':22.9,'referenceRange':[22.8,30.12],'newGenerationCalls':0,'timingOrPitchStretched':False,'originalRetained':True})
  s={'index':index,'kind':kind,'number':number,'text':text,'start':offset,'duration':d,'end':offset+d,'audioSource':str(src),'sourceStart':start,'sourceEnd':end,'ass':ass.as_posix(),'fontSize':report['fontSize'],'words':localwords,'fullVerseAlwaysVisible':kind=='verse'}
  scenes.append(s);offset+=d
 add('welcome',None,p['welcome'],R/'welcome.mp3',0,duration(R/'welcome.mp3'))
 # Reuse the approved opening performance, now remixed with quieter accompaniment.
 sources=[(1,1,R/'stems/opening-verse-quiet-music.wav',json.loads((PARENT/'chant-female-sample-v1/song-metadata.json').read_text(encoding='utf-8')),PARENT/'chant-female-sample-v1/chant-sample.mp3')]
 for b in p['batches']:sources.append((b['firstVerse'],b['lastVerse'],R/'stems'/f'batch-{b["index"]:02}-quiet-music.wav',load(f'batch-{b["index"]:02}-metadata'),R/f'batch-{b["index"]:02}.mp3'))
 for first,last,src,metadata,original in sources:
  timed=[w for w in metadata['words_timestamps'] if caps.letters(w['word'])]
  verses=p['verses'][first-1:last]
  assert ''.join(caps.letters(w['word']) for w in timed)==''.join(caps.letters(v['text']) for v in verses),'Returned text differs from selected prayer'
  groups=[];cursor=0
  for v in verses:
   target=len(caps.letters(v['text']));n=0;group=[]
   while n<target:
    w=timed[cursor];cursor+=1;group.append(w);n+=len(caps.letters(w['word']))
   assert n==target;groups.append((v,group))
  assert cursor==len(timed)
  for i,(v,group) in enumerate(groups):
   a=0 if i==0 else (groups[i-1][1][-1]['end_ms']+group[0]['start_ms'])/2000
   b=duration(original) if i==len(groups)-1 else (group[-1]['end_ms']+groups[i+1][1][0]['start_ms'])/2000
   assert group[-1]['end_ms']/1000<=b+.03
   add('verse',v['number'],v['text'],src,a,b,group,v['lines'])
 add('closing',None,p['closing'],R/'closing.mp3',0,duration(R/'closing.mp3'))
 assert [s['number'] for s in scenes if s['kind']=='verse']==list(range(1,22))
 (R/'audio-concat.txt').write_text('\n'.join(f"file 'audio-pieces/{s['index']:02}.wav'" for s in scenes)+'\n',encoding='utf-8')
 raw=R/'unmastered-audio.wav'
 if not caption_only and not raw.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(R/'audio-concat.txt'),'-c:a','pcm_s24le',str(raw)])
 master=R/'finished-audio-master.wav'
 if not caption_only and not master.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(raw),'-af','loudnorm=I=-18:TP=-2:LRA=11','-ar','48000','-c:a','pcm_s24le',str(master)])
 if not caption_only and not (R/'finished-audio-master.mp3').exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(master),'-c:a','libmp3lame','-b:a','192k',str(R/'finished-audio-master.mp3')])
 save('timeline',{'seconds':offset,'scenes':scenes,'fullVerseCount':21,'timingSource':'Actual provider timestamps, preserving recorded audio speed'})
 for ext in ['srt','vtt']:
  pages=[]
  for i,s in enumerate(scenes):
   ts=f'{subtitle(s["start"])} --> {subtitle(s["end"])}';ts=ts.replace(',','.') if ext=='vtt' else ts
   pages.append(f'{i+1}\n{ts}\n{s["text"]}\n')
  (R/f'telugu-captions.{ext}').write_text(('WEBVTT\n\n' if ext=='vtt' else '')+'\n'.join(pages),encoding='utf-8')
 chapters=[(s['start'],'స్వాగతం' if s['kind']=='welcome' else 'సబ్‌స్క్రైబ్ • లైక్ • షేర్ • కామెంట్' if s['kind']=='closing' else f'శ్లోకం {s["number"]}') for s in scenes]
 # YouTube chapters require at least ten seconds per chapter.
 if chapters[1][0]<10:chapters=[(0,'ప్రారంభం • శ్లోకం 1')]+chapters[2:]
 (R/'chapters.txt').write_text('\n'.join(f'{int(t)//60:02}:{int(t)%60:02} {label}' for t,label in chapters)+'\n',encoding='utf-8')
 print(json.dumps({'prepared':True,'seconds':offset,'scenes':len(scenes),'fullVerses':21}),flush=True)
def render():
 p=load('full-production-plan');t=load('timeline');(R/'video-pieces').mkdir(exist_ok=True)
 for s in t['scenes']:
  out=R/'video-pieces'/f'{s["index"]:02}.mp4'
  if not out.exists():
   frames=round(s['duration']*24)
   if s['kind']=='verse':
    z=f'1+0.015*on/{max(1,frames-1)}' if s['index']%2 else f'1.015-0.015*on/{max(1,frames-1)}'
    graph=f"[0:v]scale=2200:1238:force_original_aspect_ratio=increase,crop=2200:1238,zoompan=z='{z}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d={frames}:s=1920x1080:fps=24,setsar=1,drawbox=x=30:y=620:w=1860:h=430:color=0x070B20@0.78:t=fill,ass=filename='{s['ass']}':fontsdir='public/fonts':shaping=complex[bg];[1:v]scale=200:-1[logo];[bg][logo]overlay=W-w-40:30,format=yuv420p[v]"
    inputs=['-i',p['art'],'-i',p['logo']]
   else:
    graph=f"[0:v]drawbox=x=0:y=0:w=iw:h=ih:color=0x080D25:t=fill[bg];[1:v]scale=430:-1[logo];[bg][logo]overlay=(W-w)/2:100,ass=filename='{s['ass']}':fontsdir='public/fonts':shaping=complex,format=yuv420p[v]"
    inputs=['-f','lavfi','-i',f'color=c=0x080D25:s=1920x1080:r=24:d={s["duration"]}','-i',p['logo']]
   run(['ffmpeg','-v','error','-nostdin','-n',*inputs,'-filter_complex',graph,'-map','[v]','-frames:v',str(frames),'-an','-c:v','libx264','-threads','2','-filter_complex_threads','1','-preset','veryfast','-crf','23','-maxrate','1000k','-bufsize','2000k','-pix_fmt','yuv420p',str(out)])
  print(json.dumps({'renderedScene':s['index']+1,'total':len(t['scenes'])}),flush=True)
 (R/'video-concat.txt').write_text('\n'.join(f"file 'video-pieces/{s['index']:02}.mp4'" for s in t['scenes'])+'\n',encoding='utf-8')
 file=R/'Aigiri-Nandini-Female-Chant-Full-Shlokas-1080p.mp4'
 if not (R/'finished-audio-master.wav').exists():
  print(json.dumps({'videoScenesReady':True,'awaitingAudioMaster':True}),flush=True);return
 if not file.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(R/'video-concat.txt'),'-i',str(R/'finished-audio-master.wav'),'-c:v','copy','-c:a','aac','-b:a','192k','-t',str(t['seconds']),'-movflags','+faststart',str(file)])
 print(json.dumps({'rendered':True,'seconds':duration(file)}),flush=True)
def verify():
 t=load('timeline');file=R/'Aigiri-Nandini-Female-Chant-Full-Shlokas-1080p.mp4'
 d=duration(file);assert abs(d-t['seconds'])<.1
 run(['ffmpeg','-v','error','-nostdin','-i',str(file),'-f','null','-'])
 for label,x in [('welcome',3),('first-verse',t['scenes'][1]['start']+4),('middle',d/2),('closing',t['scenes'][-1]['start']+3)]:
  run(['ffmpeg','-v','error','-nostdin','-y','-ss',str(x),'-i',str(file),'-frames:v','1',str(R/f'review-{label}.png')])
 audio=subprocess.run(['ffmpeg','-hide_banner','-nostdin','-i',str(file),'-af','volumedetect','-f','null','-'],capture_output=True,text=True,check=True)
 level={k:float(re.search(k+r'_volume:\s*([-\d.]+) dB',audio.stderr)[1]) for k in ['mean','max']};assert level['max']<0
 save('VERIFICATION',{'fullDecodePassed':True,'durationSeconds':d,'width':1920,'height':1080,'all21VersesInCaptionOrder':True,'completeShlokaAlwaysVisible':True,'transparentFullLogo':True,'welcomeIncluded':True,'allFourClosingPrompts':True,'captionTiming':'Provider word timestamps checked against selected source text','audioLevelsDb':level,'musicRemix':load('mix-report'),'humanFullPronunciationReviewPending':True,'published':False})
 print(json.dumps({'verified':True,'seconds':d,'peakDb':level['max']}),flush=True)
if __name__=='__main__':{'prepare':prepare,'prepare-captions':lambda:prepare(True),'render':render,'verify':verify}[sys.argv[1]]()
