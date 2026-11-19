"""Version 2: new portrait artwork and visual hook; reuse approved narration."""
from pathlib import Path
import json, subprocess, re

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'data/productions/divine-wisdom/karthika-short-2026-10-29'
def run(a):subprocess.run(a,check=True,cwd=ROOT)
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]))
plan=json.loads((OUT/'production.json').read_text(encoding='utf8'))
timing=json.loads((OUT/'caption-timing.json').read_text(encoding='utf8'))
words=timing['words'];boundaries=[0];cursor=0
for i,b in enumerate(plan['beats']):
    count=len(b['narration'].split())
    if i:boundaries.append(words[cursor]['start'])
    cursor+=count
duration=33;boundaries.append(duration)
images=[OUT/'powerful-deepam-v2.png',OUT/'powerful-shiva-v2.png']
assert all(p.exists() for p in images),'Generated portrait images are required'
sequence=[0,0,1,0,1,1,0,0]
pieces=[]
for i,idx in enumerate(sequence):
    seconds=boundaries[i+1]-boundaries[i]
    dest=OUT/f'powerful-beat-{i:02}.mp4'
    if not dest.exists():
        frames=round(seconds*30)
        vf=f"scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='1+0.00012*on':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d={frames}:s=1080x1920:fps=30,drawbox=x=0:y=1250:w=iw:h=670:color=black@0.25:t=fill,format=yuv420p"
        run(['ffmpeg','-v','error','-nostdin','-n','-i',str(images[idx]),'-vf',vf,'-t',str(seconds),'-an','-c:v','libx264','-threads','2','-preset','veryfast','-crf','19',str(dest)])
    pieces.append(f"file '{dest.name}'\nduration {seconds:.8f}")
(OUT/'powerful-pieces.txt').write_text('\n'.join(pieces),encoding='utf8')
ass=(OUT/'final.ass').read_text(encoding='utf8')
# Keep caption safe areas proportional while moving to a 1080x1920 canvas.
ass=ass.replace('PlayResX: 720','PlayResX: 1080').replace('PlayResY: 1280','PlayResY: 1920')
ass=ass.replace('Noto Sans Telugu,46,','Noto Sans Telugu,66,').replace(',2,60,85,270,1',',2,90,128,405,1')
ass=ass.replace('Noto Sans,21,','Noto Sans,30,').replace(',8,30,30,85,1',',8,45,45,128,1')
hook='Style: Hook,Noto Sans Telugu,66,&H009DDFFF,&H009DDFFF,&H0020150B,&H80000000,1,0,0,0,100,100,0,0,1,4,1,8,90,90,260,1\n'
ass=ass.replace('[Events]',hook+'\n[Events]')
ass+=r'Dialogue: 3,0:00:00.00,0:00:03.20,Hook,,0,0,0,,{\fad(100,200)}దీపం వెలిగిస్తాం…\Nకానీ మనసులో?'+ '\n'
(OUT/'powerful-final.ass').write_text(ass,encoding='utf8')
video=OUT/'karthika-telugu-short-powerful-v2.mp4'
if not video.exists():
    ass_path=(OUT/'powerful-final.ass').relative_to(ROOT).as_posix()
    run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(OUT/'powerful-pieces.txt'),'-i',str(OUT/'karthika-telugu-short-with-audio.mp4'),'-vf',f"ass=filename='{ass_path}':fontsdir='public/fonts':shaping=complex",'-map','0:v:0','-map','1:a:0','-t',str(duration),'-c:v','libx264','-threads','2','-preset','veryfast','-crf','19','-c:a','copy','-movflags','+faststart',str(video)])
p=probe(video);v=next(s for s in p['streams'] if s['codec_type']=='video');audio=next(s for s in p['streams'] if s['codec_type']=='audio')
assert (v['width'],v['height'])==(1080,1920)
assert abs(float(p['format']['duration'])-duration)<.1
run(['ffmpeg','-v','error','-nostdin','-i',str(video),'-f','null','-'])
def audiohash(p):return subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-map','0:a:0','-c','copy','-f','hash','-hash','sha256','-']).decode().strip()
assert audiohash(video)==audiohash(OUT/'karthika-telugu-short-with-audio.mp4')
for t in [1,10,25,31]:
    frame=OUT/f'powerful-review-{t:02}s.jpg'
    if not frame.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(t),'-i',str(video),'-frames:v','1',str(frame)])
verification=dict(video=video.name,seconds=33,width=1080,height=1920,audioPresent=True,originalNarrationAudioPacketsUnchanged=True,fullDecodePassed=True,hook='దీపం వెలిగిస్తాం… కానీ మనసులో?',payoff='ఇంట్లో దీపం… మనసులో దయ',newPaidNarrationCalls=0,published=False)
(OUT/'powerful-verification.json').write_text(json.dumps(verification,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(verification,ensure_ascii=True))
