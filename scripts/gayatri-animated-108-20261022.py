from pathlib import Path
import json, math, subprocess, wave, shutil, hashlib
import numpy as np
from PIL import Image, ImageDraw

ROOT=Path('output/gayatri-mantra-108-original-2026-10-22')
OUT=ROOT/'animated-v2';OUT.mkdir(exist_ok=True)
FPS=24; CYCLE=12.25; LOOP=CYCLE*4; TOTAL=CYCLE*108
def run(args):subprocess.run(args,check=True)
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]))
def save(n,d):(OUT/f'{n}.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
def at(t):
 n=round(t*100);return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'
def srt(t):
 n=round(t*1000);return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
HEADER='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Noto Sans Telugu,64,&H00F4F7FF,&H000000FF,&H00200B17,&H00000000,0,0,0,0,100,100,0,0,1,1,0,7,0,0,0,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
def event(text,x,y,size,color='&H00F4F7FF&',font='Noto Sans Telugu',start=0,end=LOOP,extra='',layer=2):
 return f'Dialogue: {layer},{at(start)},{at(end)},Default,,0,0,0,,{{\\an7\\pos({x},{y})\\fs{size}\\fn{font}\\c{color}{extra}}}{text}'
def writeass(name,events):(OUT/name).write_text(HEADER+'\n'.join(events)+'\n',encoding='utf-8-sig')
def assfilter(name):return f"ass=filename='{OUT.as_posix()}/{name}':fontsdir='public/fonts':shaping=complex"

def prepare_audio():
 raw=OUT/'source.wav'
 if not raw.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT/'original-four-cycles.mp3'),'-ar','48000','-ac','2','-c:a','pcm_s16le',str(raw)])
 with wave.open(str(raw),'rb') as f:
  rate=f.getframerate();channels=f.getnchannels();samples=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').reshape(-1,channels).copy()
 # First complete mantra: Om 0.16s, final prachodayat ends 11.98s.
 # Retain 270ms of final decay. No syllable is time-stretched or sped up.
 cycle=samples[:round(CYCLE*rate)].copy();n=round(.003*rate)
 cycle[:n]=(cycle[:n]*np.linspace(0,1,n)[:,None]).astype('<i2')
 cycle[-n:]=(cycle[-n:]*np.linspace(1,0,n)[:,None]).astype('<i2')
 for name,count in [('chant-cycle.wav',1),('sample-gapless.wav',4),('full-108-gapless.wav',108)]:
  p=OUT/name
  if p.exists():continue
  with wave.open(str(p),'wb') as f:
   f.setnchannels(channels);f.setsampwidth(2);f.setframerate(rate)
   for _ in range(count):f.writeframesraw(cycle.tobytes())
 with wave.open(str(OUT/'full-108-gapless.wav'),'rb') as f:assert f.getnframes()==len(cycle)*108
 save('audio-audit',{'source':str(ROOT/'original-four-cycles.mp3'),'sourceSha256':hashlib.sha256((ROOT/'original-four-cycles.mp3').read_bytes()).hexdigest(),'selectedRangeSeconds':[0,CYCLE],'lastWordEndSeconds':11.98,'finalDecayRetainedSeconds':.27,'repetitions':108,'cycleSeconds':CYCLE,'fullSeconds':TOTAL,'method':'Repeat the complete approved first mantra; omit long instrumental gaps between later source cycles. 3ms edge fades prevent clicks.','speedChanged':False,'pitchChanged':False,'cycleSha256':hashlib.sha256(cycle.tobytes()).hexdigest(),'countVerifiedByPcmFrames':True})

