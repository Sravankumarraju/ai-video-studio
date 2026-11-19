from pathlib import Path
import json,re,subprocess,math,sys,importlib.util
from PIL import ImageFont
ROOT=Path('data/productions/divine-wisdom/lalitha-ashtottara-2026-10-25')
spec=importlib.util.spec_from_file_location('fullcaps',Path(__file__).with_name('full-shloka-captions.py'))
caps=importlib.util.module_from_spec(spec);spec.loader.exec_module(caps)
def load(n):return json.loads((ROOT/(n+'.json')).read_text(encoding='utf-8'))
def save(n,d):(ROOT/(n+'.json')).write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
def run(a):subprocess.run(a,check=True)
def duration(f):return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(f)]))
def stamp(t):return caps.stamp(t)
def seconds(s):
 h,m,x=s.split(':');return int(h)*3600+int(m)*60+float(x)
def shifted(event,offset):
 p=event.split(',',9);p[1]=stamp(seconds(p[1])+offset);p[2]=stamp(seconds(p[2])+offset);return ','.join(p)
def subtitle(t):
 n=round(t*1000);return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
def prepare():
 p=load('plan');scenes=[];pages=[];offset=0;chapters=[(0,'శ్రీ లలితా అష్టోత్తర శతనామావళి')]
 (ROOT/'audio-pieces').mkdir(exist_ok=True);concat=[]
 for b in p['batches']:
  stem=f'batch-{b["index"]:02}';audio=ROOT/(stem+'.mp3');a=load(stem+'-alignment');assert ''.join(a['characters'])==b['text']
  raw=duration(audio);frames=math.ceil(raw*24);d=frames/24
  starts=a['character_start_times_seconds'];ends=a['character_end_times_seconds'];units=[]
  for u in b['units']:
   words=[]
   for m in re.finditer(r'\S+',u['text']):
    if not re.search('[\u0c00-\u0c7f]',m.group()):continue
    x=u['startCharacter']+m.start();y=u['startCharacter']+m.end();t0=min(starts[x:y]);t1=max(ends[x:y]);assert t1>t0
    words.append({'text':m.group(),'start':t0,'end':t1,'spokenStart':m.start(),'spokenEnd':m.end()})
   assert words;units.append({**u,'words':words,'first':words[0]['start'],'last':words[-1]['end']})
  events=[];header=None
  for i,u in enumerate(units):
   first=0 if i==0 else (units[i-1]['last']+u['first'])/2
   last=d if i==len(units)-1 else (u['last']+units[i+1]['first'])/2
   words=[{**w,'start':max(0,w['start']-first),'end':min(last-first,w['end']-first)} for w in u['words']]
   target=ROOT/f'name-caption-{b["index"]:02}-{i:02}.ass'
   report=caps.write_full_shloka(target,u['text'],u['displayText'],words,last-first,u['number'] or '',font_size=88,max_width=1720,margin=100)
   text=target.read_text(encoding='utf-8');header=text.split('Dialogue:')[0] if header is None else header
   events.extend(shifted(x,first) for x in text.splitlines() if x.startswith('Dialogue:'))
   if u['number'] and u['number'] in [1,28,55,82]:chapters.append((offset+first,f'నామాలు {u["number"]}–{min(108,u["number"]+26)}'))
   page={'number':u['number'],'text':u['displayText'],'start':offset+first,'end':offset+last,'words':[{**w,'start':w['start']+offset,'end':w['end']+offset} for w in u['words']],'fontSize':report['fontSize']}
   pages.append(page)
  (ROOT/(stem+'.ass')).write_text(header+'\n'.join(events)+'\n',encoding='utf-8')
  wav=ROOT/'audio-pieces'/f'{b["index"]:02}.wav'
  if not wav.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(audio),'-af',f'aresample=48000,apad,atrim=duration={d}','-ac','2','-c:a','pcm_s24le',str(wav)])
  concat.append(f"file 'audio-pieces/{b['index']:02}.wav'")
  scenes.append({'index':b['index'],'start':offset,'end':offset+d,'duration':d,'text':'\n'.join(u['text'] for u in b['units']),'pages':pages[-len(units):],'audioFile':str(audio),'art':p['art']});offset+=d
 (ROOT/'audio-concat.txt').write_text('\n'.join(concat)+'\n',encoding='utf-8')
 master=ROOT/'recitation-master.wav'
 if not master.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'audio-concat.txt'),'-c:a','pcm_s24le',str(master)])
 assert [x['number'] for x in pages if x['number'] and x['number']>0]==list(range(1,109))
 save('timeline',{'seconds':offset,'scenes':scenes});save('captions',{'pages':pages,'all108NamesInOrder':True,'timingSource':'Provider character timestamps, not a separate acoustic or pronunciation review'})
 for ext in ['srt','vtt']:
  out=[]
  for i,x in enumerate(pages):
   ts=f'{subtitle(x["start"])} --> {subtitle(x["end"])}';ts=ts.replace(',','.') if ext=='vtt' else ts
   out.append(f'{i+1}\n{ts}\n{x["text"]}\n')
  (ROOT/f'telugu-captions.{ext}').write_text(('WEBVTT\n\n' if ext=='vtt' else '')+'\n'.join(out),encoding='utf-8')
 (ROOT/'chapters.txt').write_text('\n'.join(f'{int(t)//60:02}:{int(t)%60:02} {label}' for t,label in chapters)+'\n',encoding='utf-8')
 print(json.dumps({'stage':'prepared','seconds':offset,'names':108,'scenes':len(scenes)}),flush=True)
