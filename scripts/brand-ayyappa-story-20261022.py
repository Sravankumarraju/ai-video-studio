from pathlib import Path
import json,subprocess,sys
from PIL import Image,ImageDraw
ROOT=Path('data/productions/divine-wisdom/ayyappa-birth-story-three-part-2026-10-22')
SHORT='--short' in sys.argv
SOURCE=ROOT/('Ayyappa-Hariharasutuni-Avataram-Branded-1080p.mp4' if SHORT else 'Ayyappa-Hariharasutuni-Avataram-Telugu-1080p.mp4')
OUT=ROOT/('Ayyappa-Hariharasutuni-Avataram-Final-4m23s-1080p.mp4' if SHORT else 'Ayyappa-Hariharasutuni-Avataram-Branded-1080p.mp4')
ENDING=257.0 if SHORT else 294.0
ASS='channel-bookends-short.ass' if SHORT else 'channel-bookends.ass'
LOGO=Path('data/branding/divine-wisdom/youtube-avatar/divine-wisdom-telugu-circle-safe.png')
def run(a):subprocess.run(a,check=True)
def probe(f):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(f)]))
def save(n,v):(ROOT/f'{n}.json').write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
def stamp(t):
 n=round(t*100);return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'
def prepare():
 total=263.0 if SHORT else float(probe(SOURCE)['format']['duration']);ending=ENDING
 header='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Welcome,Noto Sans Telugu,45,&H00FFFFFF,&H00FFFFFF,&H00140F0B,&H90000000,0,0,0,0,100,100,0,0,1,2,1,5,70,70,40,1
Style: Channel,Noto Sans,60,&H0096DFFF,&H0096DFFF,&H00140F0B,&H90000000,1,0,0,0,100,100,0,0,1,2,1,5,70,70,40,1
Style: CTA,Noto Sans Telugu,60,&H0096DFFF,&H0096DFFF,&H00140F0B,&H90000000,0,0,0,0,100,100,0,0,1,2,1,5,70,70,40,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
 events=[]
 def event(a,b,style,text):events.append(f'Dialogue: 3,{stamp(a)},{stamp(b)},{style},,0,0,0,,{text}')
 if not SHORT:event(.15,5.5,'Welcome',r'{\pos(960,145)\fad(250,500)}డివైన్ విజ్డమ్ తెలుగు ఛానల్‌కు స్వాగతం')
 event(ending+.25,total-.25,'Channel',r'{\pos(960,640)\fad(350,350)}DIVINE WISDOM TELUGU')
 event(ending+.25,total-.25,'CTA',r'{\pos(960,765)\fad(350,350)}సబ్‌స్క్రైబ్ చేయండి · లైక్ చేయండి')
 event(ending+.25,total-.25,'Welcome',r'{\pos(960,865)\fs48\fad(350,350)}షేర్ చేయండి · మీ అభిప్రాయాన్ని కామెంట్ చేయండి')
 (ROOT/ASS).write_text(header+'\n'.join(events)+'\n',encoding='utf8')
 save('channel-bookends-short-plan' if SHORT else 'channel-bookends-plan',{'durationSeconds':total,'storyEndsSeconds':257 if SHORT else None,'welcomeSeconds':[.15,5.5],'closingSeconds':[ending,total],'logo':str(LOGO),'spokenVoiceAdded':False,'singingStartUnchanged':True,'allFourActions':['subscribe','like','share','comment'],'audioFadeOutSeconds':2 if SHORT else 0,'repeatedFinalChorusRemoved':SHORT})
 print('Welcome and closing designed',flush=True)
def render():
 total=263.0 if SHORT else float(probe(SOURCE)['format']['duration'])
 welcome='' if SHORT else "drawbox=x=0:y=105:w=iw:h=82:color=0x0c1026@0.75:t=fill:enable='between(t,0.15,5.5)',"
 graph=(f"[0:v]{welcome}drawbox=x=0:y=0:w=iw:h=ih:color=0x0c1026@0.94:t=fill:enable='gte(t,{ENDING})'[bg];"
        f"[1:v]scale=300:300[logo];[bg][logo]overlay=(W-w)/2:255:enable='gte(t,{ENDING})'[branded];"
        f"[branded]ass=filename='{ROOT.as_posix()}/{ASS}':fontsdir='public/fonts':shaping=complex,format=yuv420p[v]")
 audio=['-af','afade=t=out:st=261:d=2','-c:a','aac','-b:a','192k'] if SHORT else ['-c:a','copy']
 run(['ffmpeg','-v','error','-nostdin','-n','-i',str(SOURCE),'-i',str(LOGO),'-filter_complex_threads','2','-filter_complex',graph,'-map','[v]','-map','0:a:0','-c:v','libx264','-threads','6','-preset','veryfast','-crf','18',*audio,'-t',str(total),'-movflags','+faststart','-map_metadata','0',str(OUT)])
 print(str(OUT),flush=True)
def verify():
 p=probe(OUT);v=next(s for s in p['streams'] if s['codec_type']=='video');a=next(s for s in p['streams'] if s['codec_type']=='audio');total=float(p['format']['duration'])
 assert (v['width'],v['height'],v['codec_name'],a['codec_name'])==(1920,1080,'h264','aac')
 assert abs(total-(263.0 if SHORT else float(probe(SOURCE)['format']['duration'])))<.1
 def ahash(f):return subprocess.check_output(['ffmpeg','-v','error','-i',str(f),'-map','0:a:0','-c','copy','-f','hash','-hash','sha256','-']).decode().strip()
 if not SHORT:assert ahash(SOURCE)==ahash(OUT),'Audio changed'
 run(['ffmpeg','-v','error','-xerror','-nostdin','-i',str(OUT),'-f','null','-'])
 sheet=Image.new('RGB',(1280,2*384),(12,16,38));draw=ImageDraw.Draw(sheet)
 for i,t in enumerate([2,12,258,261] if SHORT else [2,12,295,298]):
  dest=ROOT/f'review-{"final" if SHORT else "branded"}-{t}.jpg';run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(t),'-i',str(OUT),'-frames:v','1','-q:v','2',str(dest)])
  with Image.open(dest) as im:sheet.paste(im.resize((640,360)),((i%2)*640,(i//2)*384))
  draw.text(((i%2)*640+12,(i//2)*384+363),f'{t}s',fill='white')
 sheet.save(ROOT/('review-final-bookends.jpg' if SHORT else 'review-channel-bookends.jpg'),quality=94)
 save('verification-final' if SHORT else 'verification-branded',{'video':str(OUT.resolve()),'seconds':total,'resolution':[1920,1080],'fullDecodePassed':True,'audioPacketsUnchanged':not SHORT,'audioFadeOutSeconds':2 if SHORT else 0,'storyEndsSeconds':257 if SHORT else None,'welcomeAndLogo':True,'closingActions':['subscribe','like','share','comment'],'published':False})
 print('Final 4:23 video verified with two-second audio fade' if SHORT else 'Branded video verified; original audio unchanged',flush=True)
if __name__=='__main__':{'prepare':prepare,'render':render,'verify':verify}[sys.argv[1]]()
