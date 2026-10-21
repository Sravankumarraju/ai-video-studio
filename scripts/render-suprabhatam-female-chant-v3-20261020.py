from pathlib import Path
import json,subprocess,re
from PIL import Image,ImageDraw,ImageFont,ImageOps
ROOT=Path('output/sri-venkateswara-female-chant-v3-2026-10-20')
ART=Path('data/productions/divine-wisdom/venkateswara/suprabhatam-2026-10-19/full-approved-natural-v3/art/02-venkateswara-portrait.png')
def run(a):subprocess.run(a,check=True)
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]))
def at(t):
 n=round(t*100);return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'
def st(t):
 n=round(t*1000);return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
def norm(t):return ''.join(c for c in t if '\u0c00'<=c<='\u0c7f')
fontpath='public/fonts/NotoSansTelugu.ttf';f=ImageFont.truetype(fontpath,67)
text=(ROOT/'lyrics-telugu.txt').read_text(encoding='utf8').strip()
blocks=text.split('\n\n');assert len(blocks)==2
meta=json.loads((ROOT/'song-metadata.json').read_text(encoding='utf8'))
words=[{'text':w['word'],'start':w['start_ms']/1000,'end':w['end_ms']/1000} for w in meta['words_timestamps'] if norm(w['word'])]
expected=[w for w in text.split() if norm(w)]
assert [norm(w) for w in expected]==[norm(w['text']) for w in words],'Timestamp lyrics mismatch'
assert all(w['end']>w['start'] for w in words)
duration=float(probe(ROOT/'song.mp3')['format']['duration'])
# Original olive-green lyric-card composition with devotional art at the right.
im=Image.new('RGB',(1920,1080));d=ImageDraw.Draw(im)
for y in range(1080):
 t=y/1080;d.line((0,y,1920,y),fill=(round(37+17*(1-t)),round(50+15*(1-t)),round(22+6*(1-t))))
art=Image.open(ART).convert('RGB');art=art.crop((0,0,int(art.width*.63),art.height))
art=ImageOps.fit(art,(820,1080),centering=(.5,.5));im.paste(art,(1100,0))
shade=Image.new('RGBA',im.size,(0,0,0,0));s=ImageDraw.Draw(shade)
for x in range(1020,1310):
 alpha=round(255*(1-(x-1020)/290));s.line((x,0,x,1080),fill=(43,57,24,alpha))
im=Image.alpha_composite(im.convert('RGBA'),shade).convert('RGB');d=ImageDraw.Draw(im)
d.text((74,65),'Sri Venkateswara Suprabhatham',font=ImageFont.truetype('public/fonts/NotoSans.ttf',38),fill='#ead8a5')
d.line((76,138,1035,138),fill='#a59c58',width=2)
d.text((74,205),'శ్రీ వేంకటేశ్వర సుప్రభాతం',font=ImageFont.truetype(fontpath,56),fill='#f5df9b')
d.text((76,1010),'స్త్రీ స్వరం • లయబద్ధ శ్లోక పఠనం',font=ImageFont.truetype(fontpath,29),fill='#d3cfab')
im.save(ROOT/'lyric-background.jpg',quality=96)
header='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Noto Sans Telugu,67,&H00F1F6F6,&H00F1F6F6,&H00182014,&H00000000,0,0,0,0,100,100,0,0,1,0.5,0,7,70,820,0,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
events=[];timeline=[];cursor=0
for bi,block in enumerate(blocks):
 count=len([w for w in block.split() if norm(w)]);bw=words[cursor:cursor+count];cursor+=count
 # Break source lines at complete words, keeping each stanza on screen.
 rows=[];row=[];idx=0
 for sourceLine in block.splitlines():
  row=[]
  for token in sourceLine.split():
   if not norm(token):
    if row:row[-1][0]+=' '+token
    continue
   trial=' '.join([r[0] for r in row]+[token])
   if row and f.getlength(trial)>990:rows.append(row);row=[]
   row.append([token,idx]);idx+=1
  if row:rows.append(row)
 assert idx==len(bw)
 begin=0 if bi==0 else bw[0]['start']
 finish=words[cursor]['start'] if cursor<len(words) else duration
 def stanza(active=None):
  return '\\N'.join(' '.join(('{'+'\\c&H008BD1F4&'+'}' if wi==active else '{\\c&H00F1F6F6&}')+token for token,wi in row) for row in rows)
 # Keep the full stanza visible; change only current-word color at actual timings.
 bounds=sorted(set([begin,finish]+[v for w in bw for v in [w['start'],w['end']] if begin<v<finish]))
 for start,end in zip(bounds,bounds[1:]):
  mid=(start+end)/2;active=next((i for i,w in enumerate(bw) if w['start']<=mid<w['end']),None)
  events.append(f'Dialogue: 0,{at(start)},{at(end)},Default,,0,0,0,,{{\\pos(76,415)}}'+stanza(active))
 timeline.append({'verse':bi+1,'start':begin,'end':finish,'text':block,'rows':len(rows),'words':bw})
(ROOT/'telugu-captions.ass').write_text(header+'\n'.join(events)+'\n',encoding='utf-8-sig')
(ROOT/'telugu-captions.srt').write_text('\n\n'.join(f"{i+1}\n{st(u['start'])} --> {st(u['end'])}\n{u['text']}" for i,u in enumerate(timeline))+'\n',encoding='utf8')
(ROOT/'caption-audit.json').write_text(json.dumps({'timingSource':'ElevenLabs Music word timestamps','sourceTextMatchesTimestamps':True,'verseCount':2,'wordCount':len(words),'stanzas':timeline,'humanListeningReviewPending':True},ensure_ascii=False,indent=2),encoding='utf8')
out=ROOT/'Sri-Venkateswara-Female-Chant-V3-Telugu-Sample-1080p.mp4'
if not out.exists():
 ass=str(ROOT/'telugu-captions.ass').replace('\\','/')
 run(['ffmpeg','-v','error','-nostdin','-n','-loop','1','-i',str(ROOT/'lyric-background.jpg'),'-i',str(ROOT/'song.mp3'),'-vf',f"fps=24,ass=filename='{ass}':fontsdir='public/fonts',format=yuv420p",'-t',str(duration),'-c:v','libx264','-preset','veryfast','-crf','19','-threads','4','-c:a','aac','-b:a','192k','-movflags','+faststart',str(out)])
run(['ffmpeg','-v','error','-nostdin','-i',str(out),'-f','null','-'])
p=probe(out);v=next(s for s in p['streams'] if s['codec_type']=='video');assert(v['width'],v['height'])==(1920,1080)
assert abs(float(p['format']['duration'])-duration)<.15
(ROOT/'verification.json').write_text(json.dumps({'durationSeconds':duration,'fullDecodePassed':True,'width':1920,'height':1080,'prayerVerses':2,'edition':'Compact original female rhythmic stotra chant sample','reference':'https://www.youtube.com/watch?v=krGYd5tZe0A','referenceElements':'Measured Carnatic female devotional phrasing, sustained tanpura, sparse accompaniment, olive lyric-card layout','originalSingerAndMelody':True,'designedTtsVoiceUsed':False,'pronunciationAndMusicalListeningReviewPending':True},indent=2),encoding='utf8')
print(json.dumps({'video':str(out.resolve()),'seconds':duration,'wordCount':len(words)}))
