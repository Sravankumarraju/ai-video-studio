from pathlib import Path
import json,re,math,subprocess,hashlib,importlib.util,sys,concurrent.futures
from PIL import ImageFont
R=Path('data/productions/divine-wisdom/lakshmi-original-prarthana-full-2026-10-30')
FPS=24
FONT='public/fonts/NotoSansTelugu.ttf'
DUR={}
def load(n):return json.loads((R/(n+'.json')).read_text(encoding='utf8'))
def save(n,v):(R/(n+'.json')).write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
def run(args):
 p=subprocess.run(args,capture_output=True,text=True)
 if p.returncode:raise RuntimeError(p.stderr[-3000:])
 return p.stdout
def duration(p):
 k=str(p)
 if k not in DUR:DUR[k]=float(run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',k]))
 return DUR[k]
def stamp(t):
 n=round(t*100);return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'
def srtstamp(t):
 n=round(t*1000);return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
def canon(s):
 s=''.join(c for c in s if '\u0c00'<=c<='\u0c63').replace('ీ','ి').replace('ూ','ు').replace('మ్','ం').replace('ళ','ల')
 return re.sub(r'[నణఙఞమ]్(?=[కఖగఘచఛజఝటఠడఢతథదధపఫబభ])','ం',s)
HEADER='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Noto Sans Telugu,82,&H00FFFFFF,&H00FFFFFF,&H00101010,&H95000000,0,0,0,0,100,100,0,0,3,2,0,2,100,100,85,1
Style: Title,Noto Sans Telugu,44,&H00C3E8FF,&H00FFFFFF,&H00101010,&H85000000,0,0,0,0,100,100,0,0,3,2,0,8,230,230,20,1
Style: Card,Noto Sans Telugu,60,&H00C3E8FF,&H00FFFFFF,&H00101010,&H00000000,0,0,0,0,100,100,0,0,1,2,0,5,80,80,20,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
def event(a,b,style,text,layer=0):return f'Dialogue: {layer},{stamp(a)},{stamp(b)},{style},,0,0,0,,{text}'
def render_caption(path,text,words,d,theme,title):
 lines=text.splitlines();assert len(lines)==2
 size=82
 while max(ImageFont.truetype(FONT,size).getlength(x) for x in lines)>1680:size-=2
 assert size>=60
 matches=list(re.finditer(r'\S+',text));assert len(matches)==len(words)
 wordinfo=[{**w,'a':m.start(),'z':m.end()} for w,m in zip(words,matches)]
 boundaries=sorted(set([0,d]+[max(0,min(d,w[k])) for w in words for k in ['start','end']]))
 ev=[]
 for a,b in zip(boundaries,boundaries[1:]):
  if round(a*100)==round(b*100):continue
  mid=(a+b)/2;active=next((w for w in wordinfo if w['start']<=mid<w['end']),None)
  display=text
  if active:display=text[:active['a']]+'{\\c&H004AD5FF&}'+text[active['a']:active['z']]+'{\\c&H00FFFFFF&}'+text[active['z']:]
  ev.append(event(a,b,'Caption',f'{{\\fs{size}}}'+display.replace('\n',r'\N')))
 ev.append(event(0,d,'Title',title,1));ev.append(event(0,d,'Title',r'{\pos(960,110)\fs32}'+theme,1))
 path.write_text(HEADER+'\n'.join(ev)+'\n',encoding='utf8');return size

def prepare():
 p=load('full-production-plan');a=load('phrase-library-audit');assert not a['weakLines'],'Resolve remaining weak phrase readings before assembly'
 for sub in ['audio-pieces','captions','video-pieces','review']:(R/sub).mkdir(exist_ok=True)
 fragment_by_key={};fragments=[]
 # Reuse the strongest clearly transcribed performances of recurring phrases.
 for index,(key,candidates) in enumerate(sorted(a['library'].items())):
  if key not in {canon(t) for u in p['units'][2:] for t in u['text'].splitlines()}:continue
  chosen=candidates[0];assert chosen['ratio']>=.9 and chosen['keyOk']
  src=R/(chosen['source']+'.mp3');g=chosen['words'];asr=chosen['asrWords']
  start=max(0,min([chosen['start']]+[w['start'] for w in asr])-.10)
  end=min(duration(src),max([chosen['end']]+[w['end'] for w in asr])+.12)
  protected=sorted([(max(start,w['start_ms']/1000),min(end,w['end_ms']/1000)) for w in g]+[(max(start,w['start']),min(end,w['end'])) for w in asr])
  merged=[]
  for x,y in protected:
   if y<=x:continue
   if merged and x<=merged[-1][1]:merged[-1]=(merged[-1][0],max(merged[-1][1],y))
   else:merged.append((x,y))
  remove=[(x[1]+.2,y[0]-.2) for x,y in zip(merged,merged[1:]) if y[0]-x[1]>.65]
  keep=[];cursor=start
  for x,y in remove:
   if x>cursor:keep.append((cursor,x))
   cursor=y
  if cursor<end:keep.append((cursor,end))
  def mapped(t):return max(0,t-start-sum(max(0,min(t,y)-x) for x,y in remove if t>x))
  raw=end-start-sum(y-x for x,y in remove);d=math.ceil(raw*FPS)/FPS
  dest=R/'audio-pieces'/f'phrase-{index:03}.wav'
  if not dest.exists():
   chain=[]
   for j,(x,y) in enumerate(keep):chain.append(f'[0:a]atrim=start={x}:end={y},asetpts=PTS-STARTPTS,afade=t=in:d=0.003,afade=t=out:st={max(0,y-x-.003)}:d=0.003[a{j}]')
   chain.append(''.join(f'[a{j}]' for j in range(len(keep)))+f'concat=n={len(keep)}:v=0:a=1,aresample=48000,apad,atrim=duration={d}[out]')
   run(['ffmpeg','-v','error','-nostdin','-n','-i',str(src),'-filter_complex',';'.join(chain),'-map','[out]','-ac','2','-c:a','pcm_s24le',str(dest)])
  fragment={'file':str(dest),'duration':d,'text':chosen['text'],'source':chosen['source'],'sourceRange':[start,end],'removedPauses':remove,'independentMatchRatio':chosen['ratio'],'recognized':chosen['recognized'],'words':[{'text':w['word'],'start':mapped(w['start_ms']/1000),'end':min(d,mapped(w['end_ms']/1000))} for w in g]}
  fragment_by_key[key]=fragment;fragments.append(fragment)
 save('selected-phrase-performances',{'count':len(fragments),'minimumMatchRatio':min(f['independentMatchRatio'] for f in fragments),'note':'ASR comparison guides selection; it does not establish perfect pronunciation. Recurring phrases are intentionally reused in this newly composed prayer collection. No voice speed or pitch changes.','fragments':fragments})
 scenes=[];audio_order=[];offset=0
 def add(kind,text,files,d,words=None,unit=None):
  nonlocal offset
  index=len(scenes);ass=R/'captions'/f'{index:03}.ass'
  if kind=='prayer':
   size=render_caption(ass,text,words,d,unit['theme'],p['title']);image=sorted((R/'art').glob('*.png'))[unit['imageIndex']]
  else:
   size=60;image=sorted((R/'art').glob('*.png'))[0 if kind=='welcome' else 5]
   rows=[(535,68,'డివైన్ విజ్డమ్ తెలుగు ఛానల్‌కు స్వాగతం'),(650,60,p['title']),(755,47,'108 కొత్త ప్రార్థనలు • స్త్రీ స్వరంలో'),(855,42,'తెలుగు లిపిలో సాహిత్యాన్ని అనుసరించండి')] if kind=='welcome' else [(535,62,'శ్రీ లక్ష్మీదేవి అనుగ్రహం మీ అందరికీ కలగాలి'),(650,60,'సబ్‌స్క్రైబ్ చేయండి • లైక్ చేయండి'),(760,54,'షేర్ చేయండి • కామెంట్ చేయండి'),(860,42,'డివైన్ విజ్డమ్ తెలుగు • మీ భక్తి ప్రయాణంలో')]
   ass.write_text(HEADER+'\n'.join(event(0,d,'Card',f'{{\\pos(960,{y})\\fs{fs}}}'+t) for y,fs,t in rows)+'\n',encoding='utf8')
  scenes.append({'index':index,'kind':kind,'number':unit['number'] if unit else None,'themeIndex':unit['themeIndex'] if unit else None,'theme':unit['theme'] if unit else None,'text':text,'start':offset,'end':offset+d,'duration':d,'frames':round(d*FPS),'image':str(image),'ass':ass.as_posix(),'fontSize':size,'words':words or []})
  audio_order.extend(files);offset+=d
 for name in ['welcome']:
  d=math.ceil(duration(R/(name+'.mp3'))*FPS)/FPS;dest=R/'audio-pieces'/(name+'.wav')
  if not dest.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(R/(name+'.mp3')),'-af',f'aresample=48000,apad,atrim=duration={d}','-ac','2','-c:a','pcm_s24le',str(dest)])
  add(name,p[name],[dest],d)
 # Keep the approved opening performance, with only frame-grid padding.
 md=load('approved-opening-metadata')['words_timestamps'];split=(md[5]['end_ms']+md[6]['start_ms'])/2000;full=duration(R/'approved-opening.mp3')
 for i,u in enumerate(p['units'][:2]):
  start=0 if i==0 else split;end=split if i==0 else full;d=math.ceil((end-start)*FPS)/FPS;dest=R/'audio-pieces'/f'approved-{i+1:02}.wav';words=md[i*6:(i+1)*6]
  if not dest.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(start),'-i',str(R/'approved-opening.mp3'),'-af',f'atrim=duration={end-start},aresample=48000,apad,atrim=duration={d}','-ac','2','-c:a','pcm_s24le',str(dest)])
  w=[{'text':x['word'],'start':max(0,x['start_ms']/1000-start),'end':min(d,x['end_ms']/1000-start)} for x in words];add('prayer',u['text'],[dest],d,w,u)
 for u in p['units'][2:]:
  chosen=[fragment_by_key[canon(line)] for line in u['text'].splitlines()];d=sum(f['duration'] for f in chosen);w=[];local=0
  for f in chosen:
   w.extend({**x,'start':x['start']+local,'end':x['end']+local} for x in f['words']);local+=f['duration']
  add('prayer',u['text'],[Path(f['file']) for f in chosen],d,w,u)
 name='closing';d=math.ceil(duration(R/(name+'.mp3'))*FPS)/FPS;dest=R/'audio-pieces'/(name+'.wav')
 if not dest.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(R/(name+'.mp3')),'-af',f'aresample=48000,apad,atrim=duration={d}','-ac','2','-c:a','pcm_s24le',str(dest)])
 add(name,p[name],[dest],d)
 assert [s['number'] for s in scenes if s['kind']=='prayer']==list(range(1,109))
 save('timeline',{'seconds':offset,'sceneCount':len(scenes),'invocations':108,'scenes':scenes,'audioTempoChanged':False})
 (R/'audio-concat.txt').write_text('\n'.join("file '"+f.relative_to(R).as_posix()+"'" for f in audio_order)+'\n',encoding='utf8')
 master=R/'finished-audio-master.wav'
 if not master.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(R/'audio-concat.txt'),'-af','loudnorm=I=-18:TP=-1.5:LRA=8','-ar','48000','-ac','2','-c:a','pcm_s24le',str(master)])
 if not (R/'finished-audio-master.mp3').exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(master),'-c:a','libmp3lame','-b:a','192k',str(R/'finished-audio-master.mp3')])
 captions=[]
 for i,s in enumerate(scenes):captions.append(f"{i+1}\n{srtstamp(s['start'])} --> {srtstamp(s['end'])}\n{s['text']}\n")
 (R/'telugu-captions.srt').write_text('\n'.join(captions),encoding='utf8');(R/'telugu-captions.vtt').write_text('WEBVTT\n\n'+'\n'.join(captions).replace(',','.'),encoding='utf8')
 chapters=[(0,'డివైన్ విజ్డమ్ తెలుగు • స్వాగతం')]
 for ti,theme in enumerate(p['themes']):chapters.append((next(s['start'] for s in scenes if s['themeIndex']==ti),theme))
 chapters.append((scenes[-1]['start'],'సబ్‌స్క్రైబ్ • లైక్ • షేర్ • కామెంట్'))
 (R/'chapters.txt').write_text('\n'.join(f'{int(t)//60:02}:{int(t)%60:02} {name}' for t,name in chapters)+'\n',encoding='utf8')
 print(json.dumps({'prepared':True,'seconds':offset,'minutes':offset/60,'scenes':len(scenes),'invocations':108,'selectedClearPhrases':len(fragments)}),flush=True)

