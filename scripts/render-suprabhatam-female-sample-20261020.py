from pathlib import Path
import json,re,subprocess
from PIL import Image,ImageOps,ImageDraw,ImageFont
ROOT=Path('output/sri-venkateswara-female-voice-2026-10-20')
ART=Path('data/productions/divine-wisdom/venkateswara/suprabhatam-2026-10-19/full-approved-natural-v3/art/02-venkateswara-portrait.png')
def run(a):subprocess.run(a,check=True)
def duration(p):return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(p)]))
def at(t):
 n=round(t*100);return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'
def st(t):
 n=round(t*1000);return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
a=json.loads((ROOT/'sample-alignment.json').read_text(encoding='utf8'))
raw='';starts=[];ends=[]
for c,s,e in zip(a['characters'],a['character_start_times_seconds'],a['character_end_times_seconds']):
 raw+=c;starts.extend([s]*len(c));ends.extend([e]*len(c))
def valid(c):return '\u0c00'<=c<='\u0c7f'
indices=[i for i,c in enumerate(raw) if valid(c)]
norm=''.join(raw[i] for i in indices)
text=(ROOT/'sample-lyrics-telugu.txt').read_text(encoding='utf8').strip()
target=''.join(c for c in text if valid(c))
assert target in norm,'Source does not match alignment; review before rendering'
cursor=norm.index(target);lines=[]
for line in text.splitlines():
 if not line.strip():continue
 words=[]
 for word in line.split():
  nw=''.join(c for c in word if valid(c))
  if not nw:continue
  pos=norm.index(nw,cursor);stop=pos+len(nw);cursor=stop
  words.append({'text':word,'start':starts[indices[pos]],'end':ends[indices[stop-1]]})
 lines.append({'text':line,'words':words,'start':words[0]['start'],'end':words[-1]['end']})
total=duration(ROOT/'sample.mp3')
assert all(w['end']>w['start'] for l in lines for w in l['words']),'Collapsed word timing'
im=ImageOps.fit(Image.open(ART).convert('RGB'),(1920,1080)).convert('RGBA')
layer=Image.new('RGBA',im.size,(0,0,0,0));d=ImageDraw.Draw(layer)
d.rectangle((0,735,1920,1080),fill=(3,9,18,230))
d.rounded_rectangle((905,25,1890,95),radius=18,fill=(3,9,18,205))
d.text((1860,61),'Sri Venkateswara Suprabhatham',font=ImageFont.truetype('public/fonts/NotoSans.ttf',34),fill='#f4d18b',anchor='rm')
d.text((960,780),'శ్రీ వేంకటేశ్వర సుప్రభాతం',font=ImageFont.truetype('public/fonts/NotoSansTelugu.ttf',45),fill='#f4d18b',anchor='mm')
d.text((960,1030),'స్త్రీ స్వరం • ప్రారంభ రెండు శ్లోకాల నమూనా',font=ImageFont.truetype('public/fonts/NotoSansTelugu.ttf',31),fill='#f4d18b',anchor='mm')
Image.alpha_composite(im,layer).convert('RGB').save(ROOT/'sample-background.jpg',quality=95)
header='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Noto Sans Telugu,68,&H008BD1F4,&H00F0F7FF,&H00120A03,&H00000000,0,0,0,0,100,100,0,0,1,1,0,5,40,40,0,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
events=[]
for i,l in enumerate(lines):
 end=lines[i+1]['start'] if i+1<len(lines) else min(total,l['end']+.35)
 l['displayEnd']=end
 parts=[]
 for j,w in enumerate(l['words']):
  nxt=l['words'][j+1]['start'] if j+1<len(l['words']) else l['end']
  parts.append('{\\kf'+str(max(1,round((nxt-w['start'])*100)))+'}'+w['text'])
 events.append(f"Dialogue: 0,{at(l['start'])},{at(end)},Default,,0,0,0,,{{\\pos(960,900)}}"+' '.join(parts))
(ROOT/'telugu-captions.ass').write_text(header+'\n'.join(events)+'\n',encoding='utf-8-sig')
(ROOT/'telugu-captions.srt').write_text('\n\n'.join(f"{i+1}\n{st(l['start'])} --> {st(l['displayEnd'])}\n{l['text']}" for i,l in enumerate(lines))+'\n',encoding='utf8')
(ROOT/'caption-timing.json').write_text(json.dumps({'seconds':total,'lines':lines,'timingSource':'ElevenLabs character alignment','listeningReviewPending':True},ensure_ascii=False,indent=2),encoding='utf8')
dst=ROOT/'Sri-Venkateswara-Female-Voice-Telugu-Sample-1080p.mp4'
if not dst.exists():
 ass=str(ROOT/'telugu-captions.ass').replace('\\','/')
 run(['ffmpeg','-v','error','-nostdin','-n','-loop','1','-i',str(ROOT/'sample-background.jpg'),'-i',str(ROOT/'sample.mp3'),'-stream_loop','-1','-i','output/sri-venkateswara-instrumental-2026-10-20/instrumental.mp3','-filter_complex',f"[0:v]fps=24,ass=filename='{ass}':fontsdir='public/fonts',format=yuv420p[v];[1:a]apad,atrim=duration={total},volume=1.0[voice];[2:a]atrim=duration={total},volume=0.07,afade=t=out:st={max(0,total-2)}:d=2[bed];[voice][bed]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.89:level=false[a]",'-map','[v]','-map','[a]','-t',str(total),'-c:v','libx264','-preset','veryfast','-crf','20','-threads','4','-c:a','aac','-b:a','192k','-movflags','+faststart',str(dst)])
run(['ffmpeg','-v','error','-nostdin','-i',str(dst),'-f','null','-'])
assert abs(duration(dst)-total)<.15
(ROOT/'verification.json').write_text(json.dumps({'fullDecodePassed':True,'seconds':total,'sampleVerses':[1,2],'synchronizedTeluguLines':len(lines),'wordCount':sum(len(l['words']) for l in lines),'audio':'New original female designed voice, devotional recitation, quiet instrumental accompaniment','fullPrayerCompleted':False,'pronunciationListeningReviewPending':True},indent=2),encoding='utf8')
print(json.dumps({'video':str(dst.resolve()),'seconds':total,'lines':len(lines)}))

