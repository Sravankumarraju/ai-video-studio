from pathlib import Path
import json,subprocess,hashlib
from PIL import Image,ImageDraw,ImageFont
SRC=Path('output/sri-venkateswara-female-chant-v3-2026-10-20')
ROOT=Path('output/sri-venkateswara-approved-corrected-2026-10-20');ROOT.mkdir(exist_ok=True)
def run(a):subprocess.run(a,check=True)
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]))
def at(t):
 n=round(t*100);return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'
def st(t):
 n=round(t*1000);return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
fontpath='public/fonts/NotoSansTelugu.ttf'
te=lambda n:ImageFont.truetype(fontpath,n)
en=lambda n:ImageFont.truetype('public/fonts/NotoSans.ttf',n)
gold='#f5df9b';white='#f3f5e9'
verses=[['కౌసల్యా సుప్రజా రామ','పూర్వా సంధ్యా ప్రవర్తతే ।','ఉత్తిష్ఠ నరశార్దూల','కర్తవ్యం దైవమాహ్నికమ్ ॥'],['ఉత్తిష్ఠోత్తిష్ఠ గోవింద','ఉత్తిష్ఠ గరుడధ్వజ ।','ఉత్తిష్ఠ కమలాకాంత','త్రైలోక్యం మంగళం కురు ॥']]
sanskrit='कौसल्या सुप्रजा राम पूर्वा संध्या प्रवर्तते उत्तिष्ठ नरशार्दूल कर्तव्यं दैवमाह्निकम् उत्तिष्ठोत्तिष्ठ गोविन्द उत्तिष्ठ गरुडध्वज उत्तिष्ठ कमलाकान्त त्रैलोक्यं मंगलं कुरु'.split()
asr=json.loads((SRC/'independent-transcription.json').read_text(encoding='utf8'))
aw=[w for w in asr['words'] if w['type']=='word']
def norm(s):return ''.join(c for c in s if '\u0900'<=c<='\u0963' or '\u0c00'<=c<='\u0c7f')
assert [norm(w['text']) for w in aw]==sanskrit,'Independent recorded words need review'
expected=[w for v in verses for line in v for w in line.split() if any('\u0c00'<=c<='\u0c7f' for c in w)]
assert len(expected)==len(aw)==19
words=[{'text':t,'heardTranscription':a['text'],'start':a['start'],'end':a['end']} for t,a in zip(expected,aw)]
duration=float(probe(SRC/'song.mp3')['format']['duration'])
im=Image.open(SRC/'lyric-background.jpg').convert('RGB');d=ImageDraw.Draw(im)
d.rectangle((0,1000,1000,1080),fill=(43,57,24))
d.text((76,1012),'శ్రీ వేంకటేశాయ నమః',font=te(31),fill='#d3cfab')
im.save(ROOT/'prayer-background.jpg',quality=96)
header='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Noto Sans Telugu,70,&H00F1F6F6,&H00F1F6F6,&H00182014,&H00000000,0,0,0,0,100,100,0,0,1,0.5,0,7,70,820,0,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
events=[];timeline=[];cursor=0
for vi,rows in enumerate(verses):
 count=sum(sum(any('\u0c00'<=c<='\u0c7f' for c in x) for x in row.split()) for row in rows)
 vw=words[cursor:cursor+count];cursor+=count
 begin=0 if vi==0 else vw[0]['start'];end=words[cursor]['start'] if cursor<len(words) else duration
 tokens=[];idx=0
 for row in rows:
  rr=[]
  for token in row.split():
   if token in ['।','॥']:rr[-1][0]+=' '+token
   else:rr.append([token,idx]);idx+=1
  tokens.append(rr)
 assert all(te(70).getlength(' '.join(x[0] for x in row))<1035 for row in tokens),'Caption row too wide'
 def display(active):return '\\N'.join(' '.join(('{\\c&H008BD1F4&}' if i==active else '{\\c&H00F1F6F6&}')+t for t,i in row) for row in tokens)
 bounds=sorted(set([begin,end]+[t for w in vw for t in [w['start'],w['end']] if begin<t<end]))
 for a,b in zip(bounds,bounds[1:]):
  mid=(a+b)/2;active=next((i for i,w in enumerate(vw) if w['start']<=mid<w['end']),None)
  events.append(f'Dialogue: 0,{at(a)},{at(b)},Default,,0,0,0,,{{\\pos(76,410)}}'+display(active))
 timeline.append({'verse':vi+1,'start':begin,'end':end,'text':'\n'.join(rows),'words':vw})
