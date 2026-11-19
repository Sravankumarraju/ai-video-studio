from pathlib import Path
import importlib.util, json, wave, shutil, subprocess
spec=importlib.util.spec_from_file_location('shiva','scripts/render-shiva-108-20261023.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
SOURCE=m.ROOT;ROOT=Path('output/om-namah-shivaya-1008-2026-10-23');ROOT.mkdir(exist_ok=True)
COUNT=1008;TOTAL=16+COUNT*8+8;m.ROOT=ROOT
def run(a):subprocess.run(a,check=True)
def save(n,d):(ROOT/f'{n}.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
def prepare():
 report=json.loads((SOURCE/'VERIFICATION.json').read_text(encoding='utf8'));assert report['fullDecodePassed']
 for name in ['shiva-lingam.png','water-flowers-loop.mp4','chant-cycle.wav','request.json','song-metadata.json','transcription.json']:
  if not (ROOT/name).exists():shutil.copyfile(SOURCE/name,ROOT/name)
 with wave.open(str(SOURCE/'full-108-audio.wav'),'rb') as f:
  rate=f.getframerate();ch=f.getnchannels();sw=f.getsampwidth();opening=f.readframes(16*rate);f.setpos(f.getnframes()-8*rate);ending=f.readframes(8*rate)
 for name,bytes_ in [('intro-bed.wav',opening),('outro-bed.wav',ending)]:
  if (ROOT/name).exists():continue
  with wave.open(str(ROOT/name),'wb') as f:f.setnchannels(ch);f.setsampwidth(sw);f.setframerate(rate);f.writeframes(bytes_)
 with wave.open(str(ROOT/'chant-cycle.wav'),'rb') as f:assert f.getnframes()==8*rate
 aud=['intro-bed.wav']+['chant-cycle.wav']*COUNT+['outro-bed.wav'];assert aud.count('chant-cycle.wav')==1008
 (ROOT/'audio.ffconcat').write_text('ffconcat version 1.0\n'+''.join(f"file '{p}'\n" for p in aud),encoding='utf8')
 clips=['intro-visual.mp4']+['chant-visual.mp4']*(COUNT//2)+['outro-visual.mp4'];assert len(clips)==506
 (ROOT/'video.ffconcat').write_text('ffconcat version 1.0\n'+''.join(f"file '{p}'\n" for p in clips),encoding='utf8')
 m.captions()
 for filename in ['intro.ass','chant.ass','outro.ass']:
  p=ROOT/filename;text=p.read_text(encoding='utf-8-sig').replace('108 REPETITIONS','1008 REPETITIONS').replace('108 CHANTS','1008 CHANTS').replace('108 repetitions complete','1008 repetitions complete')
  if filename=='intro.ass':text+='\n'+m.event('Namah Shivaya · Sri Rudram · Yajurveda',84,704,22,start=8,end=16)+'\n'
  p.write_text(text,encoding='utf-8-sig')
 (ROOT/'Om-Namah-Shivaya-108.srt').unlink(missing_ok=True)
 def srt(t):
  n=t*1000;return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
 (ROOT/'Om-Namah-Shivaya-1008.srt').write_text('\n\n'.join(f'{i+1}\n{srt(16+i*8)} --> {srt(24+i*8)}\nOm Namah Shivaya\nॐ नमः शिवाय\n{i+1} / 1008' for i in range(COUNT))+'\n',encoding='utf8')
 plan=json.loads((SOURCE/'production-plan.json').read_text(encoding='utf8'));plan.update({'repetitions':COUNT,'durationSeconds':TOTAL,'title':'Om Namah Shivaya Chanting 1008 Times | Powerful Mantra for Healing, Protection & Inner Peace','authorization':'User approved credit usage, then explicitly requested 1008 repetitions and a devotional thumbnail in the same chat.','newMusicGenerationCalls':0,'vedicBasis':{'source':'https://www.kamakoti.org/kamakoti/news/2023/laksha-modaka-11287-20230816.html','finding':'Namah Shivaya occurs in Sri Rudram, eighth anuvaka, Krishna Yajurveda, fourth kanda fifth prasna.','presentation':'Devotional musical japa of Om Namah Shivaya. This is not a complete Sri Rudram or a demonstration of traditional accented Vedic recitation.','count':'1008 repetitions selected by user; no claim that the Veda prescribes this video duration or guarantees specific outcomes.'},'thumbnailIntent':'Sacred Shiva lingam, warm devotional mood, legible mantra and 1008 count; invite calm repeat listening without claiming guaranteed results.','imageGeneration':'Built-in ImageGen; original Shiva lingam art with black stone, brass water pot, jasmine and rose offerings, warm lamp-lit ancient temple, deep indigo and gold, no text. Thumbnail references that art with exact OM NAMAH / SHIVAYA / 1008 TIMES / INNER PEACE lettering.'});save('production-plan',plan)
 save('audio-audit',{'repetitions':COUNT,'cycleSeconds':8,'introSeconds':16,'chantSeconds':COUNT*8,'outroSeconds':8,'totalSeconds':TOTAL,'pcmFramesBeforeEncoding':TOTAL*rate,'sampleRate':rate,'cycleSource':str((SOURCE/'chant-cycle.wav').resolve()),'independentSourceTranscriptionMatches':True,'previous108MasterFullDecodePassed':True,'speedChanged':False,'pitchChanged':False,'humanPronunciationListeningReviewPending':True})
def render():
 for kind,seconds in [('intro',16),('chant',16),('outro',8)]:
  p=ROOT/f'{kind}-visual.mp4'
  if p.exists():continue
  run(['ffmpeg','-v','error','-nostdin','-n','-filter_threads','2','-i',str(ROOT/'water-flowers-loop.mp4'),'-vf',m.af(f'{kind}.ass'),'-t',str(seconds),'-an',*m.ENC,'-movflags','+faststart',str(p)])
 print('1008 captions and animation ready; assembling long video',flush=True)
 target=ROOT/'Om-Namah-Shivaya-1008-1080p.mp4'
 if not target.exists():
  run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'video.ffconcat'),'-f','concat','-safe','0','-i',str(ROOT/'audio.ffconcat'),'-map','0:v','-map','1:a','-c:v','copy','-af','alimiter=limit=0.89','-c:a','aac','-b:a','192k','-threads','2','-ar','48000','-movflags','+faststart','-progress',str(ROOT/'render-progress.txt'),str(target)])
 print('1008 master assembled; checking duration, frames and playback',flush=True)
 p=m.probe(target);v=next(s for s in p['streams'] if s['codec_type']=='video');assert (v['width'],v['height'])==(1920,1080);assert abs(float(p['format']['duration'])-TOTAL)<.15;assert int(v['nb_frames'])==TOTAL*24
 for at in [0,16,4000,TOTAL-10]:run(['ffmpeg','-v','error','-nostdin','-ss',str(at),'-i',str(target),'-t','3','-threads','2','-f','null','-'])
 run(['ffmpeg','-v','error','-nostdin','-i',str(target),'-vn','-threads','2','-f','null','-'])
 gif=ROOT/'Shiva-Water-Flowers-1008-Loop.gif'
 if not gif.exists():run(['ffmpeg','-v','error','-nostdin','-n','-filter_complex_threads','2','-i',str(ROOT/'chant-visual.mp4'),'-filter_complex','fps=10,scale=768:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=3','-loop','0',str(gif)])
 preview=ROOT/'Shiva-1008-Animated-Preview-1080p.mp4'
 if not preview.exists():
  (ROOT/'preview.ffconcat').write_text("ffconcat version 1.0\nfile 'intro-visual.mp4'\nfile 'chant-visual.mp4'\nfile 'chant-visual.mp4'\nfile 'outro-visual.mp4'\n",encoding='utf8')
  run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'preview.ffconcat'),'-i',str(SOURCE/'preview-audio.wav'),'-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','192k','-threads','2','-movflags','+faststart',str(preview)])
 save('VERIFICATION',{'file':str(target.resolve()),'repetitions':COUNT,'durationSeconds':float(p['format']['duration']),'frameCount':int(v['nb_frames']),'expectedFrameCount':TOTAL*24,'resolution':[1920,1080],'sourceLoopPreviouslyFullDecoded':True,'startMiddleEndPlaybackDecodePassed':True,'fullAudioDecodePassed':True,'exactRepetitionManifestCount':COUNT,'gifLoopCreated':True,'humanPronunciationListeningReviewPending':True,'published':False,'bytes':target.stat().st_size})
 print(json.dumps({'ready':str(target.resolve()),'repetitions':COUNT,'durationSeconds':TOTAL}),flush=True)
prepare();render()
