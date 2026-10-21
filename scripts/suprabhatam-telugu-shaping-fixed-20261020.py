from pathlib import Path
import json,subprocess,shutil
from PIL import Image,ImageDraw,ImageFont
SRC=Path('output/sri-venkateswara-female-chant-v3-2026-10-20')
OLD=Path('output/sri-venkateswara-approved-corrected-2026-10-20')
ROOT=Path('output/sri-venkateswara-telugu-shaping-fixed-2026-10-20');ROOT.mkdir(exist_ok=True)
def run(a):subprocess.run(a,check=True)
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]))
def at(t):
 n=round(t*100);return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'
seconds=float(probe(SRC/'song.mp3')['format']['duration'])
im=Image.open(SRC/'lyric-background.jpg').convert('RGB')
d=ImageDraw.Draw(im);d.rectangle((0,160,1020,1080),fill=(43,57,24))
im.save(ROOT/'prayer-background.jpg',quality=96)
base=(OLD/'telugu-captions.ass').read_text(encoding='utf-8-sig')
header=base[:base.index('[Events]')]+'''[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
def event(text,x,y,size,start,end,color='&H009BDFF5&'):
 return f'Dialogue: 2,{at(start)},{at(end)},Default,,0,0,0,,{{\\an7\\pos({x},{y})\\fs{size}\\c{color}\\bord0}}{text}'
prayer=base+event('శ్రీ వేంకటేశ్వర సుప్రభాతం',74,205,56,0,seconds)+'\n'+event('శ్రీ వేంకటేశాయ నమః',76,1012,31,0,seconds)+'\n'
(ROOT/'telugu-captions.ass').write_text(prayer,encoding='utf-8-sig')
shutil.copyfile(OLD/'telugu-captions.srt',ROOT/'telugu-captions.srt')
closing=im.copy();d=ImageDraw.Draw(closing)
en=lambda n:ImageFont.truetype('public/fonts/NotoSans.ttf',n)
white='#f3f5e9';gold='#f5df9b'
d.text((75,330),'Sri Venkateswara',font=en(64),fill=white)
d.text((75,415),'Suprabhatham',font=en(64),fill=white)
d.line((76,580,965,580),fill='#a59c58',width=2)
d.rounded_rectangle((76,610,965,694),radius=14,fill='#a53e27')
d.text((520,650),'SUBSCRIBE  •  LIKE',font=en(43),fill='#ffffff',anchor='mm')
d.text((76,730),'SHARE  •  COMMENT',font=en(43),fill=gold)
closing.save(ROOT/'ending-background.jpg',quality=96)
texts=[('శ్రీ వేంకటేశాయ నమః',75,205,47),('శ్రీ వేంకటేశ్వర సుప్రభాతం',76,510,54),('మా ఛానల్‌కు సబ్‌స్క్రైబ్ చేయండి',76,835,44),('వీడియోను లైక్ చేయండి, షేర్ చేయండి',76,897,44),('మీ అభిప్రాయాన్ని కామెంట్‌లో తెలియజేయండి',76,959,44)]
(ROOT/'ending-telugu.ass').write_text(header+'\n'.join(event(t,x,y,s,0,6) for t,x,y,s in texts)+'\n',encoding='utf-8-sig')
prayerclip=ROOT/'prayer.mp4'
if not prayerclip.exists():
 ass=str(ROOT/'telugu-captions.ass').replace('\\','/')
 run(['ffmpeg','-v','error','-nostdin','-n','-loop','1','-i',str(ROOT/'prayer-background.jpg'),'-i',str(SRC/'song.mp3'),'-vf',f"fps=24,ass=filename='{ass}':fontsdir='public/fonts':shaping=complex,format=yuv420p",'-t',str(seconds),'-c:v','libx264','-preset','veryfast','-crf','19','-threads','4','-c:a','aac','-b:a','192k','-ar','48000','-ac','2',str(prayerclip)])
ending=ROOT/'ending-readable.mp4'
if not ending.exists():
 ass=str(ROOT/'ending-telugu.ass').replace('\\','/')
 run(['ffmpeg','-v','error','-nostdin','-n','-loop','1','-i',str(ROOT/'ending-background.jpg'),'-ss','95','-i','output/sri-venkateswara-instrumental-2026-10-20/instrumental.mp3','-t','6','-vf',f"fps=24,ass=filename='{ass}':fontsdir='public/fonts':shaping=complex,format=yuv420p",'-af','volume=0.10,afade=t=in:d=0.4,afade=t=out:st=4.5:d=1.5','-c:v','libx264','-preset','veryfast','-crf','19','-threads','4','-c:a','aac','-b:a','192k','-ar','48000','-ac','2',str(ending)])
(ROOT/'video.ffconcat').write_text("file 'prayer.mp4'\nfile 'ending-readable.mp4'\n",encoding='utf8')
out=ROOT/'Sri-Venkateswara-Telugu-Corrected-Final-1080p.mp4'
if not out.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'video.ffconcat'),'-c','copy','-movflags','+faststart',str(out)])
run(['ffmpeg','-v','error','-nostdin','-i',str(out),'-f','null','-'])
p=probe(out);duration=float(p['format']['duration']);assert 28<duration<28.5
v=next(s for s in p['streams'] if s['codec_type']=='video');assert(v['width'],v['height'])==(1920,1080)
run(['ffmpeg','-v','error','-nostdin','-n','-ss','25','-i',str(out),'-frames:v','1',str(ROOT/'ending-preview.png')])
run(['ffmpeg','-v','error','-nostdin','-n','-ss','3.3','-i',str(out),'-frames:v','1',str(ROOT/'caption-preview.png')])
(ROOT/'verification.json').write_text(json.dumps({'fullDecodePassed':True,'seconds':duration,'allTeluguRenderedWith':'libass complex shaping, HarfBuzz, Noto Sans Telugu','noTeluguDrawnWithPillow':True,'rootCause':'Pillow runtime has no RAQM, HarfBuzz or FriBidi support; earlier static titles and ending text were not shaped.','teluguChannelName':'శ్రీ వేంకటేశ్వర సుప్రభాతం','englishChannelName':'Sri Venkateswara Suprabhatham','endingText':[t[0] for t in texts],'approvedAudioReused':True,'wordTimingSource':'Independent Scribe transcript','newPaidCalls':0},ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'video':str(out.resolve()),'endingPreview':str((ROOT/'ending-preview.png').resolve()),'seconds':duration}))