def prepare_art():
 logo=Path('data/branding/divine-wisdom/production-presets/suprabhatam-female-chant-approved-2026-10-20/channel-logo-transparent.png')
 im=Image.open(logo);assert im.mode=='RGBA' and im.getextrema()[3][0]==0
 shutil.copyfile(logo,OUT/'channel-logo-transparent.png')
 # New geometric animation overlay. The approved background artwork is unchanged.
 im=Image.new('RGBA',(700,700),(0,0,0,0));d=ImageDraw.Draw(im)
 for radius,alpha,width in [(272,155,2),(282,110,2),(291,145,2)]:d.ellipse((350-radius,350-radius,350+radius,350+radius),outline=(255,214,116,alpha),width=width)
 for i in range(24):
  a=2*math.pi*i/24
  pts=[]
  for j in range(49):
   t=2*math.pi*j/48;r=264+28*math.sin(t/2)**2;angle=a+.106*math.sin(t)
   pts.append((350+r*math.cos(angle),350+r*math.sin(angle)))
  d.line(pts,fill=(255,220,126,185),width=2)
  x,y=350+302*math.cos(a),350+302*math.sin(a)
  d.ellipse((x-2,y-2,x+2,y+2),fill=(255,230,159,190))
 im.save(OUT/'chakra-ring.png')

def prepare_captions():
 e=[event('గాయత్రీ మంత్రం',88,106,84,'&H009BDBF9&'),event('GAYATRI MANTRA',92,244,38,'&H00C5D8EA&','Noto Sans'),event('ఓం భూర్భువః స్వః',92,390,65),event('తత్సవితుర్వరేణ్యం',92,496,65),event('భర్గో దేవస్య ధీమహి',92,602,65),event('ధియో యో నః ప్రచోదయాత్',92,708,61),event('108 TIMES  |  ORIGINAL DEVOTIONAL CHANT',94,855,25,'&H009BDBF9&','Noto Sans'),event('DIVINE WISDOM TELUGU',94,1008,24,'&H00C5D8EA&','Noto Sans')]
 writeass('base.ass',e)
 def cta(start,end):
  return [event('SUBSCRIBE',110,920,32,'&H00FFFFFF&','Noto Sans',start,end,extra='\\b1\\bord11\\3c&H00362BC8&\\fad(350,500)'),event('LIKE  |  SHARE  |  COMMENT',380,920,30,'&H009BDBF9&','Noto Sans',start,end,extra='\\fad(350,500)'),event('మీ అభిప్రాయాన్ని కామెంట్‌లో చెప్పండి',94,964,28,'&H00F4F7FF&','Noto Sans Telugu',start,end,extra='\\fad(350,500)')]
 writeass('mid-cta.ass',cta(22,30))
 writeass('end-cta.ass',cta(LOOP-8,LOOP))
 writeass('sample-cta.ass',cta(22,30)+cta(LOOP-8,LOOP)+[event('STYLE PREVIEW',94,30,21,'&H00C5D8EA&','Noto Sans')])
 lyrics=(ROOT/'lyrics-telugu.txt').read_text(encoding='utf8').strip()
 (OUT/'Gayatri-Mantra-108-Telugu.srt').write_text('\n\n'.join(f'{i+1}\n{srt(i*CYCLE)} --> {srt((i+1)*CYCLE)}\n{lyrics}' for i in range(108))+'\n',encoding='utf8')
 save('timeline',{'repetitions':108,'cycleSeconds':CYCLE,'fullSeconds':TOTAL,'midpointCtaSeconds':[13*LOOP+22,13*LOOP+30],'endingCtaSeconds':[TOTAL-8,TOTAL],'rotationPeriodSeconds':LOOP,'visualLoopCount':27,'logoBackground':'Transparent RGBA','audioInterruptionsForCta':False})

