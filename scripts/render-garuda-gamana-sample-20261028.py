from pathlib import Path
import json,re,subprocess,math,shutil,importlib.util
from PIL import Image
ROOT=Path('data/productions/divine-wisdom/garuda-gamana-tava-sample-2026-10-28')
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
text=request['composition_plan']['chunks'][0]['text']
raw=meta['words_timestamps'];expected=text.split()
assert [norm(w) for w in expected]==[norm(w['word']) for w in raw],'Music timestamp text differs; review before rendering'
audio=ROOT/'garuda-gamana-tava-sample.mp3'
probe=json.loads(run(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(audio)]).stdout)
seconds=math.ceil(float(probe['format']['duration'])*24)/24
units=text.splitlines();blocks=['\n'.join(units[:2]),'\n'.join(units[2:])]
header='';events=[];cursor=0;reports=[]
for i,block in enumerate(blocks):
 count=len(block.split());words=raw[cursor:cursor+count];cursor+=count
 start=0 if i==0 else words[0]['start_ms']/1000
 end=raw[cursor]['start_ms']/1000 if cursor<len(raw) else seconds
 matches=list(re.finditer(r'\S+',block))
 aligned=[{'text':w['word'],'start':max(0,w['start_ms']/1000-start),'end':max(0,w['end_ms']/1000-start),'spokenStart':m.start(),'spokenEnd':m.end()} for m,w in zip(matches,words)]
 temp=ROOT/f'caption-{i}.ass'
 reports.append(cap.write_full_shloka(temp,block,block,aligned,end-start,i+1,font_size=90,max_width=1680,margin=110))
 ass=temp.read_text(encoding='utf-8');header=ass[:ass.index('Dialogue:')]
 for line in ass[ass.index('Dialogue:'):].splitlines():
  fields=line.split(',',9);fields[1]=stamp(parse(fields[1])+start);fields[2]=stamp(parse(fields[2])+start);events.append(','.join(fields))
(ROOT/'captions.ass').write_text(header+'\n'.join(events)+'\n',encoding='utf-8')
(ROOT/'fonts').mkdir(exist_ok=True)
shutil.copyfile('public/fonts/NotoSansTelugu.ttf',ROOT/'fonts/NotoSansTelugu.ttf')
shutil.copyfile(SOURCE/'art/07-traditional-mural.png',ROOT/'background.png')
logo=Image.open(SOURCE/'channel-logo.png').convert('RGBA');logo.thumbnail((112,112));logo.save(ROOT/'logo.png')
frames=round(seconds*24)
vf=f"[0:v]scale=1920:1080,zoompan=z='1.0+0.025*on/{max(1,frames-1)}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d={frames}:s=1920x1080:fps=24,setsar=1[bg];[bg][1:v]overlay=W-w-28:22,ass=filename='{ROOT.as_posix()}/captions.ass':fontsdir='{ROOT.as_posix()}/fonts':shaping=complex,format=yuv420p[out]"
target=ROOT/'Garuda-Gamana-Tava-Sample-1080p.mp4'
if not target.exists():
 run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT/'background.png'),'-i',str(ROOT/'logo.png'),'-i',str(audio),'-filter_complex',vf,'-map','[out]','-map','2:a:0','-af',f'loudnorm=I=-17:TP=-1.5:LRA=7,apad,atrim=duration={seconds}','-frames:v',str(frames),'-c:v','libx264','-preset','veryfast','-crf','19','-threads','6','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart',str(target)])
result=json.loads(run(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(target)]).stdout)
video=next(s for s in result['streams'] if s['codec_type']=='video');assert(video['width'],video['height'])==(1920,1080)
run(['ffmpeg','-v','error','-nostdin','-i',str(target),'-f','null','-'])
for t in [3,12,24]:run(['ffmpeg','-v','error','-nostdin','-y','-ss',str(t),'-i',str(target),'-frames:v','1',str(ROOT/f'review-{t}.png')])
verification={'file':str(target.resolve()),'seconds':float(result['format']['duration']),'resolution':'1920x1080','fullDecodePassed':True,'sourceWordSequenceMatchesTimestamps':True,'captionReports':reports,'completeRefrainOnly':True,'originalMusic':True,'reusedOwnChannelArtwork':str(SOURCE/'art/07-traditional-mural.png'),'humanPronunciationAndTimingListeningReviewPending':True,'published':False}
(ROOT/'VERIFICATION.json').write_text(json.dumps(verification,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(verification,ensure_ascii=False))
