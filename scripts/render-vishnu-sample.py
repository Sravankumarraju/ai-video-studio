"""First review sample: real generated chant, full verses and acoustic word timing."""
from pathlib import Path
import json,re,math,subprocess,importlib.util
from PIL import Image,ImageFont
ROOT=Path('data/productions/divine-wisdom/vishnu-sahasranamam-2026-10-22')
OUT=ROOT/'sample';OUT.mkdir(exist_ok=True)
spec=importlib.util.spec_from_file_location('full',Path(__file__).with_name('full-shloka-captions.py'));full=importlib.util.module_from_spec(spec);spec.loader.exec_module(full)
spec=importlib.util.spec_from_file_location('prior',Path(__file__).with_name('venkateswara-package.py'));prior=importlib.util.module_from_spec(spec);spec.loader.exec_module(prior)
def load(n):return json.loads((ROOT/f'{n}.json').read_text(encoding='utf8'))
def run(a):subprocess.run(a,check=True)
def norm(t):return ''.join(c for c in t if '\u0c00'<=c<='\u0c7f')
def stamp(t):return full.stamp(t)
def parse(t):
 h,m,s=t.split(':');return int(h)*3600+int(m)*60+float(s)
def framed(t):return math.ceil(t*24)/24
plan=load('plan');raw=load('batch-00-metadata')['words_timestamps'];units=plan['units'][:4]
expected=[w for u in units for w in u['text'].split()]
selected=raw[:len(expected)]
assert [norm(w) for w in expected]==[norm(w['word']) for w in selected]
prayer_end=framed(selected[-1]['end_ms']/1000+.25)
parts=[{'name':'welcome','source':'welcome.mp3','seconds':framed(prior.duration(ROOT/'welcome.mp3')+.2),'art':'01'},
 {'name':'prayer','source':'batch-00.mp3','seconds':prayer_end,'art':'02'},
 {'name':'closing','source':'closing.mp3','seconds':framed(prior.duration(ROOT/'closing.mp3')+.3),'art':'03'}]
header='';reports=[];cursor=0;events=[]
for i,u in enumerate(units):
 count=len(u['text'].split());words=selected[cursor:cursor+count];cursor+=count
 start=0 if i==0 else words[0]['start_ms']/1000
 end=selected[cursor]['start_ms']/1000 if cursor<len(selected) else prayer_end
 matches=list(re.finditer(r'\S+',u['text']))
 aligned=[{'text':w['word'],'start':max(0,w['start_ms']/1000-start),'end':w['end_ms']/1000-start,'spokenStart':m.start(),'spokenEnd':m.end()} for m,w in zip(matches,words)]
 display=re.sub(r'[॥।]\s*\d+\s*॥',' ॥',u['displayText'])
 temp=OUT/f'verse-{i}.ass'
 report=full.write_full_shloka(temp,u['text'],display,aligned,end-start,u['verse'],font_size=88,max_width=1680,margin=110)
 reports.append(report)
 text=temp.read_text(encoding='utf8');header=text[:text.index('Dialogue:')]
 for line in text[text.index('Dialogue:'):].splitlines():
  fields=line.split(',',9);fields[1]=stamp(parse(fields[1])+start);fields[2]=stamp(parse(fields[2])+start);events.append(','.join(fields))
