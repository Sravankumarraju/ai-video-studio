from pathlib import Path
import json,subprocess,math,re,sys,importlib.util
from PIL import Image,ImageDraw,ImageFont
R=Path('data/productions/divine-wisdom/dakshinamurthy-2026-10-23')
O=R/'Sri-Dakshinamurthy-Stotram-Telugu-1080p.mp4'
spec=importlib.util.spec_from_file_location('format',Path(__file__).with_name('venkateswara-package.py'));fmt=importlib.util.module_from_spec(spec);spec.loader.exec_module(fmt)
F='public/fonts/NotoSansTelugu.ttf';FPS=24
def load(n):return json.loads((R/f'{n}.json').read_text(encoding='utf8'))
def save(n,v):(R/f'{n}.json').write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
def run(a):subprocess.run(a,check=True)
def dur(f):return fmt.duration(f)
def norm(s):return ''.join(c for c in s if '\u0c00'<=c<='\u0c7f')
def frame(t):return math.ceil(t*FPS)/FPS
def prepare():
 p=load('plan');raw=load('batch-00-metadata')['words_timestamps']
 expected=norm(''.join(u['text'] for u in p['units']));actual=norm(''.join(w['word'] for w in raw))
 assert expected==actual,'Provider lyric metadata differs from source; inspect before rendering'
 (R/'audio-pieces').mkdir(exist_ok=True);audio=[];offset=0
 for i,name in enumerate(['welcome','batch-00','closing']):
  seconds=frame(dur(R/f'{name}.mp3')+.15);dest=R/'audio-pieces'/f'{i:02}.wav'
  if not dest.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(R/f'{name}.mp3'),'-af',f'loudnorm=I=-18:TP=-2:LRA=9,aresample=48000,apad,atrim=duration={seconds}','-ar','48000','-ac','2','-c:a','pcm_s24le',str(dest)])
  audio.append({'name':name,'start':offset,'seconds':seconds,'end':offset+seconds});offset+=seconds
 (R/'audio-concat.txt').write_text('\n'.join(f"file 'audio-pieces/{i:02}.wav'" for i in range(3))+'\n',encoding='utf8')
 if not (R/'finished-audio-master.wav').exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(R/'audio-concat.txt'),'-c:a','copy',str(R/'finished-audio-master.wav')])
 if not (R/'finished-audio-master.mp3').exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(R/'finished-audio-master.wav'),'-c:a','libmp3lame','-b:a','192k',str(R/'finished-audio-master.mp3')])
 shift=audio[1]['start'];cursor=0;pages=[];units=[]
 for u in p['units']:
  first=len(pages)
  for text in u['text'].splitlines():
   selected=[];got=''
   while cursor<len(raw) and len(got)<len(norm(text)):
    w=raw[cursor];cursor+=1;got+=norm(w['word']);selected.append({'text':w['word'],'start':w['start_ms']/1000+shift,'end':w['end_ms']/1000+shift})
   assert got==norm(text),('Line boundary differs',u['verse'])
   good=[w for w in selected if w['end']>w['start']]
   assert good
   start=min(w['start'] for w in good);end=max(w['end'] for w in good)
   size=100
   font=ImageFont.truetype(F,size)
   # Retain source compounds without inventing intra-word timings.
   if font.getlength(text)>1660:size=max(58,int(100*1660/font.getlength(text)))
   assert ImageFont.truetype(F,size).getlength(text)<1700
   pages.append({'start':start,'end':end+.08,'display':text,'fontSize':size,'verse':u['verse'],'words':selected})
  units.append({**u,'start':pages[first]['start'],'end':pages[-1]['end']})
 assert cursor==len(raw)
 for name,part in [('welcome',audio[0]),('closing',audio[2])]:
  for i in range(0,len((ws:=fmt.aligned_words(load(name+'-alignment')))),6):
   group=ws[i:i+6];pages.append({'start':part['start']+group[0]['start'],'end':part['start']+group[-1]['end']+.08,'display':' '.join(w['text'] for w in group),'fontSize':86,'words':[dict(w,start=w['start']+part['start'],end=w['end']+part['start']) for w in group]})
 pages.sort(key=lambda p:p['start'])
 for a,b in zip(pages,pages[1:]):a['end']=min(a['end'],b['start'])
 art=['01-banyan-guru','02-midnight-mural','03-bronze-shrine']
 scenes=[{'index':0,'kind':'welcome','start':0,'end':shift,'seconds':shift,'image':art[0]}]
 for i,u in enumerate(units):
  a=shift if i==0 else round((units[i-1]['end']+u['start'])/2*FPS)/FPS
  b=audio[2]['start'] if i==9 else round((u['end']+units[i+1]['start'])/2*FPS)/FPS
  scenes.append({'index':i+1,'kind':'prayer','verse':i+1,'start':a,'end':b,'seconds':b-a,'image':art[i%3]})
 scenes.append({'index':11,'kind':'closing','start':audio[2]['start'],'end':offset,'seconds':audio[2]['seconds'],'image':art[2]})
 save('timeline',{'seconds':offset,'prayerStart':shift,'prayerEnd':audio[2]['start'],'units':units,'scenes':scenes,'audio':audio})
 save('captions',{'pages':pages});save('caption-audit',{'issues':[],'sourceVerses':10,'sourceOrderMatchesMusicMetadata':True,'sungLines':49,'manualListeningVerified':False,'metadataAlignmentDoesNotProvePronunciation':True,'minimumFontSize':min(p['fontSize'] for p in pages)})
 srt='\n\n'.join(f"{i+1}\n{fmt.srt_time(p['start'])} --> {fmt.srt_time(p['end'])}\n{p['display']}" for i,p in enumerate(pages))+'\n'
 (R/'telugu-captions.srt').write_text(srt,encoding='utf8');(R/'telugu-captions.vtt').write_text('WEBVTT\n\n'+srt.replace(',','.'),encoding='utf8')
 print(json.dumps({'stage':'prepared','seconds':offset,'verses':10,'screens':12,'minimumFontSize':min(p['fontSize'] for p in pages)}),flush=True)
