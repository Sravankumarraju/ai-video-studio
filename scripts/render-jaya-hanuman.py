"""Render the owner's supplied Hanuman recording with channel branding."""
from pathlib import Path
import importlib.util, json, math, shutil, subprocess, sys
from PIL import Image, ImageOps, ImageDraw, ImageFont

ROOT = Path('data/productions/divine-wisdom/jaya-hanuman-2026-10-15')
ART = ROOT.parent / 'hanuman-chalisa'
FPS = 24
DURATION = 179.691
OUT = ROOT / 'Jaya-Hanuman-Divine-Wisdom-Telugu-1080p.mp4'
spec = importlib.util.spec_from_file_location('previous_renderer', 'scripts/render-shiva-song.py')
previous = importlib.util.module_from_spec(spec)
spec.loader.exec_module(previous)

def run(args):
    subprocess.run(args, check=True)

def read(name):
    return json.loads((ROOT / f'{name}.json').read_text(encoding='utf8'))

def save(name, data):
    (ROOT / f'{name}.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf8')

def prepare():
    words = [w for w in read('align')['words'] if w['text'].strip()]
    lines = read('performed-lines')
    captions, offset = [], 0
    font = ImageFont.truetype('public/fonts/NotoSansTelugu.ttf', 82)
    for line in lines:
        n = len(line['text'].split())
        ws = words[offset:offset+n]
        offset += n
        assert ''.join(w['text'] for w in ws) == ''.join(line['text'].split())
        captions.append({**line, 'start':ws[0]['start'], 'end':ws[-1]['end'], 'words':ws})
    assert offset == len(words)
    # The independent recognizer places the first sung word at 8.98s.
    # Forced alignment drifted into the instrumental introduction.
    captions[0]['start'] = 8.98
    events = []
    def event(a,b,style,text,layer=1):
        events.append(f'Dialogue: {layer},{previous.stamp(a)},{previous.stamp(b)},{style},,0,0,0,,{text}')
    header = previous.HEADER.replace('94,&H', '82,&H')
    extra = '''Style: Brand,Noto Sans,30,&H00D5E9FF,&H00FFFFFF,&H00140C08,&H80000000,0,0,0,0,100,100,0,0,1,1,1,7,150,40,42,1
Style: Channel,Noto Sans,62,&H007CE2FF,&H00FFFFFF,&H0020140C,&H90000000,1,0,0,0,100,100,0,0,1,2,1,8,80,80,55,1
Style: Welcome,Noto Sans Telugu,53,&H00FFFFFF,&H00FFFFFF,&H0020140C,&H90000000,0,0,0,0,100,100,0,0,1,2,1,8,80,80,150,1
'''
    header = header.replace('[Events]', extra+'[Events]')
    event(0,DURATION,'Brand','Divine Wisdom Telugu')
    event(.7,5.7,'Channel',r'{\an5\pos(960,825)\fad(600,600)}Divine Wisdom Telugu')
    event(.7,5.7,'Welcome',r'{\an5\pos(960,928)\fad(600,600)}ఛానల్‌కు స్వాగతం')
    event(5.9,8.8,'Title',r'{\an5\pos(960,850)\fad(400,450)}జయ హనుమాన్')
    event(5.9,8.8,'Small',r'{\an5\pos(960,951)\fad(400,450)}తెలుగు భక్తి గీతం')
    event(173.4,179.2,'Channel',r'{\an5\pos(960,777)\fad(450,600)}Divine Wisdom Telugu')
    event(173.4,179.2,'Welcome',r'{\an5\pos(960,873)\fad(450,600)}సబ్‌స్క్రైబ్ చేయండి · లైక్ చేయండి')
    event(173.4,179.2,'Welcome',r'{\an5\pos(960,958)\fs43\fad(450,600)}షేర్ చేయండి · మీ అభిప్రాయాన్ని కామెంట్ చేయండి')
    for i,c in enumerate(captions):
        c['displayEnd'] = min(c['end']+.18, captions[i+1]['start']-.02 if i+1<len(captions) else 173.1)
        if 48 <= i <= 51:
            c['withheld'] = 'Final chorus recognition disagrees with supplied lines; listening review needed'
            continue
        if c['displayEnd']-c['start'] < .12:
            c['withheld'] = 'Alignment too short to display; not forced into unrelated audio'
            continue
        size = 82 if font.getlength(c['text']) < 1690 else 70
        event(c['start'],c['displayEnd'],'Caption',r'{\fs'+str(size)+r'\fad(70,90)}'+c['text'])
    (ROOT/'captions.ass').write_text(header+'\n'.join(events)+'\n',encoding='utf8')
    visible = [c for c in captions if not c.get('withheld')]
    (ROOT/'captions-te.srt').write_text('\n\n'.join(f'{i+1}\n{previous.srtstamp(c["start"])} --> {previous.srtstamp(c["displayEnd"])}\n{c["text"]}' for i,c in enumerate(visible))+'\n',encoding='utf8')
    save('captions',captions)
    cuts=[(0,'temple-hero'),(8.98,'devotion'),(26.02,'strength'),(39.18,'temple-hero'),(55.68,'ocean'),(64.96,'devotion'),(74.16,'strength'),(83.42,'temple-hero'),(97,'strength'),(112.86,'mountain'),(122.42,'devotion'),(131.56,'strength'),(140.78,'temple-hero'),(156.82,'peace'),(173.4,'temple-hero')]
    scenes=[]
    for i,(start,name) in enumerate(cuts):
        image=f'hanuman-{name}-v1.png'
        shutil.copyfile(ART/image,ROOT/image)
        first=round(start*FPS)
        last=round(cuts[i+1][0]*FPS) if i+1<len(cuts) else math.ceil(DURATION*FPS)
        scenes.append({'index':i,'start':first/FPS,'end':last/FPS,'frames':last-first,'image':image,'focalX':.5,'focalY':.40})
    save('timeline',{'seconds':DURATION,'fps':FPS,'scenes':scenes})
    save('production-notes',{'channel':'Divine Wisdom Telugu','sourceAudio':'User supplied recording; no music regeneration or voice cloning','sourceSeconds':DURATION,'omittedSectionsAccordingToTranscription':['soft bridge','charanam 3'],'captionTiming':'Acoustic forced alignment; recognition is imperfect, requires Telugu listening review','fullExactLyricPerformanceVerified':False,'published':False,'artwork':'Six existing owner project illustrations reused','overlays':'Visual welcome and subscribe/like/share/comment; no extra narration'})
    print(json.dumps({'captions':len(visible),'withheld':len(captions)-len(visible),'scenes':len(scenes)}),flush=True)