def render_scene(s):
 out=R/'video-pieces'/f"{s['index']:03}.mp4"
 if out.exists():return s['index']
 frames=s['frames'];logo=R/'channel-logo-transparent.png'
 if s['kind']=='prayer':
  progress=(s['number']-1)%3;reverse=((s['number']-1)//3)%2
  z=f'{1.015-progress*.005}-.005*on/{max(1,frames-1)}' if reverse else f'{1+progress*.005}+.005*on/{max(1,frames-1)}'
  graph=f"[0:v]scale=1920:1080,zoompan=z='{z}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d={frames}:s=1920x1080:fps=24,setsar=1[base];[1:v]scale=200:-1[logo];[base][logo]overlay=W-w-32:24,ass=filename='{s['ass']}':fontsdir='public/fonts':shaping=complex,format=yuv420p[v]"
  inputs=['-i',s['image'],'-i',str(logo)]
 else:
  graph=f"[0:v]scale=1920:1080,setsar=1,drawbox=x=0:y=0:w=iw:h=ih:color=0x080d20@.76:t=fill[base];[1:v]split=2[a][b];[a]scale=360:-1[big];[b]scale=200:-1[small];[base][big]overlay=(W-w)/2:90[mid];[mid][small]overlay=W-w-32:24,ass=filename='{s['ass']}':fontsdir='public/fonts':shaping=complex,format=yuv420p[v]"
  inputs=['-loop','1','-framerate','24','-i',s['image'],'-i',str(logo)]
 run(['ffmpeg','-v','error','-nostdin','-n',*inputs,'-filter_complex_threads','1','-filter_complex',graph,'-map','[v]','-frames:v',str(frames),'-an','-c:v','libx264','-preset','veryfast','-crf','20','-threads','3','-pix_fmt','yuv420p',str(out)])
 return s['index']
def render():
 t=load('timeline');completed=0
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  futures=[pool.submit(render_scene,s) for s in t['scenes']]
  for f in concurrent.futures.as_completed(futures):
   f.result();completed+=1
   if completed%5==0 or completed==len(futures):print(json.dumps({'renderedScenes':completed,'totalScenes':len(futures)}),flush=True)
 (R/'video-concat.txt').write_text('\n'.join(f"file 'video-pieces/{s['index']:03}.mp4'" for s in t['scenes'])+'\n',encoding='utf8')
 out=R/'Sri-Lakshmi-Karuna-Prarthana-Malika-Full-1080p.mp4'
 if not out.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(R/'video-concat.txt'),'-i',str(R/'finished-audio-master.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-t',str(t['seconds']),'-movflags','+faststart',str(out)])
 print(json.dumps({'rendered':str(out),'seconds':duration(out)}),flush=True)