def ass(scene):
 events=[];seconds=scene['seconds'];start=scene['start']
 def event(a,b,style,text):events.append(f'Dialogue: 1,{fmt.ass_time(a)},{fmt.ass_time(b)},{style},,0,0,0,,{text}')
 event(0,seconds,'Title','శ్రీ దక్షిణామూర్తి స్తోత్రం')
 event(0,seconds,'Brand','Divine Wisdom Telugu')
 for p in load('captions')['pages']:
  a=max(start,p['start']);b=min(start+seconds,p['end'])
  if b<=a:continue
  event(a-start,b-start,'Lyrics',r'{\fs'+str(p['fontSize'])+'}'+p['display'])
 if scene['kind']=='welcome':event(0,seconds,'Card',r'{\pos(960,640)}డివైన్ విజ్డమ్ తెలుగు\Nఛానల్‌కు స్వాగతం')
 if scene['kind']=='closing':
  event(0,seconds,'Card',r'{\pos(960,480)\fs66}సబ్‌స్క్రైబ్ చేయండి · లైక్ చేయండి\Nషేర్ చేయండి · కామెంట్ చేయండి')
 header=fmt.HEADER.replace('[Events]','Style: Brand,Noto Sans,32,&H00FFFFFF,&H00FFFFFF,&H00101010,&H90000000,0,0,0,0,100,100,0,0,1,1,0,7,35,35,35,1\n[Events]')
 path=R/f"scene-{scene['index']:02}.ass";path.write_text(header+'\n'.join(events)+'\n',encoding='utf8');return path