def render():
 p=load('plan');t=load('timeline');(ROOT/'video-pieces').mkdir(exist_ok=True);concat=[]
 for s in t['scenes']:
  out=ROOT/'video-pieces'/f'{s["index"]:02}.mp4';frames=round(s['duration']*24)
  if not out.exists():
   z=f'1+0.02*on/{max(1,frames-1)}' if s['index']%2==0 else f'1.02-0.02*on/{max(1,frames-1)}'
   graph=f"[0:v]scale=2200:1238:force_original_aspect_ratio=increase,crop=2200:1238,zoompan=z='{z}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d={frames}:s=1920x1080:fps=24,setsar=1,ass=filename='{ROOT.as_posix()}/batch-{s['index']:02}.ass':fontsdir='public/fonts':shaping=complex[bg];[1:v]scale=104:104[logo];[bg][logo]overlay=1770:40,format=yuv420p[v]"
   run(['ffmpeg','-v','error','-nostdin','-n','-i',p['art'],'-i',p['logo'],'-filter_complex',graph,'-map','[v]','-frames:v',str(frames),'-an','-c:v','libx264','-threads','2','-filter_complex_threads','1','-preset','veryfast','-crf','22','-pix_fmt','yuv420p',str(out)])
  concat.append(f"file 'video-pieces/{s['index']:02}.mp4'")
  print(json.dumps({'stage':'render','batch':s['index']+1,'total':len(t['scenes'])}),flush=True)
 (ROOT/'video-concat.txt').write_text('\n'.join(concat)+'\n',encoding='utf-8')
 final=ROOT/'Sri-Lalitha-Ashtottara-Telugu-1080p-DRAFT.mp4'
 if not final.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'video-concat.txt'),'-i',str(ROOT/'recitation-master.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-t',str(t['seconds']),'-movflags','+faststart',str(final)])
 print(json.dumps({'stage':'rendered','file':str(final),'seconds':duration(final)}),flush=True)
def verify():
 t=load('timeline');file=ROOT/'Sri-Lalitha-Ashtottara-Telugu-1080p-DRAFT.mp4';d=duration(file);assert abs(d-t['seconds'])<.1
 run(['ffmpeg','-v','error','-nostdin','-i',str(file),'-f','null','-'])
 for n,x in [('opening',3),('prayer',t['scenes'][1]['start']+6),('middle',d/2),('ending',d-8)]:
  run(['ffmpeg','-v','error','-nostdin','-y','-ss',str(x),'-i',str(file),'-frames:v','1',str(ROOT/f'review-{n}.png')])
 save('VERIFICATION',{'fullDecodePassed':True,'durationSeconds':d,'width':1920,'height':1080,'all108NamesInCaptionOrder':True,'captionTimings':'provider returned timestamps','humanPronunciationReviewed':False,'newVoiceListeningReviewPending':True,'published':False})
 print(json.dumps({'stage':'verified','seconds':d,'fullDecodePassed':True,'humanReviewPending':True}),flush=True)
if __name__=='__main__':{'prepare':prepare,'render':render,'verify':verify}[sys.argv[1]]()