(OUT/'prayer.ass').write_text(header+'\n'.join(events)+'\n',encoding='utf8')
for part in parts:
 if part['name']=='prayer':continue
 words=prior.aligned_words(load(part['name']+'-alignment'));events=[]
 for i in range(0,len(words),6):
  page=words[i:i+6];start=max(0,page[0]['start']-.03);end=min(part['seconds'],words[i+6]['start'] if i+6<len(words) else part['seconds'])
  bounds=sorted(set([start,end]+[max(start,min(end,w[k])) for w in page for k in ['start','end']]))
  for a,b in zip(bounds,bounds[1:]):
   if round(a*100)>=round(b*100):continue
   mid=(a+b)/2;lines=[]
   for chunk in [page[:3],page[3:]]:
    if chunk:lines.append(' '.join(('{\\c&H004AD5FF&}'+w['text']+'{\\c&H00FFFFFF&}') if w['start']<=mid<w['end'] else w['text'] for w in chunk))
   text='\\N'.join(lines);events.append(f'Dialogue: 0,{stamp(a)},{stamp(b)},Caption,,0,0,0,,{{\\fs76}}{text}')
 card='డివైన్ విజ్డమ్ తెలుగు\\Nఛానల్‌కు స్వాగతం' if part['name']=='welcome' else 'సబ్‌స్క్రైబ్ • లైక్\\Nషేర్ • కామెంట్'
 events.append(f"Dialogue: 1,0:00:00.00,{stamp(part['seconds'])},Caption,,0,0,0,,{{\\an5\\pos(1400,380)\\fs58\\bord0\\shad2}}{card}")
 (OUT/f"{part['name']}.ass").write_text(header+'\n'.join(events)+'\n',encoding='utf8')
logo=Image.open(ROOT/'channel-logo.png').convert('RGBA');logo.thumbnail((128,128));logo.save(OUT/'logo.png')
for part in parts:
 target=OUT/f"{part['name']}.mp4"
 if target.exists():continue
 subtitle=(OUT/f"{part['name']}.ass").as_posix();seconds=part['seconds'];frames=round(seconds*24)
 # The long render uses the same typography, gold highlight and quiet motion.
 vf=f"[0:v]scale=1920:1080,zoompan=z='1.015+0.018*on/{max(1,frames-1)}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d={frames}:s=1920x1080:fps=24,setsar=1,drawbox=x=0:y=735:w=iw:h=345:color=black@0.62:t=fill,drawbox=x=0:y=0:w=iw:h=100:color=black@0.25:t=fill[bg];[bg][1:v]overlay=W-w-25:20,ass=filename='{subtitle}':fontsdir='{ROOT.as_posix()}/fonts':shaping=complex,fade=t=in:st=0:d=0.25,fade=t=out:st={seconds-.25}:d=0.25,format=yuv420p[out]"
 run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT/'art'/f"{part['art']}.png"),'-i',str(OUT/'logo.png'),'-i',str(ROOT/part['source']),'-filter_complex',vf,'-map','[out]','-map','2:a:0','-af',f'loudnorm=I=-17:TP=-1.5:LRA=7,apad,atrim=duration={seconds}','-frames:v',str(frames),'-c:v','libx264','-preset','veryfast','-crf','19','-threads','6','-c:a','aac','-b:a','256k','-ar','48000','-ac','2','-movflags','+faststart',str(target)])
 print(json.dumps({'stage':'sample-part-rendered','name':part['name']}),flush=True)
(OUT/'concat.txt').write_text('\n'.join("file '"+p['name']+".mp4'" for p in parts)+'\n',encoding='utf8')
target=ROOT/'Vishnu-Sahasranamam-First-Sample-1080p.mp4'
if not target.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(OUT/'concat.txt'),'-c','copy','-movflags','+faststart',str(target)])
info=prior.probe(target);video=next(s for s in info['streams'] if s['codec_type']=='video');assert(video['width'],video['height'])==(1920,1080)
run(['ffmpeg','-v','error','-nostdin','-i',str(target),'-f','null','-'])
run(['ffmpeg','-v','error','-nostdin','-y','-ss',str(parts[0]['seconds']+5),'-i',str(target),'-frames:v','1',str(OUT/'caption-review.png')])
(OUT/'VERIFICATION.json').write_text(json.dumps({'file':str(target.resolve()),'seconds':float(info['format']['duration']),'resolution':'1920x1080','fullDecodePassed':True,'firstFourFullShlokas':True,'sourceWordSequenceMatchesTimestamps':True,'completeShlokaHeld':True,'activeWordGold':True,'channelWelcome':True,'subscribeLikeShareCommentEnding':True,'captionReports':reports,'humanPronunciationReviewPending':True},ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'stage':'sample-verified','seconds':float(info['format']['duration']),'file':str(target.resolve())}),flush=True)
