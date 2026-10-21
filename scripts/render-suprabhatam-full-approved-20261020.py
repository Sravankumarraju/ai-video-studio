from pathlib import Path
import json,re,subprocess,hashlib,shutil
from PIL import ImageFont
from importlib.util import spec_from_file_location,module_from_spec
gapSpec=spec_from_file_location('suprabhatam_gaps',Path('scripts/suprabhatam-gap-normalization-20261020.py'));gapModule=module_from_spec(gapSpec);gapSpec.loader.exec_module(gapModule)
ROOT=Path('output/sri-venkateswara-full-approved-2026-10-20')
DESIGN=Path('output/sri-venkateswara-telugu-shaping-fixed-2026-10-20')
OPEN=Path('output/sri-venkateswara-female-chant-v3-2026-10-20')
OLD=Path('output/sri-venkateswara-approved-corrected-2026-10-20')
(ROOT/'audio').mkdir(exist_ok=True)
def run(a):subprocess.run(a,check=True)
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]))
def dur(p):return float(probe(p)['format']['duration'])
def at(t):
 n=round(t*100);return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'
def st(t):
 n=round(t*1000);return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
def chapter(t):
 n=int(t);return f'{n//60:02}:{n%60:02}'
def canon(s):
 s=''.join(chr(ord(c)-0x300) if '\u0c00'<=c<='\u0c7f' else c for c in s)
 return ''.join(c for c in s.replace('ळ','ल').replace('ङ्','ं').replace('ञ्','ं') if '\u0900'<=c<='\u0963')
source=(ROOT/'complete-lyrics-telugu.txt').read_text(encoding='utf8').strip().split('\n\n');assert len(source)==29
audit=json.loads((ROOT/'independent-lyric-audit.json').read_text(encoding='utf8'))
names={3:'verse-03-probe',4:'verse-04',5:'verse-05',**{v:f'verse-{v:02}-clear' for v in range(6,30)}}
selectionfile=ROOT/'audio-selection.json'
if selectionfile.exists():names.update({int(k):v for k,v in json.loads(selectionfile.read_text(encoding='utf8')).items()})
selected=[]
for verse,name in names.items():
 assert (ROOT/f'{name}.mp3').exists(),f'Missing verse {verse}'
 a=next((a for a in audit if a['file']==name),None);assert a and a['characterSimilarity']>=90,f'Review verse {verse} before rendering'
 selected.append({'verse':verse,'name':name,'transcriptSimilarity':a['characterSimilarity']})
pieces=[('opening',OPEN/'song.mp3')]+[(r['name'],ROOT/(r['name']+'.mp3')) for r in selected]
offsets={};gapreports={};clock=0;concat=[]
for name,mp3 in pieces:
 wav=ROOT/'audio'/f'{name}.wav'
 if name=='opening':
  if not wav.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(mp3),'-ar','48000','-ac','2','-c:a','pcm_s16le',str(wav)])
 else:
  verse=next(r['verse'] for r in selected if r['name']==name);wav,gapreport=gapModule.normalize(name,mp3,source[verse-1].splitlines());gapreports[name]=gapreport
 seconds=dur(wav);offsets[name]={'start':clock,'seconds':seconds};clock+=seconds
 concat.append(f"file 'audio/{name}.wav'")
(ROOT/'audio-concat.ffconcat').write_text('\n'.join(concat)+'\n',encoding='utf8')
master=ROOT/'full-approved-chant-master.wav'
if not master.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'audio-concat.ffconcat'),'-c:a','copy',str(master)])
assert abs(dur(master)-clock)<.001
opening=json.loads((OLD/'verification.json').read_text(encoding='utf8'))['timeline']
timeline=[]
for u in opening:
 timeline.append({'verse':u['verse'],'start':u['start'],'end':min(u['end'],offsets['opening']['seconds']),'text':u['text'],'words':u['words']})
