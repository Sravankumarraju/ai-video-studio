from pathlib import Path
import subprocess,json
R=Path('data/productions/divine-wisdom/lalitha-ashtottara-2026-10-25')
final=R/'Sri-Lalitha-Ashtottara-Telugu-1080p-DRAFT.mp4'
raw=R/'Sri-Lalitha-Ashtottara-before-gain.mp4'
if not raw.exists():final.rename(raw)
if not final.exists():subprocess.run(['ffmpeg','-v','error','-nostdin','-n','-i',str(raw),'-c:v','copy','-af','volume=6dB','-c:a','aac','-b:a','192k','-movflags','+faststart',str(final)],check=True)
audio=R/'finished-audio-master.mp3'
if not audio.exists():subprocess.run(['ffmpeg','-v','error','-nostdin','-n','-i',str(R/'recitation-master.wav'),'-af','volume=6dB','-c:a','libmp3lame','-b:a','192k',str(audio)],check=True)
(R/'audio-level-check.json').write_text(json.dumps({'originalMeanDb':-26.8,'originalPeakDb':-9.5,'gainDb':6,'expectedPeakBeforeEncodingDb':-3.5,'originalAudioPreserved':True},indent=2),encoding='utf-8')
print(json.dumps({'audioGainDb':6,'normalizedMasterSaved':True}))