(ROOT/'telugu-captions.ass').write_text(header+'\n'.join(events)+'\n',encoding='utf-8-sig')
(ROOT/'telugu-captions.srt').write_text('\n\n'.join(f"{i+1}\n{st(u['start'])} --> {st(u['end'])}\n{u['text']}" for i,u in enumerate(timeline))+'\n',encoding='utf8')
(ROOT/'corrected-lyrics-telugu.txt').write_text('\n\n'.join('\n'.join(v) for v in verses)+'\n',encoding='utf8')
# Ending card: the exact requested English channel name and complete Telugu calls to action.
closing=im.copy();d=ImageDraw.Draw(closing);d.rectangle((0,160,1020,1080),fill=(43,57,24))
d.text((75,205),'శ్రీ వేంకటేశాయ నమః',font=te(47),fill=gold)
d.text((75,330),'Sri Venkateswara',font=en(64),fill=white)
d.text((75,415),'Suprabhatham',font=en(64),fill=white)
d.line((76,525,965,525),fill='#a59c58',width=2)
d.rounded_rectangle((76,574,965,658),radius=14,fill='#a53e27')
d.text((520,614),'SUBSCRIBE  •  LIKE',font=en(43),fill='#ffffff',anchor='mm')
d.text((76,699),'SHARE  •  COMMENT',font=en(43),fill=gold)
cta=['మా ఛానల్‌కు సబ్‌స్క్రైబ్ చేయండి','వీడియోను లైక్ చేయండి, షేర్ చేయండి','మీ అభిప్రాయాన్ని కామెంట్‌లో తెలియజేయండి']
for i,line in enumerate(cta):
 assert te(32).getlength(line)<950
 d.text((76,821+i*62),line,font=te(32),fill=white)
closing.save(ROOT/'channel-ending-card.jpg',quality=96)
prayer=ROOT/'corrected-prayer.mp4'
if not prayer.exists():
 ass=str(ROOT/'telugu-captions.ass').replace('\\','/')
 run(['ffmpeg','-v','error','-nostdin','-n','-loop','1','-i',str(ROOT/'prayer-background.jpg'),'-i',str(SRC/'song.mp3'),'-vf',f"fps=24,ass=filename='{ass}':fontsdir='public/fonts':shaping=complex,format=yuv420p",'-t',str(duration),'-c:v','libx264','-preset','veryfast','-crf','19','-threads','4','-c:a','aac','-b:a','192k','-ar','48000','-ac','2',str(prayer)])
ending=ROOT/'ending.mp4'
if not ending.exists():
 run(['ffmpeg','-v','error','-nostdin','-n','-loop','1','-i',str(ROOT/'channel-ending-card.jpg'),'-ss','95','-i','output/sri-venkateswara-instrumental-2026-10-20/instrumental.mp3','-t','6','-vf','fps=24,format=yuv420p','-af','volume=0.10,afade=t=in:d=0.4,afade=t=out:st=4.5:d=1.5','-c:v','libx264','-preset','veryfast','-crf','19','-threads','4','-c:a','aac','-b:a','192k','-ar','48000','-ac','2',str(ending)])
(ROOT/'video.ffconcat').write_text("file 'corrected-prayer.mp4'\nfile 'ending.mp4'\n",encoding='utf8')
out=ROOT/'Sri-Venkateswara-Corrected-Telugu-With-Channel-Ending-1080p.mp4'
if not out.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'video.ffconcat'),'-c','copy','-movflags','+faststart',str(out)])
run(['ffmpeg','-v','error','-nostdin','-i',str(out),'-f','null','-'])
p=probe(out);seconds=float(p['format']['duration']);assert 28<seconds<28.5
v=next(s for s in p['streams'] if s['codec_type']=='video');assert(v['width'],v['height'])==(1920,1080)
record={'seconds':seconds,'fullDecodePassed':True,'channelName':'Sri Venkateswara Suprabhatham','endingSeconds':6,'correctedSpacing':'పూర్వా సంధ్యా','captionTimingSource':'Independent Scribe transcription of the approved audio','recordedWordsMatchPrayer':True,'wordCount':19,'audioSource':str(SRC/'song.mp3'),'audioSourceSha256':hashlib.sha256((SRC/'song.mp3').read_bytes()).hexdigest(),'voiceRegenerated':False,'tempoChanged':False,'fullPronunciationListeningReviewPending':True,'sources':['https://stotranidhi.com/venkateshwara-suprabhatam-in-telugu/','https://www.tirumala.org/Suprabhatam.aspx'],'teluguCta':cta,'timeline':timeline}
(ROOT/'verification.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'video':str(out.resolve()),'seconds':seconds,'correctedCaptionWords':19,'endingAdded':True}))
