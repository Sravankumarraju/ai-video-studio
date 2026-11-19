from pathlib import Path
import subprocess, json, re
R=Path('data/productions/divine-wisdom/mahishasura-mardini-2026-10-25')
final=R/'Mahishasura-Mardini-Telugu-1080p-DRAFT.mp4'
raw=R/'Mahishasura-Mardini-before-gain.mp4'
def levels(file):
    run=subprocess.run(['ffmpeg','-hide_banner','-nostdin','-i',str(file),'-af','volumedetect','-f','null','-'],capture_output=True,text=True,check=True)
    return {k:float(re.search(k+r'_volume:\s*([-\d.]+) dB',run.stderr)[1]) for k in ['mean','max']}
before=levels(R/'recitation-master.wav')
gain=round(min(-18-before['mean'],-2-before['max']),2)
if not raw.exists():final.rename(raw)
if not final.exists():
    subprocess.run(['ffmpeg','-v','error','-nostdin','-n','-i',str(raw),'-c:v','copy','-af',f'volume={gain}dB','-c:a','aac','-b:a','192k','-movflags','+faststart',str(final)],check=True)
audio=R/'finished-audio-master.mp3'
if not audio.exists():
    subprocess.run(['ffmpeg','-v','error','-nostdin','-n','-i',str(R/'recitation-master.wav'),'-af',f'volume={gain}dB','-c:a','libmp3lame','-b:a','192k',str(audio)],check=True)
after=levels(final)
assert after['max']<0,'Encoded audio peak reaches clipping level'
report={'originalMeanDb':before['mean'],'originalPeakDb':before['max'],'gainDb':gain,'finalMeanDb':after['mean'],'finalPeakDb':after['max'],'rawRecordingPreserved':True,'listeningReviewPending':True}
(R/'audio-level-check.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report),flush=True)