timeline[-1]['end']=offsets['opening']['seconds']
for item in selected:
 verse=item['verse'];name=item['name'];meta=json.loads((ROOT/f'{name}-metadata.json').read_text(encoding='utf8'))
 tokens=[w for w in meta['words_timestamps'] if canon(w['word'])]
 recorded=''.join(canon(w['word']) for w in tokens);expected=canon(source[verse-1]);assert recorded==expected,f'Caption source mismatch in verse {verse}'
 charstart=[];charend=[]
 for w in tokens:
  c=canon(w['word']);start=w['start_ms']/1000;end=w['end_ms']/1000
  for i in range(len(c)):
   charstart.append(start+(end-start)*i/len(c));charend.append(start+(end-start)*(i+1)/len(c))
 words=[];cursor=0;offset=offsets[name]['start'];pieceEnd=offset+offsets[name]['seconds']
 for token in source[verse-1].split():
  c=canon(token)
  if not c:continue
  assert recorded[cursor:cursor+len(c)]==c
  start=offset+gapModule.remap(charstart[cursor],gapreports[name]['cuts']);end=min(pieceEnd,offset+gapModule.remap(charend[cursor+len(c)-1],gapreports[name]['cuts']));cursor+=len(c)
  assert end>start,f'Collapsed timing in verse {verse}'
  words.append({'text':token,'start':start,'end':end})
 timeline.append({'verse':verse,'start':offset,'end':pieceEnd,'text':source[verse-1],'words':words,'recording':name})