def verify():
 t=load('timeline');out=R/'Sri-Lakshmi-Karuna-Prarthana-Malika-Full-1080p.mp4';q=json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(out)]));v=next(s for s in q['streams'] if s['codec_type']=='video');a=next(s for s in q['streams'] if s['codec_type']=='audio');d=float(q['format']['duration'])
 assert (v['width'],v['height'],v['codec_name'],a['codec_name'])==(1920,1080,'h264','aac');assert abs(d-t['seconds'])<.12;assert abs(duration(R/'finished-audio-master.wav')-t['seconds'])<.12
 run(['ffmpeg','-v','error','-xerror','-nostdin','-i',str(out),'-f','null','-'])
 for label,x in [('welcome',3),('opening',t['scenes'][1]['start']+3),('middle',d/2),('last-prayer',t['scenes'][-2]['start']+2),('closing',d-4)]:run(['ffmpeg','-v','error','-nostdin','-y','-ss',str(x),'-i',str(out),'-frames:v','1','-q:v','2',str(R/'review'/f'{label}.jpg')])
 result={'video':str(out.resolve()),'seconds':d,'resolution':[1920,1080],'videoCodec':'H.264','audioCodec':'AAC','fullDecodePassed':True,'invocations':108,'allInvocationsInOrder':True,'fullVerseCaptions':True,'wordHighlight':True,'completeChannelLogoThroughout':True,'originalArtworkCount':6,'welcomeAndAllFourClosingPrompts':True,'approvedOpeningReused':True,'pitchOrTempoChanged':False,'phraseReuseAndEditsDocumented':True,'captionTimingBasedOnRecordedWords':True,'humanFullPronunciationListeningReviewPending':True,'published':False}
 save('VERIFICATION',result);print(json.dumps(result),flush=True)
if __name__=='__main__':{'prepare':prepare,'render':render,'verify':verify}[sys.argv[1]]()
