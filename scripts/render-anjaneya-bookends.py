"""Render channel bookends only; the provider-blocked song is not fabricated."""
from pathlib import Path
import json, math, re, subprocess, sys
from PIL import ImageFont

ROOT = Path('data/productions/divine-wisdom/anjaneya-dandakam-2026-10-16')
FPS = 24
FONT = ImageFont.truetype('public/fonts/NotoSansTelugu.ttf', 88)
PLAN = json.loads((ROOT/'plan.json').read_text(encoding='utf-8'))

def run(args):
    subprocess.run(args, check=True)

def probe(path):
    return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(path)]))

def stamp(seconds):
    n=round(seconds*100)
    return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'

def srtstamp(seconds):
    n=round(seconds*1000)
    return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'

HEADER='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Channel,Noto Sans,58,&H00FFFFFF,&H00FFFFFF,&H00201408,&H90000000,-1,0,0,0,100,100,0,0,1,2,0,5,50,50,50,1
Style: Title,Noto Sans Telugu,98,&H004AD5FF,&H004AD5FF,&H00201408,&H90000000,-1,0,0,0,100,100,0,0,1,2,0,5,50,50,50,1
Style: Action,Noto Sans Telugu,66,&H004AD5FF,&H004AD5FF,&H00201408,&H90000000,0,0,0,0,100,100,0,0,1,2,0,5,50,50,50,1
Style: Caption,Noto Sans Telugu,88,&H00FFFFFF,&H00FFFFFF,&H00101010,&H90000000,0,0,0,0,100,100,0,0,1,3,0,2,120,120,60,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''

def prepare(section):
    name=section['name']
    alignment=json.loads((ROOT/f'{name}-alignment.json').read_text(encoding='utf-8'))
    text=section['text']
    assert ''.join(alignment['characters'])==text, 'Narration alignment text mismatch'
    starts=alignment['character_start_times_seconds']
    ends=alignment['character_end_times_seconds']
    seconds=math.ceil((float(probe(ROOT/f'{name}.mp3')['format']['duration'])+.9)*FPS)/FPS
    words=[]
    for match in re.finditer(r'\S+',text):
        a=min(starts[match.start():match.end()])+.35
        b=max(ends[match.start():match.end()])+.35
        assert b-a>=.02, f'Collapsed narration word: {match.group()}'
        words.append({'text':match.group(),'start':a,'end':b})
    lines=[[]]
    for word in words:
        if lines[-1] and (FONT.getlength(' '.join(x['text'] for x in lines[-1]+[word]))>1600 or len(lines[-1])>=6):
            lines.append([])
        lines[-1].append(word)
    pages=[]
    for i in range(0,len(lines),2):
        group=lines[i:i+2]
        pages.append({'lines':group,'words':sum(group,[]),'start':group[0][0]['start'],'end':group[-1][-1]['end']+.12})
    for page,next_page in zip(pages,pages[1:]):
        page['end']=min(page['end'],next_page['start'])
    events=[]
    def event(a,b,style,text):
        events.append(f'Dialogue: 0,{stamp(a)},{stamp(b)},{style},,0,0,0,,{text}')
    event(0,seconds,'Channel',r'{\pos(1300,230)}Divine Wisdom Telugu')
    if name=='welcome':
        event(0,seconds,'Title',r'{\pos(1300,440)}శ్రీ ఆంజనేయ\Nదండకం')
        event(0,seconds,'Action',r'{\pos(1300,640)}ఛానల్‌కు స్వాగతం')
    else:
        event(0,seconds,'Title',r'{\pos(1300,400)}జై హనుమాన్')
        event(0,seconds,'Action',r'{\pos(1300,555)}సబ్‌స్క్రైబ్ · లైక్\Nషేర్ · కామెంట్')
    for page in pages:
        bounds=sorted(set([page['start'],page['end']]+[min(page['end'],max(page['start'],t)) for w in page['words'] for t in (w['start'],w['end'])]))
        for a,b in zip(bounds,bounds[1:]):
            if round(b*100)<=round(a*100):continue
            middle=(a+b)/2
            active=next((w for w in page['words'] if w['start']<=middle<w['end']),None)
            content=r'\N'.join(' '.join((r'{\c&H004AD5FF&}'+w['text']+r'{\c&H00FFFFFF&}') if w is active else w['text'] for w in line) for line in page['lines'])
            event(a,b,'Caption',content)
    (ROOT/f'{name}.ass').write_text(HEADER+'\n'.join(events)+'\n',encoding='utf-8')
    (ROOT/f'{name}-captions.srt').write_text('\n\n'.join(f'{i+1}\n{srtstamp(p["start"])} --> {srtstamp(p["end"])}\n'+ '\n'.join(' '.join(w['text'] for w in line) for line in p['lines']) for i,p in enumerate(pages))+'\n',encoding='utf-8')
    (ROOT/f'{name}-caption-layout.json').write_text(json.dumps({'seconds':seconds,'words':words,'pages':pages,'fontSize':88,'activeWordColor':'gold','timing':'actual generated narration timestamps'},ensure_ascii=False,indent=2),encoding='utf-8')
    return seconds,words