def visuals():
    previous.ROOT=ROOT
    previous.visuals()

def render():
    assert not OUT.exists(), 'Output exists; inspect before replacing'
    logo='data/branding/divine-wisdom/youtube-avatar/divine-wisdom-telugu-circle-safe.png'
    graph=f"[0:v]drawbox=x=0:y=770:w=iw:h=310:color=black@0.38:t=fill,ass=filename='{ROOT.as_posix()}/captions.ass':fontsdir='public/fonts':shaping=complex[base];[2:v]scale=86:86[logo];[base][logo]overlay=40:25:format=auto,format=yuv420p[v]"
    run(['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'pieces.txt'),'-i',str(ROOT/'song-original.m4a'),'-i',logo,'-filter_complex',graph,'-map','[v]','-map','1:a:0','-c:v','libx264','-threads','6','-preset','veryfast','-crf','18','-c:a','copy','-map_metadata','-1','-metadata','title=జయ హనుమాన్ | Divine Wisdom Telugu','-metadata','artist=Divine Wisdom Telugu','-t',str(DURATION),'-movflags','+faststart',str(OUT)])
    print(str(OUT),flush=True)

def verify():
    p=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(OUT)]))
    v=next(s for s in p['streams'] if s['codec_type']=='video')
    assert (v['width'],v['height'])==(1920,1080)
    assert abs(float(p['format']['duration'])-DURATION)<.08
    run(['ffmpeg','-v','error','-nostdin','-i',str(OUT),'-f','null','-'])
    def audiohash(file):
        return subprocess.check_output(['ffmpeg','-v','error','-i',str(file),'-map','0:a:0','-c','copy','-f','hash','-hash','sha256','-']).decode().strip()
    assert audiohash(OUT)==audiohash(ROOT/'song-original.m4a')
    for label,t in [('welcome',3),('prayer',18),('pallavi',31),('ocean',59),('mountain',117),('closing',176)]:
        frame=ROOT/f'review-{label}.jpg'
        if not frame.exists():
            run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(t),'-i',str(OUT),'-frames:v','1','-q:v','2',str(frame)])
    save('verification',{'resolution':'1920x1080','video':'H.264','audio':'AAC, original packets preserved','fullDecodePassed':True,'seconds':float(p['format']['duration']),'bytes':OUT.stat().st_size,'published':False,'fullLyricsPerformed':False})
    print(json.dumps(read('verification')),flush=True)

if __name__=='__main__':
    {'prepare':prepare,'visuals':visuals,'render':render,'verify':verify}[sys.argv[1]]()