assert [u['verse'] for u in timeline]==list(range(1,30))
assert all(timeline[i]['end']<=timeline[i+1]['start']+.03 for i in range(28))
base=(DESIGN/'telugu-captions.ass').read_text(encoding='utf-8-sig')
header=base[:base.index('[Events]')]+'''[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
events=[f'Dialogue: 2,0:00:00.00,{at(clock)},Default,,0,0,0,,{{\\an7\\pos(74,205)\\fs56\\c&H009BDFF5&\\bord0}}శ్రీ వేంకటేశ్వర సుప్రభాతం',f'Dialogue: 2,0:00:00.00,{at(clock)},Default,,0,0,0,,{{\\an7\\pos(76,1012)\\fs31\\c&H009BDFF5&\\bord0}}శ్రీ వేంకటేశాయ నమః']
fontpath='public/fonts/NotoSansTelugu.ttf'
for u in timeline:
 size=70 if u['verse']<=2 else 64
 while True:
  f=ImageFont.truetype(fontpath,size);rows=[];index=0
  for line in u['text'].splitlines():
   row=[]
   for token in line.split():
    if not canon(token):
     if row:row[-1][0]+=' '+token
     continue
    if row and f.getlength(' '.join([r[0] for r in row]+[token]))>1100:
     rows.append(row);row=[]
    row.append([token,index]);index+=1
   if row:rows.append(row)
  if len(rows)<=6 or size<=48:break
  size-=4
 assert index==len(u['words']);assert len(rows)<=7
 u['captionFontSize']=size;u['captionRows']=len(rows)
 def stanza(active):return '\\N'.join(' '.join(('{\\c&H008BD1F4&}' if i==active else '{\\c&H00F1F6F6&}')+token for token,i in row) for row in rows)
 bounds=sorted(set([u['start'],u['end']]+[t for w in u['words'] for t in [w['start'],w['end']] if u['start']<t<u['end']]))
 for start,end in zip(bounds,bounds[1:]):
  mid=(start+end)/2;active=next((i for i,w in enumerate(u['words']) if w['start']<=mid<w['end']),None)
  events.append(f'Dialogue: 0,{at(start)},{at(end)},Default,,0,0,0,,{{\\an7\\pos(76,410)\\fs{size}\\q0}}'+stanza(active))
ass=ROOT/'full-telugu-captions.ass';ass.write_text(header+'\n'.join(events)+'\n',encoding='utf-8-sig')
(ROOT/'full-telugu-captions.srt').write_text('\n\n'.join(f"{i+1}\n{st(u['start'])} --> {st(u['end'])}\n{u['text']}" for i,u in enumerate(timeline))+'\n',encoding='utf8')
(ROOT/'full-timeline.json').write_text(json.dumps({'prayerSeconds':clock,'endingSeconds':6,'verses':timeline,'selectedRecordings':selected},ensure_ascii=False,indent=2),encoding='utf8')
(ROOT/'youtube-chapters.txt').write_text('\n'.join(f"{chapter(u['start'])} శ్లోకం {u['verse']}" for u in timeline)+f'\n{chapter(clock)} Subscribe • Like • Share • Comment\n',encoding='utf8')
print(json.dumps({'preparedVerses':29,'prayerSeconds':clock,'wordCount':sum(len(u['words']) for u in timeline),'captionFontSizes':sorted(set(u['captionFontSize'] for u in timeline))}),flush=True)
if __import__('sys').argv[-1]=='prepare':raise SystemExit
prayer=ROOT/'full-prayer-with-logo.mp4'
if not prayer.exists():
 run(['ffmpeg','-v','error','-nostdin','-n','-loop','1','-i',str(DESIGN/'prayer-background.jpg'),'-i',str(master),'-i',str(ROOT/'channel-logo-transparent.png'),'-filter_complex',f"[0:v]fps=24,ass=filename='{ass.as_posix()}':fontsdir='public/fonts':shaping=complex[bg];[2:v]scale=220:220[logo];[bg][logo]overlay=W-w-28:H-h-28,format=yuv420p[v]",'-map','[v]','-map','1:a','-t',str(clock),'-c:v','libx264','-preset','veryfast','-crf','19','-threads','4','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart','-progress',str(ROOT/'render-progress.txt'),str(prayer)])
ending=ROOT/'full-ending-with-logo.mp4'
if not ending.exists():
 run(['ffmpeg','-v','error','-nostdin','-n','-i',str(DESIGN/'ending-readable.mp4'),'-i',str(ROOT/'channel-logo-transparent.png'),'-filter_complex','[1:v]scale=220:220[logo];[0:v][logo]overlay=W-w-28:H-h-28,format=yuv420p[v]','-map','[v]','-map','0:a','-c:v','libx264','-preset','veryfast','-crf','19','-threads','4','-c:a','copy',str(ending)])
(ROOT/'full-video.ffconcat').write_text("file 'full-prayer-with-logo.mp4'\nfile 'full-ending-with-logo.mp4'\n",encoding='utf8')
out=ROOT/'Sri-Venkateswara-Suprabhatham-Full-Telugu-Divine-Wisdom-1080p.mp4'
if not out.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'full-video.ffconcat'),'-c','copy','-movflags','+faststart',str(out)])
run(['ffmpeg','-v','error','-nostdin','-i',str(out),'-f','null','-'])
p=probe(out);v=next(s for s in p['streams'] if s['codec_type']=='video');assert(v['width'],v['height'])==(1920,1080)
assert abs(float(p['format']['duration'])-(clock+6))<.3
record={'fullDecodePassed':True,'durationSeconds':float(p['format']['duration']),'resolution':[1920,1080],'prayerVerses':29,'allVersesInOrder':True,'approvedOpeningPreserved':True,'tempoProcessing':False,'logo':'channel-logo-transparent.png','logoPosition':'bottom-right','teluguShaping':'libass complex HarfBuzz','captionWords':sum(len(u['words']) for u in timeline),'independentTranscriptsChecked':True,'pronunciationAndSingerContinuityListeningReviewPending':True,'selectedRecordings':selected,'excludedRecordings':['continuation-1','verse-06'],'output':out.name,'published':False}
(ROOT/'full-video-verification.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf8')
(ROOT/'youtube-description.txt').write_text('శ్రీ వేంకటేశ్వర సుప్రభాతం | Divine Wisdom Telugu\n\nAll 29 Suprabhatam verses in an original AI-generated female rhythmic chanting arrangement, with synchronized Sanskrit-in-Telugu captions. Created with ElevenLabs Music. Original devotional artwork and transparent Divine Wisdom Telugu logo.\n\nA devotional recitation of all 29 verses, with Telugu captions.\n\nText reference: https://stotranidhi.com/venkateshwara-suprabhatam-in-telugu/\n\nSubscribe, like, share and comment.\n\n#Suprabhatam #Venkateswara #Telugu #DivineWisdomTelugu\n',encoding='utf8')
plan=json.loads((ROOT/'full-production-plan.json').read_text(encoding='utf8'));plan['state']='full_video_rendered_listening_review_pending';plan['fullVideo']=str(out);plan['actualSeconds']=record['durationSeconds'];plan['selectedRecordings']=selected;(ROOT/'full-production-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'completed':str(out.resolve()),'seconds':record['durationSeconds'],'fullDecodePassed':True}),flush=True)
