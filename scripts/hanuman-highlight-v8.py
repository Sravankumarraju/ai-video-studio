"""Bold Telugu, text-sized grey boxes and yellow spoken-word backgrounds."""
from pathlib import Path
from PIL import ImageFont
import json, subprocess, shutil, sys, unicodedata

ROOT=Path('data/productions/divine-wisdom/hanuman-chalisa/verse-first-2026-10-08')
PREVIOUS=ROOT/'clear-telugu-2026-10-11'
OUT=ROOT/'highlighted-shloka-v8'
PLAYBACK=OUT/'playback'
PLAYBACK.mkdir(parents=True,exist_ok=True)
(OUT/'fonts').mkdir(exist_ok=True)
shutil.copyfile('C:/Windows/Fonts/Nirmala.ttc',OUT/'fonts/Nirmala.ttc')
LAYOUT=json.loads((PREVIOUS/'CAPTION_LAYOUT.json').read_text(encoding='utf-8'))
PROJECT=json.loads((ROOT/'PROJECT_V3.json').read_text(encoding='utf-8'))
CLIPS=json.loads((ROOT/'RECITATION_CLIPS.json').read_text(encoding='utf-8'))
WORDS=json.loads((ROOT.parent/'full-original-2026-10-06/captions.json').read_text(encoding='utf-8'))['words']

def run(args):
    return subprocess.run(args,check=True,capture_output=True,text=True)

def stamp(t):
    n=round(t*100)
    return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'

def wrap(words,size,width=1530):
    font=ImageFont.truetype('C:/Windows/Fonts/Nirmala.ttc',size,index=1)
    lines=[[]]
    for w in words:
        if lines[-1] and font.getlength(' '.join(x['text'] for x in lines[-1]+[w]))>width:
            lines.append([])
        lines[-1].append(w)
    return lines

def norm(s):
    return ''.join(c for c in s if unicodedata.category(c)[0] in 'LM')

def prepare():
    events=[]; intervals=[]; pages=[]; checks=[]
    def emit(a,b,style,lines,size,highlight=True):
        bounds=sorted(set([a,b]+[max(a,min(b,t)) for line in lines for w in line
            for t in (w.get('start',a),w.get('end',a))])) if highlight else [a,b]
        for x,y in zip(bounds,bounds[1:]):
            x,y=round(x*100)/100,round(y*100)/100
            if y<=x: continue
            mid=(x+y)/2
            active=next((w for line in lines for w in line
                if w.get('start',-1)<=mid<w.get('end',-1)),None) if highlight else None
            text='\\N'.join(' '.join(('{\\3c&H004AD5FF&}'+w['text']+'{\\3c&H00E0E0E0&}')
                if w is active else w['text'] for w in line) for line in lines)
            pos=470 if style=='Shloka' else 990
            events.append(f'Dialogue: 0,{stamp(x)},{stamp(y)},{style},,0,0,0,,{{\\pos(960,{pos})\\fs{size}}}{text}')
            intervals.append((x,y,style))
    for p in LAYOUT['narrationPages']:
        lines=wrap(p['words'],96)
        for i in range(0,len(lines),2):
            group=lines[i:i+2]; ws=sum(group,[])
            a=max(p['start'],ws[0]['start']); b=min(p['end'],ws[-1]['end']+.1)
            if i+2<len(lines): b=min(b,lines[i+2][0]['start'])
            emit(a,b,'Meaning',group,96)
            pages.append({'start':a,'end':b,'kind':'meaning','lines':group})
    scenes={s['id']:s for s in PROJECT['document']['scenes']}
    for held,clip in zip(LAYOUT['heldVerses'],CLIPS):
        scene=next(s for s in LAYOUT['visualScenes'] if abs(s['start']-held['start'])<.01)
        source=[w for w in WORDS if clip['start']<=w['start']<clip['end']]
        assert len(source)==clip['wordCount'],clip
        words=[]; j=0
        for word in held['text'].split():
            item={'text':word}
            if norm(word):
                assert norm(word)==norm(source[j]['text']),(clip['sceneId'],word,source[j]['text'])
                item.update(start=held['start']+source[j]['start']-clip['start'],
                            end=min(scene['end'],held['start']+source[j]['end']-clip['start']))
                j+=1
            words.append(item)
        assert j==len(source)
        size=80; lines=wrap(words,size)
        if len(lines)>5: size=70; lines=wrap(words,size)
        assert len(lines)<=5
        emit(held['start'],scene['end'],'Shloka',lines,size)
        emit(scene['end'],held['end'],'Shloka',lines,size,False)
        pages.append({'start':held['start'],'end':held['end'],'kind':'shloka','lines':lines})
        checks.append({'scene':clip['sceneId'],'matchedWords':j,'heldThroughExplanation':True})
    for style in ['Shloka','Meaning']:
        spans=sorted((a,b) for a,b,s in intervals if s==style)
        assert all(b<=c for (a,b),(c,d) in zip(spans,spans[1:])),style
    header='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Meaning,Nirmala UI,96,&H00181818,&H00181818,&H00E0E0E0,&H00E0E0E0,-1,0,0,0,100,100,0,0,3,8,0,2,160,160,80,1
Style: Shloka,Nirmala UI,80,&H00181818,&H00181818,&H00E0E0E0,&H00E0E0E0,-1,0,0,0,100,100,0,0,3,8,0,5,160,160,80,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    (OUT/'highlight.ass').write_text(header+'\n'.join(events)+'\n',encoding='utf-8')
    record={'pages':pages,'matchedRecitations':checks,'events':len(events),'backgroundPanels':False,
            'textBackground':'light grey','activeWordBackground':'yellow','bold':True,'highlighting':True,'font':'Nirmala UI','maximumEventsPerRegion':1}
    (OUT/'LAYOUT.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'phase':'layout verified','recitations':len(checks),'events':len(events)}),flush=True)

def render(preview):
    target=PLAYBACK/('Preview-Highlighted-Shloka-V8.mp4' if preview else 'Hanuman-Chalisa-Highlighted-Shloka-V8.mp4')
    encoder=['-c:v','libx264','-threads','6','-preset','superfast','-crf','19','-pix_fmt','yuv420p'] if preview else ['-c:v','h264_qsv','-preset','medium','-global_quality','18','-pix_fmt','nv12']
    run(['ffmpeg','-hide_banner','-v','warning','-nostdin','-n','-f','concat','-safe','0',
         '-i',str(PREVIOUS/'artwork.ffconcat'),'-i',str(PREVIOUS/'hanuman-chalisa-clear-telugu-1080p.mp4'),
         '-map','0:v','-map','1:a','-vf',f'fps=24,setsar=1,ass={OUT.as_posix()}/highlight.ass:fontsdir={OUT.as_posix()}/fonts:shaping=complex',
         '-t','85' if preview else '2100',*encoder,
         '-c:a','copy','-movflags','+faststart','-progress',str(OUT/'progress.txt'),str(target)])
    for t in [2,12,60,70,80] if preview else [160,1000,2080]:
        run(['ffmpeg','-v','error','-nostdin','-y','-ss',str(t),'-i',str(target),'-frames:v','1',str(OUT/f'review-{t}s.png')])
    print(json.dumps({'phase':'rendered','file':str(target)}),flush=True)

if __name__=='__main__':
    prepare()
    render('--preview' in sys.argv)