ENCODE=['-c:v','libx264','-preset','veryfast','-crf','19','-threads','4','-pix_fmt','yuv420p','-r',str(FPS),'-g','48','-sc_threshold','0']
def render_base():
 target=OUT/'animated-base-49s.mp4'
 if target.exists():return target
 # Occlusion mask reserves the seated figure's foreground below its head.
 # This keeps moving ring strokes visually behind the figure.
 graph=(f'[0:v]scale=1920:1080,setsar=1[bg];'
  f"[1:v]format=rgba,rotate=angle='2*PI*t/{LOOP}':ow=700:oh=700:c=none,"
  "geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='alpha(X,Y)*if(gt(Y,425)*between(X,185,515),0,1)'[ring];"
  f'[bg][ring]overlay=1125:10:format=auto,{assfilter("base.ass")}[text];'
  '[2:v]scale=190:190[logo];[text][logo]overlay=1694:854:format=auto,format=yuv420p[v]')
 run(['ffmpeg','-v','error','-nostdin','-n','-filter_complex_threads','2','-loop','1','-framerate',str(FPS),'-i',str(ROOT/'meditation-sunrise.png'),'-loop','1','-framerate',str(FPS),'-i',str(OUT/'chakra-ring.png'),'-loop','1','-framerate',str(FPS),'-i',str(OUT/'channel-logo-transparent.png'),'-filter_complex',graph,'-map','[v]','-t',str(LOOP),'-an',*ENCODE,'-movflags','+faststart',str(target)])
 print('Animated chakra base rendered',flush=True);return target

def overlay_clip(base,kind):
 target=OUT/f'{kind}-visual.mp4'
 if not target.exists():run(['ffmpeg','-v','error','-nostdin','-n','-filter_threads','2','-i',str(base),'-vf',assfilter(f'{kind}-cta.ass'),'-t',str(LOOP),'-an',*ENCODE,'-movflags','+faststart',str(target)])
 return target

def verify(file,seconds,name):
 run(['ffmpeg','-v','error','-nostdin','-threads','2','-i',str(file),'-f','null','-'])
 p=probe(file);v=next(s for s in p['streams'] if s['codec_type']=='video');a=next(s for s in p['streams'] if s['codec_type']=='audio')
 assert(v['width'],v['height'])==(1920,1080);assert abs(float(p['format']['duration'])-seconds)<.12
 save(name,{'file':str(file.resolve()),'seconds':float(p['format']['duration']),'width':v['width'],'height':v['height'],'videoCodec':v['codec_name'],'audioCodec':a['codec_name'],'fullDecodePassed':True,'bytes':file.stat().st_size,'logoTransparent':True,'animatedChakra':True,'gaplessRepetition':True,'ctaMiddleAndEnd':True,'published':False})

def main():
 prepare_audio();prepare_art();prepare_captions();base=render_base()
 sample=OUT/'Gayatri-Mantra-Animated-Gapless-Sample-1080p.mp4'
 if not sample.exists():
  run(['ffmpeg','-v','error','-nostdin','-n','-filter_threads','2','-i',str(base),'-i',str(OUT/'sample-gapless.wav'),'-vf',assfilter('sample-cta.ass'),'-map','0:v:0','-map','1:a:0','-t',str(LOOP),*ENCODE,'-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',str(sample)])
 verify(sample,LOOP,'sample-verification')
 for t,label in [(3,'logo-chakra'),(25,'middle-cta'),(LOOP-3,'ending-cta')]:
  p=OUT/f'review-{label}.jpg'
  if not p.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(t),'-i',str(sample),'-frames:v','1','-q:v','2',str(p)])
 print(json.dumps({'sampleReady':str(sample.resolve())}),flush=True)
 middle=overlay_clip(base,'mid');ending=overlay_clip(base,'end')
 manifest=OUT/'full-video.ffconcat'
 clips=[middle if i==13 else ending if i==26 else base for i in range(27)]
 manifest.write_text('ffconcat version 1.0\n'+''.join(f"file '{p.name}'\n" for p in clips),encoding='utf8')
 full=OUT/'Gayatri-Mantra-108-Times-Animated-1080p.mp4'
 if not full.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(manifest),'-i',str(OUT/'full-108-gapless.wav'),'-map','0:v:0','-map','1:a:0','-t',str(TOTAL),'-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',str(full)])
 verify(full,TOTAL,'full-verification')
 print(json.dumps({'fullReady':str(full.resolve()),'seconds':TOTAL,'repetitions':108}),flush=True)

if __name__=='__main__':main()