def render():
 t=load('timeline');(R/'video-pieces').mkdir(exist_ok=True)
 logo=Image.open(R/'channel-logo.png').convert('RGBA');logo.thumbnail((120,120));logo.save(R/'logo-overlay.png')
 for s in t['scenes']:
  target=R/'video-pieces'/f"{s['index']:02}.mp4"
  if target.exists():continue
  subtitle=ass(s);frames=round(s['seconds']*FPS)
  z=f"1.015+0.02*on/{max(1,frames-1)}" if s['index']%2==0 else f"1.035-0.02*on/{max(1,frames-1)}"
  graph=f"[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='{z}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d={frames}:s=1920x1080:fps=24,setsar=1,drawbox=x=0:y=780:w=iw:h=300:color=black@0.72:t=fill,drawbox=x=0:y=0:w=iw:h=108:color=black@0.45:t=fill[bg];[bg][1:v]overlay=W-w-26:125,ass=filename='{subtitle.as_posix()}':fontsdir='public/fonts':shaping=complex,format=yuv420p[out]"
  run(['ffmpeg','-v','error','-nostdin','-n','-i',str(R/'art'/f"{s['image']}.png"),'-i',str(R/'logo-overlay.png'),'-filter_complex_threads','2','-filter_complex',graph,'-map','[out]','-frames:v',str(frames),'-an','-c:v','libx264','-threads','6','-preset','veryfast','-crf','19',str(target)])
  print(json.dumps({'stage':'screen-rendered','screen':s['index']+1,'total':12}),flush=True)
 (R/'video-concat.txt').write_text('\n'.join(f"file 'video-pieces/{s['index']:02}.mp4'" for s in t['scenes'])+'\n',encoding='utf8')
 if not O.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(R/'video-concat.txt'),'-i',str(R/'finished-audio-master.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','256k','-movflags','+faststart',str(O)])
 img=Image.open(R/'art/01-banyan-guru.png').convert('RGBA').resize((1920,1080));ov=Image.new('RGBA',img.size);d=ImageDraw.Draw(ov);d.rectangle((950,0,1920,1080),fill=(3,12,25,220));img=Image.alpha_composite(img,ov);d=ImageDraw.Draw(img)
 for text,y,size in [('శ్రీ దక్షిణామూర్తి',340,92),('స్తోత్రం',520,140),('పూర్తి 10 శ్లోకాలు',700,64),('Divine Wisdom Telugu',880,40)]:
  font=ImageFont.truetype(F if not text.startswith('Divine') else 'C:/Windows/Fonts/arial.ttf',size);d.text((1430,y),text,font=font,fill='#f4d27e',anchor='mm')
 img.convert('RGB').resize((1280,720)).save(R/'thumbnail.jpg',quality=95)
 chapters=[{'start':0,'title':'ఛానల్ స్వాగతం'}]+[{'start':u['start'],'title':f"శ్లోకం {u['verse']}"} for u in t['units']]+[{'start':t['prayerEnd'],'title':'సబ్‌స్క్రైబ్ · లైక్ · షేర్ · కామెంట్'}]
 description='శ్రీ దక్షిణామూర్తి స్తోత్రం — పూర్తి పది శ్లోకాలు, మహిళా భక్తి గానం మరియు తెలుగు సాహిత్యంతో.\n\nసాహిత్య మూలం: https://sanskritdocuments.org/doc_shiva/dakshina.html\n\nగానం, సంగీతం మరియు చిత్రాలు AI సహాయంతో కొత్తగా రూపొందించబడ్డాయి.\n\n'+ '\n'.join(fmt.chapter_time(c['start'])+' '+c['title'] for c in chapters)+'\n\nDivine Wisdom Telugu ఛానల్‌ను సబ్‌స్క్రైబ్ చేయండి. లైక్, షేర్ చేయండి. కామెంట్‌లో ఓం నమః శివాయ అని రాయండి.\n\n#DakshinamurthyStotram #దక్షిణామూర్తిస్తోత్రం #DivineWisdomTelugu #ShivaStotram'
 (R/'youtube-description.txt').write_text(description,encoding='utf8');save('youtube-package',{'title':'శ్రీ దక్షిణామూర్తి స్తోత్రం | పూర్తి 10 శ్లోకాలు | Dakshinamurthy Stotram Telugu','description':description,'tags':['Dakshinamurthy Stotram','Telugu Lyrics','Shiva Stotram','Divine Wisdom Telugu'],'thumbnail':'thumbnail.jpg','published':False})
def verify():
 p=fmt.probe(O);t=load('timeline');v=next(s for s in p['streams'] if s['codec_type']=='video');assert (v['width'],v['height'])==(1920,1080);assert abs(float(p['format']['duration'])-t['seconds'])<.15
 run(['ffmpeg','-v','error','-xerror','-nostdin','-i',str(O),'-f','null','-'])
 for name,time in [('welcome',2),('verse',t['units'][0]['start']+4),('middle',t['units'][5]['start']+4),('closing',t['prayerEnd']+3)]:
  target=R/f'review-{name}.jpg'
  if not target.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(time),'-i',str(O),'-frames:v','1','-q:v','2',str(target)])
 save('VERIFICATION',{'fullDecodePassed':True,'allMainVersesInOrder':True,'sourceTextMatchesProviderMetadata':True,'seconds':float(p['format']['duration']),'width':1920,'height':1080,'images':3,'channelNameAndLogo':True,'subscribeLikeShareComment':True,'manualListeningVerified':False,'pronunciationListeningReviewPending':True,'published':False})
 print(json.dumps({'video':str(O),'seconds':t['seconds'],'fullDecodePassed':True}),flush=True)
if __name__=='__main__':{'prepare':prepare,'render':render,'verify':verify}[sys.argv[1]]()
