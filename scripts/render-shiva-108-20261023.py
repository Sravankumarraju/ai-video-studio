from pathlib import Path
import json, math, subprocess, wave, hashlib
import numpy as np
from PIL import Image, ImageDraw

ROOT=Path('output/om-namah-shivaya-108-2026-10-23')
FPS=24; W=1920; H=1080; LOOP=16; CYCLE=8; INTRO=16; TOTAL=888
def run(a): subprocess.run(a,check=True)
def save(n,d): (ROOT/f'{n}.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
def probe(p): return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]))
def stamp(t):
 n=round(t*100);return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'
HEADER='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Noto Sans,48,&H00FFFFFF,&H00FFFFFF,&H00231910,&H00000000,0,0,0,0,100,100,0,0,1,1,1,7,0,0,0,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
def event(text,x,y,size,start=0,end=16,font='Noto Sans',color='&H00F3F5F7&'):
 return f'Dialogue: 1,{stamp(start)},{stamp(end)},Default,,0,0,0,,{{\\an7\\pos({x},{y})\\fs{size}\\fn{font}\\c{color}\\fad(500,500)}}{text}'
def ass(name,events): (ROOT/name).write_text(HEADER+'\n'.join(events)+'\n',encoding='utf-8-sig')
def af(name): return f"ass=filename='{ROOT.as_posix()}/{name}':fontsdir='public/fonts':shaping=complex"
ENC=['-c:v','libx264','-preset','veryfast','-crf','19','-threads','4','-pix_fmt','yuv420p','-r','24','-g','48','-sc_threshold','0','-video_track_timescale','12288']

def audio():
 if not (ROOT/'source.wav').exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT/'original-four-cycles.mp3'),'-ar','48000','-ac','2','-c:a','pcm_s16le',str(ROOT/'source.wav')])
 tx=json.loads((ROOT/'transcription.json').read_text(encoding='utf8'));words=[w for w in tx['words'] if w['type']=='word']
 assert [w['text'].rstrip('।') for w in words]==['ॐ','नमः','शिवाय']*4
 # Independent ASR places second full mantra between 10.06 and 14.32 seconds.
 # Select the entire second eight-second source section, retaining ample breath on both sides.
 assert 8<words[3]['start']<words[5]['end']<16
 with wave.open(str(ROOT/'source.wav'),'rb') as f:
  rate=f.getframerate();ch=f.getnchannels();s=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').reshape(-1,ch).copy()
 cycle=s[8*rate:16*rate].copy();n=round(.008*rate)
 cycle[:n]=(cycle[:n]*np.linspace(0,1,n)[:,None]).astype('<i2');cycle[-n:]=(cycle[-n:]*np.linspace(1,0,n)[:,None]).astype('<i2')
 # Use the voice-free opening for a quiet original accompaniment under the meaning cards.
 bed=s[round(.15*rate):round(1.65*rate)].copy();n2=round(.03*rate)
 bed[:n2]=(bed[:n2]*np.linspace(0,1,n2)[:,None]).astype('<i2');bed[-n2:]=(bed[-n2:]*np.linspace(1,0,n2)[:,None]).astype('<i2')
 def ambient(seconds):return np.tile(bed,(math.ceil(seconds*rate/len(bed)),1))[:seconds*rate].copy()
 opening=ambient(16);ending=ambient(8);opening=(opening*.65).astype('<i2');ending=(ending*.65*np.linspace(1,0,len(ending))[:,None]).astype('<i2')
 for name,parts in [('chant-cycle.wav',[cycle]),('preview-audio.wav',[opening,cycle,cycle,cycle,cycle,ending]),('full-108-audio.wav',[opening]+[cycle]*108+[ending])]:
  if (ROOT/name).exists():continue
  with wave.open(str(ROOT/name),'wb') as f:
   f.setnchannels(ch);f.setsampwidth(2);f.setframerate(rate)
   for part in parts:f.writeframesraw(part.tobytes())
 with wave.open(str(ROOT/'full-108-audio.wav'),'rb') as f:assert f.getnframes()==TOTAL*rate
 save('audio-audit',{'repetitions':108,'cycleSeconds':8,'sourceSelectionSeconds':[8,16],'independentTranscription':tx['text'],'selectedMantraWords':words[3:6],'fullSeconds':TOTAL,'introSeconds':16,'outroSeconds':8,'speedChanged':False,'pitchChanged':False,'cycleSha256':hashlib.sha256(cycle.tobytes()).hexdigest(),'exactPcmCountVerified':True,'humanPronunciationListeningReviewPending':True})