def render(section):
    name=section['name']
    seconds,words=prepare(section)
    output=ROOT/f'{name}-1080p.mp4'
    if not output.exists():
        graph=(f'[1:v]scale=660:660[logo];[0:v][logo]overlay=70:65:format=auto,'
            f'drawbox=x=0:y=780:w=iw:h=300:color=black@0.36:t=fill,'
            f"ass=filename='{ROOT.as_posix()}/{name}.ass':fontsdir='public/fonts':shaping=complex,format=yuv420p[v];"
            f'[2:a]aresample=48000,aformat=channel_layouts=stereo,adelay=350|350,apad,atrim=duration={seconds},alimiter=limit=0.891251:level=false:latency=true[a]')
        run(['ffmpeg','-v','error','-nostdin','-n','-f','lavfi','-i',f'color=c=0x071448:s=1920x1080:r={FPS}',
            '-loop','1','-i',PLAN['logo'],'-i',str(ROOT/f'{name}.mp3'),'-filter_complex',graph,
            '-map','[v]','-map','[a]','-t',str(seconds),'-c:v','libx264','-threads','4','-preset','veryfast','-crf','19',
            '-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart',str(output)])
    # Inspect a frame while a real word is active, not an instrumental gap.
    t=(words[min(4,len(words)-1)]['start']+words[min(4,len(words)-1)]['end'])/2
    frame=ROOT/f'review-{name}.png'
    if not frame.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(t),'-i',str(output),'-frames:v','1',str(frame)])
    return output,seconds

def main():
    clips=[render(section) for section in PLAN['bookends']]
    (ROOT/'bookends-concat.txt').write_text(''.join(f"file '{clip.name}'\n" for clip,seconds in clips),encoding='utf-8')
    output=ROOT/'Channel-Welcome-and-Closing-Preview.mp4'
    if not output.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'bookends-concat.txt'),'-c','copy','-movflags','+faststart',str(output)])
    run(['ffmpeg','-v','error','-nostdin','-i',str(output),'-f','null','-'])
    info=probe(output)
    video=next(s for s in info['streams'] if s['codec_type']=='video')
    assert (video['width'],video['height'])==(1920,1080)
    assert abs(float(info['format']['duration'])-sum(s for _,s in clips))<.2
    report={'scope':'Channel welcome and closing only; no Dandakam song included','channel':'Divine Wisdom Telugu',
        'narrationVoiceId':PLAN['narrationVoiceId'],'sameNarrationVoiceAsPreviousHanumanChalisa':True,
        'sungSongProduced':False,'songBlocker':'ElevenLabs copyright detector rejected supplied lyrics',
        'logoIncluded':True,'teluguWordHighlighting':True,'captionFontSize':88,'fullDecodePassed':True,
        'seconds':float(info['format']['duration']),'output':str(output.resolve()),'published':False}
    (ROOT/'bookends-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report),flush=True)

if __name__=='__main__':main()
