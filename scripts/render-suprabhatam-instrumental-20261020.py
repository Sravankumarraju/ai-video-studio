from pathlib import Path
import json,subprocess,shutil
from PIL import Image,ImageDraw,ImageFont,ImageOps
ROOT=Path('output/sri-venkateswara-instrumental-2026-10-20')
SOURCE=Path('data/productions/divine-wisdom/venkateswara/suprabhatam-2026-10-19/full-approved-natural-v3')
ROOT.mkdir(exist_ok=True,parents=True)
(ROOT/'cards').mkdir(exist_ok=True)
FONT='public/fonts/NotoSansTelugu.ttf'
EN='public/fonts/NotoSans.ttf'
def font(size):return ImageFont.truetype(FONT,size)
def run(args):subprocess.run(args,check=True)
verses=(SOURCE/'complete-lyrics-telugu.txt').read_text(encoding='utf8').strip().split('\n\n')
assert len(verses)==29
arts=sorted((SOURCE/'art').glob('*.png'))
gold='#f4d18b';white='#fff7e5'
def card(name,art,lines,verse=None,cover=False):
 im=ImageOps.fit(Image.open(art).convert('RGB'),(1920,1080))
 layer=Image.new('RGBA',im.size,(0,0,0,0));d=ImageDraw.Draw(layer)
 d.rounded_rectangle((930,27,1890,94),radius=18,fill=(5,12,22,195))
 d.text((1860,59),'Sri Venkateswara Suprabhatham',font=ImageFont.truetype(EN,34),fill=gold,anchor='rm')
 top=650
 d.rectangle((0,top,1920,1080),fill=(3,9,18,225))
 if verse:d.text((960,top+37),f'శ్లోకం {verse} / 29',font=font(32),fill=gold,anchor='mm')
 size=64 if cover else 53
 while size>35:
  f=font(size)
  if max(d.textbbox((0,0),t,font=f)[2] for t in lines)<1770:break
  size-=1
 step=size+21
 start=top+85 if verse else top+70
 for i,t in enumerate(lines):d.text((960,start+i*step),t,font=f,fill=white,anchor='mt')
 d.text((960,1043),'వాయిద్య సంగీతం • తెలుగు శ్లోకాలు',font=font(29),fill=gold,anchor='mm')
 im=Image.alpha_composite(im.convert('RGBA'),layer).convert('RGB')
 im.save(ROOT/'cards'/name,quality=94)
 return im
opening=card('00.jpg',arts[1],['శ్రీ వేంకటేశ్వర సుప్రభాతం','వాయిద్య సంగీతంతో ధ్యానం'],cover=True)
scenes=[('00.jpg',8)]
for i,v in enumerate(verses):
 name=f'{i+1:02}.jpg'
 card(name,arts[(i//3)%len(arts)],v.splitlines(),i+1)
 scenes.append((name,16))
card('30.jpg',arts[5],['శ్రీ వేంకటేశాయ నమః','సబ్‌స్క్రైబ్ చేయండి'],cover=True)
scenes.append(('30.jpg',8))
opening.resize((1280,720),Image.Resampling.LANCZOS).save(ROOT/'thumbnail.jpg',quality=95)
concat=''.join(f"file 'cards/{name}'\nduration {seconds}\n" for name,seconds in scenes)+"file 'cards/30.jpg'\n"
(ROOT/'cards.ffconcat').write_text(concat,encoding='utf8')
def stamp(s):return f'{s//3600:02}:{s//60%60:02}:{s%60:02},000'
(ROOT/'telugu-verses.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(8+i*16)} --> {stamp(24+i*16)}\n{v}' for i,v in enumerate(verses))+'\n',encoding='utf8')
shutil.copyfile(SOURCE/'complete-lyrics-telugu.txt',ROOT/'complete-lyrics-telugu.txt')
metadata={'title':'శ్రీ వేంకటేశ్వర సుప్రభాతం | Instrumental Meditation | Telugu Verses',
 'channel':'Sri Venkateswara Suprabhatham','durationSeconds':480,'audioProvider':'ElevenLabs','model':'music_v2_5',
 'edition':'Original instrumental music with all 29 traditional verses displayed in Telugu script; no sung vocal.',
 'musicArrangement':'Three-minute original composition repeated with three-second crossfades, trimmed to eight minutes.',
 'source':'https://vignanam.org/telugu/sri-venkateswara-suprabhatam.html',
 'sourceFile':str(SOURCE/'complete-lyrics-telugu.txt'),'visuals':'Nine existing original AI illustrations from the local production library.',
 'published':False,'humanListeningReview':'Pending'}
(ROOT/'production.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf8')
(ROOT/'youtube-description.txt').write_text('శ్రీ వేంకటేశ్వర సుప్రభాతం — వాయిద్య సంగీతంతో ధ్యానం.\n\nOriginal AI-generated instrumental devotional music created with ElevenLabs. All 29 traditional Suprabhatam verses are displayed in Telugu script for reading. This edition contains instrumental music, without sung or spoken recitation. Music repeats with crossfades. Original AI devotional illustrations.\n\nChannel: Sri Venkateswara Suprabhatham\nText source: https://vignanam.org/telugu/sri-venkateswara-suprabhatam.html\n\n#Venkateswara #Suprabhatam #Telugu #DevotionalMusic\n',encoding='utf8')
print(json.dumps({'preparedCards':len(scenes),'verses':len(verses),'seconds':480}),flush=True)
if __import__('sys').argv[-1]=='prepare':raise SystemExit
audio=ROOT/'instrumental.mp3'
assert audio.exists(),'Finish ElevenLabs generation first'
master=ROOT/'instrumental-eight-minutes.m4a'
if not master.exists():
 run(['ffmpeg','-v','error','-nostdin','-n','-i',str(audio),'-i',str(audio),'-i',str(audio),'-filter_complex','[0:a][1:a]acrossfade=d=3:c1=tri:c2=tri[a];[a][2:a]acrossfade=d=3:c1=tri:c2=tri,atrim=0:480,afade=t=in:d=2,afade=t=out:st=474:d=6,alimiter=limit=0.89:level=false[out]','-map','[out]','-ar','48000','-ac','2','-c:a','aac','-b:a','192k',str(master)])
video=ROOT/'Sri-Venkateswara-Suprabhatham-Instrumental-Telugu-1080p.mp4'
if not video.exists():
 run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'cards.ffconcat'),'-i',str(master),'-vf','fps=24,format=yuv420p','-t','480','-c:v','libx264','-preset','veryfast','-crf','20','-threads','4','-c:a','copy','-movflags','+faststart',str(video)])
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(video)]))
v=next(s for s in probe['streams'] if s['codec_type']=='video')
assert(v['width'],v['height'])==(1920,1080)
assert abs(float(probe['format']['duration'])-480)<.3
run(['ffmpeg','-v','error','-nostdin','-i',str(video),'-f','null','-'])
probe['fullDecodePassed']=True;probe['verseCount']=len(verses)
(ROOT/'verification.json').write_text(json.dumps(probe,indent=2),encoding='utf8')
print(json.dumps({'completed':str(video.resolve()),'seconds':probe['format']['duration'],'fullDecodePassed':True}),flush=True)

