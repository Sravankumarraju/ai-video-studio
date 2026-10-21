"""Verify the completed single-block Telugu delivery."""
from pathlib import Path
import json, subprocess, re

ROOT = Path('data/productions/divine-wisdom/hanuman-chalisa/verse-first-2026-10-08')
OUT = ROOT / 'single-caption-v6'
VIDEO = OUT / 'playback/Hanuman-Chalisa-Telugu-Clear-V6.mp4'
SOURCE = ROOT / 'clear-telugu-2026-10-11/hanuman-chalisa-clear-telugu-1080p.mp4'

def run(args):
    return subprocess.run(args, capture_output=True, text=True, check=True)

layout = json.loads((OUT/'LAYOUT.json').read_text(encoding='utf-8'))
pages = layout['pages']
assert all(p['end'] <= q['start'] + .00001 for p,q in zip(pages,pages[1:]))
assert all(x.suffix == '.mp4' for x in (OUT/'playback').iterdir())
probe = json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(VIDEO)]).stdout)
assert sorted(s['codec_type'] for s in probe['streams']) == ['audio','video']
v = next(s for s in probe['streams'] if s['codec_type']=='video')
assert (v['width'],v['height']) == (1920,1080)
assert abs(float(probe['format']['duration'])-2100) < .1
assert abs(float(probe['format']['start_time'])) < .01
hashes = [run(['ffmpeg','-v','error','-nostdin','-i',str(p),'-map','0:a','-c','copy','-f','hash','-']).stdout.strip() for p in [SOURCE,VIDEO]]
assert hashes[0] == hashes[1]
print('Audio packets identical; one caption block; video metadata passed.',flush=True)
decode = run(['ffmpeg','-v','error','-nostdin','-threads','2','-i',str(VIDEO),'-f','null','-'])
assert not decode.stderr.strip(), decode.stderr
silence = run(['ffmpeg','-hide_banner','-nostdin','-i',str(VIDEO),'-vn','-af','silencedetect=noise=-45dB:d=1.5','-f','null','-'])
gaps = re.findall(r'silence_start: ([0-9.]+)',silence.stderr)
assert not gaps, gaps
for t in [160,1000,2080]:
    run(['ffmpeg','-v','error','-nostdin','-y','-ss',str(t),'-i',str(VIDEO),'-frames:v','1',str(OUT/f'review-{t}s.png')])
report = {'video':str(VIDEO.resolve()),'preview':str((OUT/'playback/Preview-Telugu-Clear-V6.mp4').resolve()),
          'durationSeconds':float(probe['format']['duration']),'resolution':'1920x1080',
          'maxSimultaneousTextBlocks':1,'captionPages':len(pages),'wordHighlighting':False,
          'font':'Nirmala UI','fullDecodePassed':True,'audioPacketsUnchanged':True,
          'longSilentGaps':0,'silenceThreshold':'-45dB, 1.5 seconds',
          'subtitleTracks':0,'subtitleSidecarsInPlaybackFolder':0,'uploaded':False}
(OUT/'FINAL_DELIVERY.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
status = json.loads((ROOT/'CURRENT_STATUS.json').read_text(encoding='utf-8'))
status['singleCaptionV6'] = report
status['latestLocalVideo'] = report['video']
(ROOT/'CURRENT_STATUS.json').write_text(json.dumps(status,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2),flush=True)
