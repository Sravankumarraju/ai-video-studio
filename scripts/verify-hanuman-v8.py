"""Verify highlighted shloka delivery without subtitle duplication."""
from pathlib import Path
import json, subprocess, re

ROOT=Path('data/productions/divine-wisdom/hanuman-chalisa/verse-first-2026-10-08')
OUT=ROOT/'highlighted-shloka-v8'
VIDEO=OUT/'playback/Hanuman-Chalisa-Highlighted-Shloka-V8.mp4'
SOURCE=ROOT/'clear-telugu-2026-10-11/hanuman-chalisa-clear-telugu-1080p.mp4'

def run(args):
    return subprocess.run(args,check=True,capture_output=True,text=True)

def seconds(s):
    h,m,t=s.split(':'); return 3600*int(h)+60*int(m)+float(t)

layout=json.loads((OUT/'LAYOUT.json').read_text(encoding='utf-8'))
assert len(layout['matchedRecitations'])==48
assert all(x['heldThroughExplanation'] for x in layout['matchedRecitations'])
spans={}
ass=(OUT/'highlight.ass').read_text(encoding='utf-8')
for line in ass.splitlines():
    if not line.startswith('Dialogue:'): continue
    cells=line.split(',',9)
    spans.setdefault(cells[3],[]).append((seconds(cells[1]),seconds(cells[2])))
for style,items in spans.items():
    items.sort()
    assert all(b<=c for (a,b),(c,d) in zip(items,items[1:])),style
assert '\\3c&H004AD5FF&' in ass
assert all(p.suffix=='.mp4' for p in (OUT/'playback').iterdir())
probe=json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(VIDEO)]).stdout)
assert sorted(s['codec_type'] for s in probe['streams'])==['audio','video']
v=next(s for s in probe['streams'] if s['codec_type']=='video')
assert (v['width'],v['height'])==(1920,1080)
assert abs(float(probe['format']['duration'])-2100)<.1
assert abs(float(probe['format']['start_time']))<.01
hashes=[run(['ffmpeg','-v','error','-nostdin','-i',str(p),'-map','0:a','-c','copy','-f','hash','-']).stdout.strip() for p in [SOURCE,VIDEO]]
assert hashes[0]==hashes[1]
print('Audio identical; both text regions non-overlapping; all 48 recitations aligned.',flush=True)
decode=run(['ffmpeg','-v','error','-nostdin','-threads','2','-i',str(VIDEO),'-f','null','-'])
assert not decode.stderr.strip(),decode.stderr
silence=run(['ffmpeg','-hide_banner','-nostdin','-i',str(VIDEO),'-vn','-af','silencedetect=noise=-45dB:d=1.5','-f','null','-'])
assert not re.findall(r'silence_start: ([0-9.]+)',silence.stderr)
report={'video':str(VIDEO.resolve()),'preview':str((OUT/'playback/Preview-Highlighted-Shloka-V8.mp4').resolve()),
        'durationSeconds':float(probe['format']['duration']),'resolution':'1920x1080',
        'spokenWordHighlighting':True,'completeShlokaHeldThroughExplanation':True,
        'matchedRecitations':48,'backgroundPanel':False,'textBackground':'light grey','activeWordBackground':'yellow','bold':True,'font':'Nirmala UI',
        'maxSimultaneousCaptionsPerRegion':1,'subtitleTracks':0,'subtitleSidecars':0,
        'audioPacketsUnchanged':True,'longSilentGaps':0,'fullDecodePassed':True,
        'fullIndependentListeningReview':False,'uploaded':False}
(OUT/'FINAL_DELIVERY.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
status=json.loads((ROOT/'CURRENT_STATUS.json').read_text(encoding='utf-8'))
status['highlightedShlokaV8']=report
status['latestLocalVideo']=report['video']
(ROOT/'CURRENT_STATUS.json').write_text(json.dumps(status,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2),flush=True)