def animation():
 out=ROOT/'water-flowers-loop.mp4'
 if out.exists():return
 bg=Image.open(ROOT/'shiva-lingam.png').convert('RGB').resize((W,H),Image.Resampling.LANCZOS)
 shade=Image.new('RGBA',(W,H));a=np.zeros((H,W,4),dtype=np.uint8);a[:,:,:3]=[6,10,16]
 a[:,:,3]=(np.clip((880-np.arange(W))/720,0,1)*165).astype('uint8')[None,:];shade=Image.fromarray(a)
 bg=Image.alpha_composite(bg.convert('RGBA'),shade).convert('RGB')
 proc=subprocess.Popen(['ffmpeg','-v','error','-nostdin','-n','-f','rawvideo','-pixel_format','rgb24','-video_size','1920x1080','-framerate',str(FPS),'-i','pipe:0','-an',*ENC,'-movflags','+faststart',str(out)],stdin=subprocess.PIPE)
 # Periodic particle motion produces a seamless GIF-like 16-second water and offering loop.
 for frame in range(LOOP*FPS):
  t=frame/FPS;ov=Image.new('RGBA',(W,H));d=ImageDraw.Draw(ov)
  # Stream from brass pot to crown, followed by water rivulets down the stone.
  for k in range(24):
   phase=(t*2+k/24)%1;y=173+phase*148;x=1217+2*math.sin(phase*17+k)
   d.line((x,y,x-1,y+10+5*math.sin(k)),fill=(225,240,255,100+int(65*math.sin(math.pi*phase))),width=2)
  for k in range(28):
   u=(t*.45+k/28)%1;side=-1 if k%2 else 1;x=1193+side*(62+27*u)+5*math.sin(u*9+k);y=330+u*275
   d.line((x,y,x+side*2,y+12),fill=(213,233,252,int(95*math.sin(math.pi*u))),width=1)
  for k in range(10):
   u=(t/2+k/10)%1;rx=5+u*37;cx=1192+35*math.sin(k*4);cy=601+7*math.cos(k)
   d.ellipse((cx-rx,cy-rx*.2,cx+rx,cy+rx*.2),outline=(220,240,255,int((1-u)*85)),width=1)
  for k in range(18):
   u=(t/16+k/18)%1;scale=9+(k%4)*2;x=1150+185*math.sin(k*2.4)+25*math.sin(2*math.pi*u);y=-45+u*885
   alpha=int(225*min(1,u*12,(1-u)*12));col=(255,238,210,alpha) if k%3 else (244,90,145,alpha)
   # Small five-petal jasmine blossoms, continuously descending as offerings.
   angle=u*math.pi*2+k
   for p in range(5):
    pa=angle+p*math.pi*2/5;cx=x+scale*.65*math.cos(pa);cy=y+scale*.65*math.sin(pa)
    d.ellipse((cx-scale*.43,cy-scale*.32,cx+scale*.43,cy+scale*.32),fill=col)
   d.ellipse((x-2,y-2,x+2,y+2),fill=(248,190,60,alpha))
  im=Image.alpha_composite(bg.convert('RGBA'),ov).convert('RGB');proc.stdin.write(im.tobytes())
 proc.stdin.close();assert proc.wait()==0
 print('Animated water and flower loop rendered',flush=True)

