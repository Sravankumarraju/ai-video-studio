"""Replace the three-second silent logo intro using complete phrases from the existing Telugu recordings."""
from pathlib import Path
import json,subprocess
P=Path('data/productions/divine-wisdom/diwali-special-2026-11-08')
def run(args):return subprocess.run(args,check=True,capture_output=True,text=True).stdout
intro=P/'long-intro-spoken.wav'
if not intro.exists():
 graph='[0:a]atrim=start=2.70:end=3.94,asetpts=PTS-STARTPTS,afade=t=in:d=0.005,afade=t=out:st=1.235:d=0.005[a];[1:a]atrim=start=9.92:end=11.68,asetpts=PTS-STARTPTS,afade=t=in:d=0.005,afade=t=out:st=1.755:d=0.005[b];[a][b]concat=n=2:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,apad,atrim=duration=3[out]'
 run(['ffmpeg','-v','error','-nostdin','-n','-i',str(P/'long-voice-08-sindhuja.mp3'),'-i',str(P/'short-voice-04-sindhuja.mp3'),'-filter_complex',graph,'-map','[out]','-ac','2','-c:a','pcm_s24le',str(intro)])
target=P/'diwali-telugu-long-1080p-v2-spoken-intro.mp4'
if not target.exists():
 run(['ffmpeg','-v','error','-nostdin','-n','-i',str(P/'diwali-telugu-long-1080p.mp4'),'-i',str(intro),'-filter_complex','[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]','-map','0:v:0','-map','[a]','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart',str(target)])
info=json.loads(run(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(target)]))
assert abs(float(info['format']['duration'])-329.846333)<.15
assert next(s for s in info['streams'] if s['codec_type']=='video')['width']==1920
run(['ffmpeg','-v','error','-nostdin','-i',str(target),'-f','null','-'])
silence=subprocess.run(['ffmpeg','-hide_banner','-nostdin','-i',str(target),'-t','3','-af','silencedetect=noise=-40dB:d=0.4','-f','null','-'],capture_output=True,text=True,check=True).stderr
assert 'silence_start' not in silence,'Review an unexpected silence in the intro'
(P/'long-intro-v2-verification.json').write_text(json.dumps({'file':str(target),'seconds':float(info['format']['duration']),'introTranscript':'డివైన్ విజ్డమ్ తెలుగు. దీపావళి శుభాకాంక్షలు!','introSeconds':3,'existingVoiceReused':True,'videoStreamCopied':True,'fullDecodePassed':True,'introSilenceDetectionPassed':True,'fullListeningVerified':False,'additionalPaidGeneration':False},ensure_ascii=False,indent=2),encoding='utf8')
(P/'long-script-te-v2.txt').write_text('డివైన్ విజ్డమ్ తెలుగు. దీపావళి శుభాకాంక్షలు!\n\n'+(P/'long-script-te.txt').read_text(encoding='utf8'),encoding='utf8')
print(json.dumps({'file':str(target),'seconds':float(info['format']['duration']),'introSilenceDetectionPassed':True}))
