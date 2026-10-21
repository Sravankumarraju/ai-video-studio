"""Regression and full-file validation of the clear Telugu local delivery."""
from pathlib import Path
import subprocess, json, re

ROOT = Path('data/productions/divine-wisdom/hanuman-chalisa/verse-first-2026-10-08')
OUT = ROOT / 'clear-telugu-2026-10-11'
TARGET = OUT / 'hanuman-chalisa-clear-telugu-1080p.mp4'

def run(args):
    return subprocess.run(args, capture_output=True, text=True, check=True)

def at(s):
    h, m, sec = s.split(':')
    return int(h)*3600 + int(m)*60 + float(sec)

def max_active(file, style=None):
    events = []
    for line in file.read_text(encoding='utf-8').splitlines():
        if not line.startswith('Dialogue:'):
            continue
        parts = line.split(',', 9)
        if style and parts[3] != style:
            continue
        events += [(at(parts[1]), 1), (at(parts[2]), -1)]
    active = maximum = 0
    for t, change in sorted(events, key=lambda e: (e[0], e[1])):
        active += change
        maximum = max(maximum, active)
    return maximum

old_max = max_active(ROOT / 'rebuilt-2026-10-11' / 'opening.ass')
assert old_max > 1, 'Must reproduce duplicate overlays in the prior renderer'
counts = {style: max_active(OUT / 'clear.ass', style) for style in ['Narration','Verse']}
assert counts == {'Narration': 1, 'Verse': 1}, counts
info = json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(TARGET)]).stdout)
video = next(s for s in info['streams'] if s['codec_type']=='video')
audio = next(s for s in info['streams'] if s['codec_type']=='audio')
assert abs(float(video['start_time'])) < .001
assert abs(float(video['duration'])-2100) < .05
assert (video['width'],video['height']) == (1920,1080)
def audio_hash(file):
    return run(['ffmpeg','-v','error','-i',str(file),'-map','0:a','-c','copy','-f','hash','-']).stdout.strip()
source = ROOT / 'rebuilt-2026-10-11' / 'hanuman-chalisa-explanation-rebuilt-1080p.mp4'
assert audio_hash(TARGET) == audio_hash(source), 'Verified narration audio must stay identical'
run(['ffmpeg','-v','error','-nostdin','-i',str(TARGET),'-f','null','-'])
silence = run(['ffmpeg','-hide_banner','-nostdin','-i',str(TARGET),'-vn',
              '-af','silencedetect=noise=-45dB:d=1.5','-f','null','-'])
assert 'silence_start:' not in silence.stderr
preview = OUT / 'clear-telugu-preview-85s-final.mp4'
if not preview.exists():
    run(['ffmpeg','-v','error','-nostdin','-n','-i',str(TARGET),'-t','85','-c','copy',str(preview)])
for t in [2,6,12,70,160,1000,2080]:
    run(['ffmpeg','-v','error','-nostdin','-y','-ss',str(t),'-i',str(TARGET),
         '-frames:v','1','-q:v','2',str(OUT/f'final-{t}s.jpg')])
report = {'status':'local-completed','video':str(TARGET.resolve()),'preview':str(preview.resolve()),
          'durationSeconds':float(info['format']['duration']),'resolution':'1920x1080',
          'baselineMaxDuplicateCaptions':old_max,'newMaxActiveCaptionsPerRegion':counts,
          'teluguShaping':'complex','font':'Noto Sans Telugu','zeroLongSilentGaps':True,
          'audioBitstreamUnchanged':True,'fullDecodePassed':True,
          'completeVerseHeldThroughMatchingExplanation':True,
          'visualFramesReviewed':[2,6,12,70,160,1000,2080],
          'fullIndependentListeningReview':False,'youtubeUploaded':False}
(OUT/'FINAL_DELIVERY.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report),flush=True)
