"""One static Telugu caption region, no karaoke and no subtitle sidecars."""
from pathlib import Path
from PIL import ImageFont
import json, subprocess, shutil, sys, math

ROOT = Path('data/productions/divine-wisdom/hanuman-chalisa/verse-first-2026-10-08')
PREVIOUS = ROOT / 'clear-telugu-2026-10-11'
OUT = ROOT / 'single-caption-v6'
PLAYBACK = OUT / 'playback'
PLAYBACK.mkdir(parents=True, exist_ok=True)
(OUT / 'fonts').mkdir(exist_ok=True)
shutil.copyfile('C:/Windows/Fonts/Nirmala.ttc', OUT / 'fonts' / 'Nirmala.ttc')
FONT = ImageFont.truetype('C:/Windows/Fonts/Nirmala.ttc', 112)
VERSE_FONT = ImageFont.truetype('C:/Windows/Fonts/Nirmala.ttc', 88)
layout = json.loads((PREVIOUS / 'CAPTION_LAYOUT.json').read_text(encoding='utf-8'))

def run(args):
    return subprocess.run(args, check=True, capture_output=True, text=True)

def ass_time(t):
    n = round(t * 100)
    return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'

def wrap(words, font, width=1500):
    lines = [[]]
    for w in words:
        if lines[-1] and font.getlength(' '.join(x['text'] for x in lines[-1]+[w])) > width:
            lines.append([])
        lines[-1].append(w)
    return lines

def prepare():
    events, intervals, pages, recitations = [], [], [], []
    for p in layout['narrationPages']:
        lines = wrap(p['words'], FONT)
        for i in range(0, len(lines), 2):
            chunk = lines[i:i+2]
            words = sum(chunk, [])
            a = max(p['start'], words[0]['start'])
            b = min(p['end'], words[-1]['end']+.1)
            if i+2 < len(lines):
                b = min(b, lines[i+2][0]['start'])
            text = '\\N'.join(' '.join(w['text'] for w in line) for line in chunk)
            pages.append({'start':a,'end':b,'text':text,'kind':'explanation'})
    for p in layout['heldVerses']:
        # The prayer appears during recitation only. Its following explanation
        # uses the same single screen area, with no repeated prayer above it.
        scene = next(s for s in layout['visualScenes'] if abs(s['start']-p['start']) < .01)
        a, b = p['start'], scene['end']
        words = [{'text':word} for word in p['text'].split()]
        lines = wrap(words, VERSE_FONT)
        size = 88
        if len(lines) > 5:
            size = 76
            lines = wrap(words, ImageFont.truetype('C:/Windows/Fonts/Nirmala.ttc', size))
        assert len(lines) <= 5
        pages.append({'start':a,'end':b,'text':'\\N'.join(' '.join(w['text'] for w in line)
                      for line in lines),'kind':'recitation','size':size})
        recitations.append((a,b))
    pages.sort(key=lambda p:p['start'])
    for i,p in enumerate(pages):
        if i+1<len(pages):
            p['end']=min(p['end'],pages[i+1]['start'])
        a,b=round(p['start']*100)/100,round(p['end']*100)/100
        assert b>a
        style='Prayer' if p['kind']=='recitation' else 'Telugu'
        tag=f'{{\\pos(960,700)\\fs{p["size"]}}}' if style=='Prayer' else '{\\pos(960,990)}'
        # Exactly one event per text page; no word-level color runs or base copy.
        events.append(f'Dialogue: 0,{ass_time(a)},{ass_time(b)},{style},,0,0,0,,{tag}{p["text"]}')
        intervals.append((a,b))
    assert all(b<=c for (a,b),(c,d) in zip(intervals,intervals[1:])), 'Caption overlap'
    header='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Telugu,Nirmala UI,112,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,2,160,160,80,1
Style: Prayer,Nirmala UI,88,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,160,160,80,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    (OUT/'single.ass').write_text(header+'\n'.join(events)+'\n',encoding='utf-8')
    (OUT/'LAYOUT.json').write_text(json.dumps({'pages':pages,'recitations':recitations,
        'maxSimultaneousTextBlocks':1,'highlighting':False,'font':'Nirmala UI',
        'explanationFontSize':112,'fontOutline':0,'subtitleSidecarsInPlaybackFolder':0},
        ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'phase':'single caption layout verified','pages':len(pages)}),flush=True)
    return recitations

def render(preview=False):
    recitations=prepare()
    expression='+'.join(f'between(t,{a:.6f},{b:.6f})' for a,b in recitations)
    filters=(f"fps=24,setsar=1,drawbox=x=110:y=720:w=1700:h=320:color=black@0.8:t=fill:enable='eq({expression},0)',"
        f"drawbox=x=110:y=330:w=1700:h=710:color=black@0.8:t=fill:enable='{expression}',"
        f'ass={OUT.as_posix()}/single.ass:fontsdir={OUT.as_posix()}/fonts:shaping=complex')
    target=PLAYBACK/('Preview-Telugu-Clear-V6.mp4' if preview else 'Hanuman-Chalisa-Telugu-Clear-V6.mp4')
    if not target.exists():
        p=run(['ffmpeg','-hide_banner','-v','warning','-nostdin','-n','-f','concat','-safe','0',
            '-i',str(PREVIOUS/'artwork.ffconcat'),'-i',str(PREVIOUS/'hanuman-chalisa-clear-telugu-1080p.mp4'),
            '-map','0:v','-map','1:a','-vf',filters,'-t','85' if preview else '2100',
            '-c:v','libx264','-threads','6','-preset','veryfast','-crf','19','-pix_fmt','yuv420p',
            '-c:a','copy','-movflags','+faststart',str(target)])
        (OUT/('preview-render.log' if preview else 'full-render.log')).write_text(p.stderr,encoding='utf-8')
    for t in [2,6,12,60,70,80]:
        run(['ffmpeg','-v','error','-nostdin','-y','-ss',str(t),'-i',str(target),'-frames:v','1',
            str(OUT/f'review-{t}s.png')])
    print(json.dumps({'phase':'rendered','file':str(target)}),flush=True)
    return target

if __name__=='__main__':
    render('--preview' in sys.argv)
