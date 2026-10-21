"""Source-corrected Telugu captions from one authorized acoustic transcription."""
from pathlib import Path
import json
import subprocess
import sys

ROOT = Path('data/productions/divine-wisdom/navaratri-what-is-2026-10-16')
SOURCE = ROOT / 'Navaratri-Ante-Emitamma-Logo-1080p.mp4'
OUT = ROOT / 'Navaratri-Ante-Emitamma-Captions-1080p.mp4'

def run(args):
    subprocess.run(args, check=True)

def stamp(t, srt=False):
    n = round(t * (1000 if srt else 100))
    unit = 1000 if srt else 100
    return (f'{n//(3600*unit):02}:{n//(60*unit)%60:02}:{n//unit%60:02},{n%unit:03}' if srt
            else f'{n//(3600*unit)}:{n//(60*unit)%60:02}:{n//unit%60:02}.{n%unit:02}')

def prepare():
    words = [w for w in json.loads((ROOT/'transcribe.json').read_text(encoding='utf8'))['words'] if w.get('type') == 'word']
    lines = [s.strip() for s in (ROOT/'lyrics-supplied.txt').read_text(encoding='utf8').splitlines() if s.strip() and not s.startswith('[')]
    # Inclusive word spans follow the performed recording, including its extra chorus.
    spans = [(0,2),(3,5),(6,9),(10,12),(13,16),(17,20),(21,24),(25,27),
             (28,29),(30,32),(33,36),(37,40),(41,43),(44,46),(47,49),(50,52),
             (53,56),(57,59),(60,62),(63,66),(67,70),(71,74),(75,77),(78,80),
             (81,83),(84,85),(86,88),(89,90),
             (91,92),(93,95),(96,99),(100,103),(104,106),(107,109),(110,112),(113,115),
             (116,119),(120,123),(124,127),(128,131),(132,135),(136,139),(140,142),(143,146),
             (147,149),(150,153),(154,156),(157,158),
             (159,160),(161,163),(164,167),(168,171),(172,174),(175,177),(178,180),(181,183)]
    text = lines[:48] + lines[8:16]
    assert len(spans) == len(text)
    captions = []
    for i, ((a,b), line) in enumerate(zip(spans, text)):
        start = words[a]['start']
        end = min(words[b]['end'] + .2, words[spans[i+1][0]]['start'] - .02 if i+1<len(spans) else 165.32)
        captions.append({'start': start, 'end': end, 'text': line, 'wordSpan': [a,b]})
    header = '''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Lyrics,Noto Sans Telugu,86,&H00FFFFFF,&H008CE6FF,&H00160E08,&H90000000,0,0,0,0,100,100,0,0,1,3,1,2,100,100,68,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    events = [f'Dialogue: 0,{stamp(c["start"])},{stamp(c["end"])},Lyrics,,0,0,0,,{c["text"]}' for c in captions]
    (ROOT/'lyrics-captions.ass').write_text(header+'\n'.join(events)+'\n', encoding='utf8')
    (ROOT/'captions-te.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(c["start"],True)} --> {stamp(c["end"],True)}\n{c["text"]}' for i,c in enumerate(captions))+'\n', encoding='utf8')
    (ROOT/'caption-timing.json').write_text(json.dumps({'method':'ElevenLabs Scribe v2 acoustic word timestamps; supplied lyrics restore spelling; manually mapped line spans',
        'captionLines':captions,'humanListeningVerified':False,'uncertainTail':{'start':165.14,'end':180.437,'captioned':False,'reason':'Unclear final sung words differ from supplied lyrics; no invented text'},
        'writtenButUnperformedSectionsOmitted':True}, ensure_ascii=False, indent=2), encoding='utf8')
    print(f'Prepared {len(captions)} timed Telugu captions', flush=True)

def filters():
    return f"drawbox=x=0:y=850:w=iw:h=230:color=black@0.40:t=fill:enable='between(t,10.7,165.35)',ass=filename='{ROOT.as_posix()}/lyrics-captions.ass':fontsdir='public/fonts':shaping=complex"

def render():
    run(['ffmpeg','-v','error','-nostdin','-n','-i',str(SOURCE),'-map','0:v:0','-map','0:a:0','-vf',filters(),
         '-c:v','libx264','-threads','6','-preset','veryfast','-crf','18','-c:a','copy','-movflags','+faststart',str(OUT)])
    print('Captioned export complete', flush=True)

def preview():
    for name,t in [('question',19.9),('chorus',35.0),('long-line',27.5),('traditions',140.8)]:
        run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(t),'-i',str(OUT),'-frames:v','1','-q:v','2',str(ROOT/f'caption-preview-{name}.jpg')])

def verify():
    info = json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(OUT)]))
    v=next(x for x in info['streams'] if x['codec_type']=='video')
    assert (v['width'],v['height'])==(1920,1080)
    assert abs(float(info['format']['duration'])-180.437)<.1
    def audiohash(path):
        return subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-map','0:a:0','-c','copy','-f','hash','-hash','sha256','-']).decode().strip()
    assert audiohash(OUT)==audiohash(ROOT/'recording-original.m4a')
    run(['ffmpeg','-v','error','-xerror','-nostdin','-i',str(OUT),'-f','null','-'])
    (ROOT/'verification-captions.json').write_text(json.dumps({'resolution':[1920,1080],'fullDecodePassed':True,'originalAudioPacketsUnchanged':True,
        'seconds':float(info['format']['duration']),'logoPreserved':True,'captionLines':56,'timing':'Automatic acoustic word timing, source spelling restored; final unclear phrase left uncaptained','published':False},indent=2),encoding='utf8')
    print('Verified captioned video and unchanged audio',flush=True)

if __name__=='__main__':
    {'prepare':prepare,'render':render,'preview':preview,'verify':verify}[sys.argv[1]]()
