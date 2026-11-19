from pathlib import Path
import json,re,subprocess,math,shutil,importlib.util
from PIL import Image
ROOT=Path('data/productions/divine-wisdom/mahalakshmi-original-geetham-sample-2026-10-30')
SOURCE=Path('data/productions/divine-wisdom/govinda-namalu-full-2026-10-20')
spec=importlib.util.spec_from_file_location('captions',Path(__file__).with_name('full-shloka-captions.py'))
cap=importlib.util.module_from_spec(spec);spec.loader.exec_module(cap)
def run(args):return subprocess.run(args,check=True,capture_output=True,text=True)
def norm(s):return ''.join(c for c in s if '\u0c00'<=c<='\u0c7f')
def stamp(s):return cap.stamp(s)
def parse(t):
 h,m,s=t.split(':');return int(h)*3600+int(m)*60+float(s)
meta=json.loads((ROOT/'sample-metadata.json').read_text(encoding='utf-8'))
request=json.loads((ROOT/'request.json').read_text(encoding='utf-8'))
text='\n'.join(c['text'] for c in request['composition_plan']['chunks'])
raw=meta['words_timestamps'];expected=text.split()
assert [norm(w) for w in expected]==[norm(w['word']) for w in raw],'Music timestamp text differs; review before rendering'
audio=ROOT/'mahalakshmi-original-female-sample.mp3'
probe=json.loads(run(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(audio)]).stdout)
seconds=math.ceil(float(probe['format']['duration'])*24)/24
blocks=[c['text'] for c in request['composition_plan']['chunks']]
header='';events=[];cursor=0;reports=[]
for i,block in enumerate(blocks):
 count=len(block.split());words=raw[cursor:cursor+count];cursor+=count
 start=0 if i==0 else words[0]['start_ms']/1000
 end=raw[cursor]['start_ms']/1000 if cursor<len(raw) else seconds
 matches=list(re.finditer(r'\S+',block))
 aligned=[{'text':w['word'],'start':max(0,w['start_ms']/1000-start),'end':max(0,w['end_ms']/1000-start),'spokenStart':m.start(),'spokenEnd':m.end()} for m,w in zip(matches,words)]
 temp=ROOT/f'caption-{i}.ass'
 reports.append(cap.write_full_shloka(temp,block,block,aligned,end-start,i+1,font_size=82,max_width=1680,margin=110))
 ass=temp.read_text(encoding='utf-8');header=ass[:ass.index('Dialogue:')]
 for line in ass[ass.index('Dialogue:'):].splitlines():
  fields=line.split(',',9);fields[1]=stamp(parse(fields[1])+start);fields[2]=stamp(parse(fields[2])+start);events.append(','.join(fields))
header=header.replace('[Events]', 'Style: Title,Noto Sans Telugu,52,&H00D4EFFF,&H00FFFFFF,&H00101010,&H80000000,0,0,0,0,100,100,0,0,3,2,0,8,50,50,26,1\n[Events]')
events.append(f'Dialogue: 1,0:00:00.00,{stamp(4)},Title,,0,0,0,,డివైన్ విజ్డమ్ తెలుగు ఛానల్‌కు స్వాగతం')
events.append(f'Dialogue: 1,{stamp(4)},{stamp(seconds-4)},Title,,0,0,0,,శ్రీ మహాలక్ష్మి భక్తి గీతం • కొత్త గాన నమూనా')
events.append(f'Dialogue: 1,{stamp(seconds-4)},{stamp(seconds)},Title,,0,0,0,,సబ్‌స్క్రైబ్ • లైక్ • షేర్ • కామెంట్')
(ROOT/'captions.ass').write_text(header+'\n'.join(events)+'\n',encoding='utf-8')
(ROOT/'fonts').mkdir(exist_ok=True)
shutil.copyfile('public/fonts/NotoSansTelugu.ttf',ROOT/'fonts/NotoSansTelugu.ttf')
ART=Path('data/productions/divine-wisdom/mahalakshmi-mala-full-2026-10-30/art')
shutil.copyfile('data/productions/divine-wisdom/mahalakshmi-mala-full-2026-10-30/channel-logo-transparent.png',ROOT/'logo.png')
images=sorted(ART.glob('*.png'));assert len(images)==6
(ROOT/'motion').mkdir(exist_ok=True)
frames=round(seconds*24);base=frames//6
for i,im in enumerate(images):
 n=base if i<5 else frames-5*base
 out=ROOT/'motion'/f'{i+1:02}.mp4'
 if not out.exists():
  z=f'1+0.025*on/{n-1}' if i%2==0 else f'1.025-0.025*on/{n-1}'
  filt=f"scale=1920:1080,zoompan=z='{z}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d={n}:s=1920x1080:fps=24,setsar=1,format=yuv420p"
  run(['ffmpeg','-v','error','-nostdin','-n','-i',str(im),'-vf',filt,'-frames:v',str(n),'-an','-c:v','libx264','-preset','veryfast','-crf','20','-threads','4',str(out)])
 print(json.dumps({'motionScene':i+1,'totalScenes':6}),flush=True)
(ROOT/'motion/concat.txt').write_text('\n'.join(f"file '{i+1:02}.mp4'" for i in range(6))+'\n',encoding='utf8')
vf=f"[0:v]ass=filename='{ROOT.as_posix()}/captions.ass':fontsdir='{ROOT.as_posix()}/fonts':shaping=complex[bg];[2:v]scale=200:-1[logo];[bg][logo]overlay=W-w-32:24,format=yuv420p[out]"
target=ROOT/'Mahalakshmi-Original-Female-Song-Sample-1080p.mp4'
if not target.exists():
 run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'motion/concat.txt'),'-i',str(audio),'-i',str(ROOT/'logo.png'),'-filter_complex_threads','2','-filter_complex',vf,'-map','[out]','-map','1:a:0','-af',f'loudnorm=I=-17:TP=-1.5:LRA=7,apad,atrim=duration={seconds}','-frames:v',str(frames),'-c:v','libx264','-preset','veryfast','-crf','19','-threads','4','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart',str(target)])
result=json.loads(run(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(target)]).stdout)
video=next(s for s in result['streams'] if s['codec_type']=='video');assert(video['width'],video['height'])==(1920,1080)
run(['ffmpeg','-v','error','-nostdin','-i',str(target),'-f','null','-'])
for t in [3,12,24]:run(['ffmpeg','-v','error','-nostdin','-y','-ss',str(t),'-i',str(target),'-frames:v','1',str(ROOT/f'review-{t}.png')])
verification={'file':str(target.resolve()),'seconds':float(result['format']['duration']),'resolution':'1920x1080','fullDecodePassed':True,'sourceWordSequenceMatchesTimestamps':True,'captionReports':reports,'scope':'Eight newly authored Telugu devotional lyric lines, original female-sung song sample; not a traditional stotram','originalMusic':True,'artwork':[str(x) for x in images],'completeChannelLogoThroughout':True,'audioReferenceUsed':False,'clonedVoiceUsed':False,'humanPronunciationAndTimingListeningReviewPending':True,'published':False}
(ROOT/'VERIFICATION.json').write_text(json.dumps(verification,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(verification,ensure_ascii=False))
