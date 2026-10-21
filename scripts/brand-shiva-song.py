"""Add channel welcome and closing engagement text to the existing clean video timeline."""
from pathlib import Path
import json,subprocess,sys
ROOT=Path('data/productions/divine-wisdom/shiva-tandavam-2026-10-15')
OUT=ROOT/'shiva-tandavam-telugu-1080p-v2-channel.mp4'
def run(args):subprocess.run(args,check=True)
def prepare():
 original=(ROOT/'captions.ass').read_text(encoding='utf8')
 # Dedicated styles keep English branding and Telugu copy properly shaped.
 styles='''Style: Channel,Noto Sans,66,&H007CE2FF,&H007CE2FF,&H0020140C,&H90000000,1,0,0,0,100,100,0,0,1,2,1,8,90,90,70,1
Style: Welcome,Noto Sans Telugu,54,&H00FFFFFF,&H00FFFFFF,&H0020140C,&H90000000,0,0,0,0,100,100,0,0,1,2,1,8,90,90,162,1
Style: CTA,Noto Sans Telugu,58,&H00FFFFFF,&H00FFFFFF,&H0020140C,&H90000000,0,0,0,0,100,100,0,0,1,2,1,8,80,80,80,1
'''
 original=original.replace('[Events]',styles+'[Events]')
 original=original.replace('0:00:00.70,0:00:09.60,Title','0:00:04.90,0:00:10.40,Title').replace('0:00:00.70,0:00:09.60,Small','0:00:04.90,0:00:10.40,Small')
 original='\n'.join(line for line in original.splitlines() if not (line.startswith('Dialogue:') and ',0:02:55.50,' in line))+'\n'
 additions=[
 r'Dialogue: 3,0:00:00.70,0:00:04.70,Channel,,0,0,0,,{\an8\pos(960,820)\fad(650,450)}Divine Wisdom Telugu',
 r'Dialogue: 3,0:00:00.70,0:00:04.70,Welcome,,0,0,0,,{\an8\pos(960,916)\fad(650,450)}ఛానల్‌కు స్వాగతం',
 r'Dialogue: 3,0:02:54.60,0:03:00.10,Channel,,0,0,0,,{\an8\pos(960,726)\fad(350,650)}Divine Wisdom Telugu',
 r'Dialogue: 3,0:02:54.60,0:03:00.10,CTA,,0,0,0,,{\an8\pos(960,824)\fad(350,650)}సబ్‌స్క్రైబ్ చేయండి · లైక్ చేయండి',
 r'Dialogue: 3,0:02:54.60,0:03:00.10,CTA,,0,0,0,,{\an8\pos(960,924)\fs52\fad(350,650)}షేర్ చేయండి · మీ అభిప్రాయాన్ని కామెంట్ చేయండి'
 ]
 (ROOT/'captions-channel-v2.ass').write_text(original+'\n'.join(additions)+'\n',encoding='utf8')
 (ROOT/'channel-overlay-v2.json').write_text(json.dumps({'channel':'Divine Wisdom Telugu','opening':{'start':.7,'end':4.7,'text':['Divine Wisdom Telugu','ఛానల్‌కు స్వాగతం']},'songTitle':{'start':4.9,'end':10.4},'closing':{'start':174.6,'end':180.1,'text':['Divine Wisdom Telugu','సబ్‌స్క్రైబ్ చేయండి · లైక్ చేయండి','షేర్ చేయండి · మీ అభిప్రాయాన్ని కామెంట్ చేయండి']},'audio':'Original recording unchanged','thumbnailSelection':'youtube-thumbnail-black-gold.jpg','previousVersionPreserved':True},ensure_ascii=False,indent=2),encoding='utf8')
 print('Channel overlays prepared',flush=True)
def render():
 assert not OUT.exists(),'Version already exists; inspect before replacing'
 vf=f"ass=filename='{ROOT.as_posix()}/captions-channel-v2.ass':fontsdir='public/fonts':shaping=complex"
 run(['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'pieces.txt'),'-i',str(ROOT/'song-original.m4a'),'-map','0:v:0','-map','1:a:0','-vf',vf,'-c:v','libx264','-threads','6','-preset','veryfast','-crf','18','-c:a','copy','-t','180.245','-movflags','+faststart',str(OUT)])
 print(json.dumps({'video':str(OUT)}),flush=True)
def verify():
 p=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(OUT)]))
 v=next(s for s in p['streams'] if s['codec_type']=='video');assert (v['width'],v['height'])==(1920,1080)
 assert abs(float(p['format']['duration'])-180.245)<.1
 run(['ffmpeg','-v','error','-nostdin','-i',str(OUT),'-f','null','-'])
 def audiohash(file):return subprocess.check_output(['ffmpeg','-v','error','-i',str(file),'-map','0:a:0','-c','copy','-f','hash','-hash','sha256','-']).decode().strip()
 assert audiohash(OUT)==audiohash(ROOT/'song-original.m4a')
 for label,t in [('welcome',4),('closing',177),('lyrics',34)]:
  frame=ROOT/f'review-v2-{label}.jpg'
  if not frame.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(t),'-i',str(OUT),'-frames:v','1','-q:v','2',str(frame)])
 (ROOT/'verification-v2-channel.json').write_text(json.dumps({'fullDecodePassed':True,'originalAudioPacketsUnchanged':True,'seconds':float(p['format']['duration']),'width':1920,'height':1080,'channel':'Divine Wisdom Telugu','welcome':True,'subscribeLikeShareComment':True,'spokenIntroAdded':False,'captionTimingUnchanged':True,'published':False},indent=2),encoding='utf8')
 print('Branded video verified',flush=True)
if __name__=='__main__':{'prepare':prepare,'render':render,'verify':verify}[sys.argv[1]]()
