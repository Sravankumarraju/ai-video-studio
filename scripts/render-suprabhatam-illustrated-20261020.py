from pathlib import Path
import json,subprocess,wave,math
import numpy as np
from PIL import Image
ROOT=Path('output/sri-venkateswara-full-approved-2026-10-20')
ART=ROOT/'illustrations'
DESIGN=Path('output/sri-venkateswara-telugu-shaping-fixed-2026-10-20')
timeline=json.loads((ROOT/'full-timeline.json').read_text(encoding='utf8'));prayer=timeline['prayerSeconds'];total=prayer+6
def run(args):subprocess.run(['ffmpeg','-v','error','-nostdin','-n']+args,check=True)
def prepare_music():
 raw=ROOT/'light-devotional-music.wav'
 if not raw.exists():run(['-i',str(ROOT/'light-devotional-music.mp3'),'-ar','48000','-ac','2','-c:a','pcm_s16le',str(raw)])
 with wave.open(str(raw),'rb') as f:rate=f.getframerate();a=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').reshape(-1,2).astype(np.float32)
 overlap=int(8*rate);needed=round(total*rate);out=a.copy()
 while len(out)<needed:
  weight=np.linspace(0,1,overlap,dtype=np.float32)[:,None]
  cross=out[-overlap:]*(1-weight)+a[:overlap]*weight
  out=np.concatenate([out[:-overlap],cross,a[overlap:]],axis=0)
 out=np.clip(out[:needed],-32768,32767).astype('<i2')
 loop=ROOT/'light-music-loop.wav'
 with wave.open(str(loop),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(rate);f.writeframes(out.tobytes())
 mix=ROOT/'chant-with-light-music.wav'
 if not mix.exists():
  run(['-i',str(ROOT/'full-approved-chant-master.wav'),'-i',str(loop),'-filter_complex',f'[0:a]volume=4dB,apad=pad_dur=6,asplit=2[voice][key];[1:a]loudnorm=I=-30:TP=-8:LRA=7,aresample=48000,afade=t=in:d=3,afade=t=out:st={total-5}:d=5[bed];[bed][key]sidechaincompress=threshold=0.05:ratio=3:attack=20:release=650:makeup=1[soft];[voice][soft]amix=inputs=2:normalize=0:duration=longest,alimiter=limit=0.89:level=0:latency=1,atrim=duration={total}[mix]','-map','[mix]','-ar','48000','-ac','2','-c:a','pcm_s16le',str(mix)])
 return mix
music=prepare_music();print('Light instrumental mixed; chant speed and gap timing retained.',flush=True)
oldpanel=ART/'temple-deity-panel.jpg'
if not oldpanel.exists():
 im=Image.open(DESIGN/'prayer-background.jpg');im.crop((1100,0,1920,1080)).save(oldpanel,quality=96)
paths=[ART/'venkateswara-radiant-temple.png',ART/'tirumala-dawn-illustration.png',oldpanel,ART/'venkateswara-radiant-temple.png']
clips=[]
for i,path in enumerate(paths):
 clip=ART/f'motion-panel-{i+1}.mp4';clips.append(clip)
 if clip.exists():continue
 zoom='1.025-0.025*on/719' if i==3 else '1+0.025*on/719'
 vf=f"scale=1640:2160:force_original_aspect_ratio=increase,crop=1640:2160,zoompan=z='{zoom}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=720:s=820x1080:fps=24,format=yuv420p"
 run(['-i',str(path),'-vf',vf,'-an','-c:v','libx264','-preset','veryfast','-crf','19','-threads','4',str(clip)])
 print(f'Motion scene {i+1}/4 rendered.',flush=True)
cycle=ART/'illustration-motion-cycle.mp4'
if not cycle.exists():
 args=[]
 for clip in clips:args+=['-i',str(clip)]
 run(args+['-filter_complex','[0:v][1:v]xfade=transition=fade:duration=3:offset=27[a];[a][2:v]xfade=transition=fade:duration=3:offset=54[b];[b][3:v]xfade=transition=fade:duration=3:offset=81,format=yuv420p[v]','-map','[v]','-an','-c:v','libx264','-preset','veryfast','-crf','19','-threads','4',str(cycle)])
 print('Illustration transitions rendered.',flush=True)
visual=ROOT/'illustrated-prayer.mp4'
if not visual.exists():
 ass=ROOT/'full-telugu-captions.ass'
 run(['-loop','1','-i',str(DESIGN/'prayer-background.jpg'),'-stream_loop','-1','-i',str(cycle),'-i',str(ROOT/'channel-logo-transparent.png'),'-filter_complex',f"[0:v]fps=24[base];[base][1:v]overlay=1100:0[scene];[scene]ass=filename='{ass.as_posix()}':fontsdir='public/fonts':shaping=complex[text];[2:v]scale=220:220[logo];[text][logo]overlay=W-w-28:H-h-28,format=yuv420p[v]",'-map','[v]','-an','-t',str(prayer),'-c:v','libx264','-preset','veryfast','-crf','20','-threads','4','-progress',str(ROOT/'illustrated-render-progress.txt'),str(visual)])
concat=ROOT/'illustrated-visuals.ffconcat';concat.write_text("file 'illustrated-prayer.mp4'\nfile 'full-ending-with-logo.mp4'\n",encoding='utf8')
out=ROOT/'Sri-Venkateswara-Suprabhatham-Illustrated-1080p.mp4'
if not out.exists():run(['-f','concat','-safe','0','-i',str(concat),'-i',str(music),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-t',str(total),'-movflags','+faststart',str(out)])
subprocess.run(['ffmpeg','-v','error','-nostdin','-i',str(out),'-f','null','-'],check=True)
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(out)]));video=next(s for s in probe['streams'] if s['codec_type']=='video')
assert (video['width'],video['height'])==(1920,1080);assert abs(float(probe['format']['duration'])-total)<.3
record={'file':out.name,'durationSeconds':float(probe['format']['duration']),'fullDecodePassed':True,'verses':29,'resolution':[1920,1080],'chantGainDb':4,'chantTimingChanged':False,'musicIntegratedTargetLUFS':-30,'musicDucksUnderChant':True,'musicLoopCrossfadeSeconds':8,'illustrationMotion':'2.5 percent slow zoom with three second dissolves','logoPosition':'bottom-right','captionShaping':'libass complex','pronunciationListeningReviewRequired':True,'imageTool':'built-in image_gen','illustrations':[str(p) for p in paths[:2]],'published':False}
(ROOT/'illustrated-video-verification.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf8')
sample=ROOT/'Sri-Venkateswara-Suprabhatham-Illustrated-Sample.mp4'
if not sample.exists():run(['-i',str(out),'-t','65','-c','copy','-movflags','+faststart',str(sample)])
print(json.dumps(record),flush=True)