def captions():
 gold='&H009EE0F7&'
 common=[event('Om Namah Shivaya',80,330,57,color=gold),event('ॐ नमः शिवाय',80,422,76,font='Noto Sans Devanagari',color=gold),event('108 REPETITIONS',84,850,26),event('DEVOTION  •  STILLNESS  •  INNER PEACE',84,901,24)]
 ass('chant.ass',common)
 ass('intro.ass',[event('Om Namah Shivaya',80,240,57,color=gold),event('ॐ नमः शिवाय',80,326,76,font='Noto Sans Devanagari',color=gold),event('“Salutations to Lord Shiva”',84,470,35,start=0,end=8),event('A sacred expression of devotion',84,535,28,start=0,end=8),event('and surrender to Shiva.',84,578,28,start=0,end=8),event('Na • Mah • Shi • Vaa • Ya',84,478,33,start=8,end=16),event('The five-syllable Panchakshara mantra',84,542,25,start=8,end=16),event('A traditional practice for steady attention',84,584,25,start=8,end=16),event('and inner quiet. Chant along gently.',84,626,25,start=8,end=16),event('108 CHANTS  |  RELAXING DEVOTIONAL MUSIC',84,884,23)])
 ass('outro.ass',[event('Om Namah Shivaya',80,330,57,end=8,color=gold),event('ॐ नमः शिवाय',80,422,76,end=8,font='Noto Sans Devanagari',color=gold),event('108 repetitions complete',84,558,32,end=8),event('Rest quietly in the stillness.',84,620,29,end=8)])
 def srt(t):
  n=round(t*1000);return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
 (ROOT/'Om-Namah-Shivaya-108.srt').write_text('\n\n'.join(f'{i+1}\n{srt(16+i*8)} --> {srt(24+i*8)}\nOm Namah Shivaya\nॐ नमः शिवाय\n{i+1} / 108' for i in range(108))+'\n',encoding='utf8')

def render():
 for kind,duration in [('intro',16),('chant',16),('outro',8)]:
  out=ROOT/f'{kind}-visual.mp4'
  if out.exists():continue
  run(['ffmpeg','-v','error','-nostdin','-n','-filter_threads','2','-i',str(ROOT/'water-flowers-loop.mp4'),'-vf',af(f'{kind}.ass'),'-t',str(duration),'-an',*ENC,'-movflags','+faststart',str(out)])
 for name,count,aud in [('Shiva-Chant-Animated-Preview-1080p.mp4',2,'preview-audio.wav'),('Om-Namah-Shivaya-108-1080p.mp4',54,'full-108-audio.wav')]:
  target=ROOT/name
  if target.exists():continue
  manifest=ROOT/f'{count}-clips.ffconcat';manifest.write_text('ffconcat version 1.0\n'+"file 'intro-visual.mp4'\n"+"file 'chant-visual.mp4'\n"*count+"file 'outro-visual.mp4'\n",encoding='utf8')
  run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(manifest),'-i',str(ROOT/aud),'-map','0:v','-map','1:a','-c:v','copy','-af','alimiter=limit=0.89','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',str(target)])
 # True animated GIF preview; core chanting layout with flowing water and offerings.
 if not (ROOT/'Shiva-Water-Flowers-Loop.gif').exists():
  run(['ffmpeg','-v','error','-nostdin','-n','-filter_complex_threads','2','-i',str(ROOT/'chant-visual.mp4'),'-filter_complex','fps=10,scale=768:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=3','-loop','0',str(ROOT/'Shiva-Water-Flowers-Loop.gif')])
 run(['ffmpeg','-v','error','-nostdin','-y','-ss','5','-i',str(ROOT/'chant-visual.mp4'),'-frames:v','1','-q:v','2',str(ROOT/'preview.jpg')])
 target=ROOT/'Om-Namah-Shivaya-108-1080p.mp4'
 run(['ffmpeg','-v','error','-nostdin','-threads','2','-i',str(target),'-f','null','-'])
 p=probe(target);v=next(s for s in p['streams'] if s['codec_type']=='video');assert (v['width'],v['height'])==(1920,1080);assert abs(float(p['format']['duration'])-TOTAL)<.15
 save('VERIFICATION',{'file':str(target.resolve()),'durationSeconds':float(p['format']['duration']),'repetitions':108,'resolution':[1920,1080],'fullDecodePassed':True,'audioIndependentTranscriptionMatches':True,'animatedWaterAndFlowers':True,'visualMethod':'Generated still artwork with original procedural water and flower compositing; seamless GIF-style loop','previewGif':str((ROOT/'Shiva-Water-Flowers-Loop.gif').resolve()),'humanPronunciationListeningReviewPending':True,'published':False})
 print(json.dumps({'ready':str(target.resolve()),'duration':TOTAL,'repetitions':108}),flush=True)

if __name__=='__main__':
 audio();captions();animation();render()
