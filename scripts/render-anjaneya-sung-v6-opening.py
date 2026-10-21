"""Prepare the approved sung opening while longer sections await provider retry agreement."""
from pathlib import Path
import importlib.util,json,re,subprocess,shutil
spec=importlib.util.spec_from_file_location('v4','scripts/render-anjaneya-reference-v4.py')
v4=importlib.util.module_from_spec(spec);spec.loader.exec_module(v4)
ROOT=v4.ROOT;SOURCE=ROOT/'song-style-v6';OUT=SOURCE/'opening-video';OUT.mkdir(exist_ok=True)
def run(a):subprocess.run(a,check=True)
def duration(p):return v4.duration(p)
text=(ROOT/'lyrics-supplied.txt').read_text(encoding='utf-8').strip().split('\n\n')[0]
(OUT/'lyrics-supplied.txt').write_text(text,encoding='utf-8')
alignment=json.loads((SOURCE/'opening-edited-align.json').read_text(encoding='utf-8'))
chars=alignment['characters'];aligned=''.join(c['text'] for c in chars)
assert aligned.split()==text.split()
words=[]
for m in re.finditer(r'\S+',aligned):
    selected=chars[m.start():m.end()]
    a=min(c['start'] for c in selected);b=max(c['end'] for c in selected)
    assert b-a>.05
    words.append(dict(text=m.group(),start=a,end=b))
prayer=duration(SOURCE/'opening-edited.wav');opening=6.;closing=duration(ROOT/'reference-v4/closing-voice.wav');seconds=opening+prayer+closing
shutil.copyfile(ROOT/'closing.ass',OUT/'closing.ass')
v4.OUT=OUT;v4.ROOT=OUT
v4.captions(words,prayer,seconds)
mix=OUT/'mix.wav'
if not mix.exists():
    graph=(f'[0:a]loudnorm=I=-17:TP=-2:LRA=7,aresample=48000,aformat=channel_layouts=stereo[a];'
        '[1:a]loudnorm=I=-17:TP=-2:LRA=7,aresample=48000,aformat=channel_layouts=stereo[b];'
        '[2:a]loudnorm=I=-17:TP=-2:LRA=7,aresample=48000,aformat=channel_layouts=stereo[c];'
        '[a][b][c]concat=n=3:v=0:a=1[voice];'
        f'[3:a]loudnorm=I=-32:TP=-4:LRA=6,aresample=48000,aformat=channel_layouts=stereo,atrim=duration={seconds},'
        f"volume='if(between(t,{opening},{opening+prayer}),0,1)':eval=frame[bed];"
        '[voice][bed]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.891251:level=false:latency=true[audio]')
    run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT/'reference-v4/opening-voice-clocked.wav'),'-i',str(SOURCE/'opening-edited.wav'),
        '-i',str(ROOT/'reference-v4/closing-voice.wav'),'-i',str(ROOT/'instrumental-v2.mp3'),'-filter_complex',graph,'-map','[audio]',
        '-ar','48000','-ac','2','-c:a','pcm_s16le',str(mix)])
total_background=duration(ROOT/'reference-v4/background.mp4')
target=SOURCE/'Anjaneya-Dandakam-V6-Opening-Preview.mp4'
if not target.exists():
    graph=(f'[0:v]split=2[s][e];[s]trim=end={opening+prayer},setpts=PTS-STARTPTS[first];'
        f'[e]trim=start={total_background-closing},setpts=PTS-STARTPTS[last];[first][last]concat=n=2:v=1:a=0,'
        'drawbox=x=0:y=0:w=iw:h=94:color=black@.40:t=fill,drawbox=x=0:y=785:w=iw:h=295:color=0x050C20@.83:t=fill,'
        f"ass=filename='{OUT.as_posix()}/full-captions.ass':fontsdir='public/fonts':shaping=complex[base];"
        '[2:v]scale=100:100[logo];[base][logo]overlay=25:0:format=auto,format=nv12[v]')
    run(['ffmpeg','-v','error','-nostdin','-n','-filter_complex_threads','2','-i',str(ROOT/'reference-v4/background.mp4'),'-i',str(mix),'-i',v4.base.BRAND['logo'],
        '-filter_complex',graph,'-map','[v]','-map','1:a:0','-t',str(seconds),'-c:v','h264_qsv','-preset','medium','-global_quality','20',
        '-c:a','aac','-b:a','192k','-movflags','+faststart','-progress',str(OUT/'progress.txt'),str(target)])
run(['ffmpeg','-v','error','-nostdin','-i',str(target),'-f','null','-'])
for name,t in [('opening',2),('singing',12),('closing',seconds-8)]:
    path=OUT/f'review-{name}.png'
    if not path.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(t),'-i',str(target),'-frames:v','1',str(path)])
(OUT/'verification.json').write_text(json.dumps(dict(file=str(target.resolve()),seconds=duration(target),songSeconds=prayer,
    scope='Opening stanza only, with channel welcome and closing',removedRepeat=True,mappedWords=len(words),
    fullDecodePassed=True,fullSong=False,published=False,pronunciationListeningReviewPending=True),indent=2),encoding='utf-8')
print(json.dumps(dict(file=str(target.resolve()),seconds=duration(target),words=len(words))))
