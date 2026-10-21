"""Render the supplied Navaratri recording in the established Shiva song format."""
from pathlib import Path
import json, math, subprocess, sys
from PIL import Image, ImageFont

ROOT=Path('data/productions/divine-wisdom/navaratri-song-2026-10-15')
OUT=ROOT/'Tommidi-Ratrula-Velugula-Jatara-1080p.mp4'
FPS=24
def run(args): subprocess.run(args,check=True)
def probe(file): return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(file)]))
def save(name,data): (ROOT/f'{name}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
def stamp(t):
    n=round(t*100); return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'
def srtstamp(t):
    n=round(t*1000); return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'

def prepare():
    duration=float(probe(ROOT/'song-original.m4a')['format']['duration'])
    source=(ROOT/'lyrics-supplied.txt').read_text(encoding='utf8').splitlines()
    sections=[]
    for line in source[1:]:
        if line.startswith('['): sections.append({'name':line.strip('[]'),'lines':[]})
        elif line.strip(): sections[-1]['lines'].append(line.strip())
    words=[w for w in json.loads((ROOT/'transcribe.json').read_text(encoding='utf8'))['words'] if w['text'].strip()]
    # Inclusive acoustic word indexes from the actual recording, with supplied
    # Telugu spelling. Uncertain ad-libs are left uncaptained.
    groups=[]
    def add(section,spans,lines=None):
        text=sections[section]['lines'] if lines is None else lines
        assert len(text)==len(spans)
        for line,(a,b) in zip(text,spans): groups.append((line,a,b,sections[section]['name']))
    add(0,[(0,2),(3,4),(5,7),(8,10)])
    chorus=[(14,17),(18,21),(22,24),(25,27),(28,30),(31,38),(39,42),(43,46),(47,49)]
    ch=sections[1]['lines']; performed_ch=ch[:3]+[ch[2]]+ch[3:]
    add(1,chorus,performed_ch)
    add(2,[(50,52),(53,55),(56,59),(60,61),(62,65),(66,67),(68,71),(72,74),(75,78),(79,81),(82,84),(85,87)])
    add(3,[(91,94),(95,98),(99,101),(102,104),(105,107),(108,113),(114,117),(118,121),(122,124)],performed_ch)
    v2=sections[4]['lines']; add(4,[(125,128),(129,132),(133,135),(136,139),(140,142),(143,144),(145,147),(148,150),(151,153),(154,157),(158,160),(161,164),(165,166)],v2[:7]+[v2[6]]+v2[7:])
    bridge=sections[5]['lines']; add(5,[(167,169),(170,172),(173,175),(176,177),(178,180),(181,183)],bridge[:4]+[bridge[5],'ఓపికతో వినడం నేర్చుకుందాం…'])
    add(6,[(184,186),(187,189),(190,193),(194,196),(197,200),(201,203),(204,206),(207,209),(210,212),(213,216),(217,219)],sections[6]['lines'][:11])
    add(7,[(220,223),(224,227),(228,230),(231,233),(234,236),(237,242),(243,246),(247,249)],ch[:3]+[ch[2]]+ch[3:6]+[ch[2]])
    captions=[]; font=ImageFont.truetype('public/fonts/NotoSansTelugu.ttf',94)
    for line,a,b,section in groups:
        ws=words[a:b+1]; size=94
        while font.getlength(line)*size/94>1690: size-=2
        captions.append({'text':line,'start':ws[0]['start'],'end':ws[-1]['end'],'words':ws,'fontSize':size,'section':section})
    for i,c in enumerate(captions): c['displayEnd']=min(c['end']+.2,captions[i+1]['start']-.02 if i+1<len(captions) else duration)
    header='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Noto Sans Telugu,94,&H00FFFFFF,&H00FFFFFF,&H001A100A,&H90000000,0,0,0,0,100,100,0,0,1,3,1,2,110,110,64,1
Style: Title,Noto Sans Telugu,78,&H007CE2FF,&H007CE2FF,&H001A100A,&H90000000,0,0,0,0,100,100,0,0,1,2,1,2,90,90,95,1
Style: Channel,Noto Sans,62,&H007CE2FF,&H007CE2FF,&H001A100A,&H90000000,1,0,0,0,100,100,0,0,1,2,1,2,90,90,120,1
Style: Small,Noto Sans Telugu,46,&H00FFFFFF,&H00FFFFFF,&H001A100A,&H90000000,0,0,0,0,100,100,0,0,1,2,1,2,90,90,60,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    events=[]
    def event(layer,a,b,style,text): events.append(f'Dialogue: {layer},{stamp(a)},{stamp(b)},{style},,0,0,0,,{text}')
    event(2,.7,5,'Channel',r'{\fad(600,450)}Divine Wisdom Telugu')
    event(2,.7,5,'Small',r'{\fad(600,450)}ఛానల్‌కు స్వాగతం')
    event(2,5.3,14.8,'Title',r'{\fad(600,650)}తొమ్మిది రాత్రుల\Nవెలుగుల జాతర')
    event(2,5.3,14.8,'Small',r'{\fs38\fad(600,650)}నవరాత్రి భక్తి గీతం')
    for c in captions:
        assert c['displayEnd']>c['start']
        size='{\\fs'+str(c['fontSize'])+'}'
        event(0,c['start'],c['displayEnd'],'Caption',size+c['text'])
        tokens=c['text'].split(); ws=c['words']
        # Gold word highlighting only where one-to-one acoustic tokens exist.
        if len(tokens)==len(ws):
            for k,w in enumerate(ws):
                end=min(w['end']+.02,c['displayEnd'],ws[k+1]['start'] if k+1<len(ws) else c['displayEnd'])
                if end-w['start']<.07: continue
                text=' '.join(r'{\c&H007CE2FF&}'+t+r'{\c&H00FFFFFF&}' if j==k else t for j,t in enumerate(tokens))
                event(1,w['start'],end,'Caption',size+text)
    event(2,171.0,duration-.4,'Channel',r'{\pos(960,790)\fad(500,800)}Divine Wisdom Telugu')
    event(2,171.0,duration-.4,'Small',r'{\pos(960,890)\fs54\fad(500,800)}సబ్‌స్క్రైబ్ చేయండి · లైక్ చేయండి')
    event(2,171.0,duration-.4,'Small',r'{\pos(960,978)\fs43\fad(500,800)}షేర్ చేయండి · మీ అభిప్రాయాన్ని కామెంట్ చేయండి')
    (ROOT/'captions.ass').write_text(header+'\n'.join(events)+'\n',encoding='utf8')
    (ROOT/'captions-te.srt').write_text('\n\n'.join(f'{i+1}\n{srtstamp(c["start"])} --> {srtstamp(c["displayEnd"])}\n{c["text"]}' for i,c in enumerate(captions))+'\n',encoding='utf8')
    (ROOT/'lyrics-performed.txt').write_text('\n'.join(c['text'] for c in captions)+'\n',encoding='utf8')
    save('captions',captions)
    save('caption-audit',{'method':'Scribe v2 acoustic word timestamps; supplied spelling restored; uncertain ad-libs not captioned','manualListeningVerified':False,'captionLines':len(captions),'omittedFromRecording':['bridge lines 5 and 7','verse 3 last line','final chorus last two lines','written closing'],'repeatsInRecording':['deepam deepam repeated in every chorus','panimutlanu line repeated in verse 2'],'sourceDirectionsRendered':False})
    cuts=[(0,'devi-cosmic'),(15.9,'festival-courtyard'),(25.9,'devi-cosmic'),(36,'devi-cosmic'),(47.9,'festival-courtyard'),(59.9,'festival-courtyard'),(74,'devi-cosmic'),(84,'lamp-grace'),(93.9,'tridevi'),(102,'tridevi'),(112,'festival-courtyard'),(120,'lamp-grace'),(131.9,'kolatam-celebration'),(140,'kolatam-celebration'),(148,'devi-cosmic'),(154,'devi-cosmic'),(164,'kolatam-celebration'),(171,'lamp-grace')]
    scenes=[]
    for i,(a,image) in enumerate(cuts):
        first=round(a*FPS); last=round(cuts[i+1][0]*FPS) if i+1<len(cuts) else math.ceil(duration*FPS)
        scenes.append({'index':i,'image':image+'.png','startFrame':first,'frames':last-first,'start':first/FPS,'end':last/FPS})
    save('timeline',{'duration':duration,'fps':FPS,'scenes':scenes})
    print(json.dumps({'captions':len(captions),'scenes':len(scenes),'duration':duration}),flush=True)

def render():
    plan=json.loads((ROOT/'timeline.json').read_text(encoding='utf8')); (ROOT/'pieces').mkdir(exist_ok=True)
    for s in plan['scenes']:
        output=ROOT/'pieces'/f'{s["index"]:02}.mp4'
        if output.exists(): continue
        assert (ROOT/s['image']).exists(),s['image']
        n=s['frames']; u=f'(on/{n-1})'; ease=f'({u}*{u}*(3-2*{u}))'
        z=f'1.01+0.055*{ease}' if s['index']%2==0 else f'1.065-0.055*{ease}'
        vf=f"scale=2560:1440:force_original_aspect_ratio=increase,crop=2560:1440,zoompan=z='{z}':x='(iw-iw/zoom)*0.5':y='(ih-ih/zoom)*0.42':d={n}:s=1920x1080:fps={FPS},setsar=1,drawbox=x=0:y=790:w=iw:h=290:color=black@0.38:t=fill,setpts=PTS+{s['start']}/TB,ass=filename='{ROOT.as_posix()}/captions.ass':fontsdir='public/fonts':shaping=complex,setpts=PTS-STARTPTS,format=yuv420p"
        if s['index']==0: vf+=',fade=t=in:st=0:d=0.7'
        if s['index']==len(plan['scenes'])-1: vf+=f',fade=t=out:st={n/FPS-1.1}:d=1.1'
        run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT/s['image']),'-vf',vf,'-frames:v',str(n),'-an','-c:v','libx264','-threads','4','-preset','veryfast','-crf','18','-video_track_timescale','24000',str(output)])
        print(f'Rendered scene {s["index"]+1}/{len(plan["scenes"])}',flush=True)
    (ROOT/'pieces.txt').write_text('\n'.join(f"file 'pieces/{s['index']:02}.mp4'" for s in plan['scenes'])+'\n',encoding='utf8')
    assert not OUT.exists(),'Final exists; preserve existing export'
    run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'pieces.txt'),'-i',str(ROOT/'song-original.m4a'),'-map','0:v:0','-map','1:a:0','-c','copy','-t',str(plan['duration']),'-map_metadata','-1','-metadata','title=తొమ్మిది రాత్రుల వెలుగుల జాతర','-metadata','artist=Divine Wisdom Telugu','-movflags','+faststart',str(OUT)])
    print('Export complete',flush=True)

def verify():
    p=probe(OUT); v=next(s for s in p['streams'] if s['codec_type']=='video')
    assert (v['width'],v['height'])==(1920,1080)
    original=probe(ROOT/'song-original.m4a'); assert abs(float(p['format']['duration'])-float(original['format']['duration']))<.1
    run(['ffmpeg','-v','error','-nostdin','-i',str(OUT),'-f','null','-'])
    def audiohash(file): return subprocess.check_output(['ffmpeg','-v','error','-i',str(file),'-map','0:a:0','-c','copy','-f','hash','-hash','sha256','-']).decode().strip()
    assert audiohash(OUT)==audiohash(ROOT/'song-original.m4a')
    for label,t in [('welcome',3),('title',9),('chorus',28),('family',57),('tridevi',98),('prayer',124),('dance',136),('closing',175)]:
        target=ROOT/f'review-{label}.jpg'
        if not target.exists(): run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(t),'-i',str(OUT),'-frames:v','1','-q:v','2',str(target)])
    thumb=ROOT/'youtube-thumbnail.jpg'
    im=Image.open(thumb); assert im.size==(1280,720); assert thumb.stat().st_size<2000000
    save('verification',{'video':str(OUT.resolve()),'resolution':[1920,1080],'fps':v['r_frame_rate'],'duration':float(p['format']['duration']),'fullDecodePassed':True,'originalAudioPacketsUnchanged':True,'thumbnailSize':[1280,720],'published':False,'captionTiming':'Automatic acoustic timing with corrected source text; no human listening review'})
    print('Video, audio integrity and thumbnail verified',flush=True)

if __name__=='__main__': {'prepare':prepare,'render':render,'verify':verify}[sys.argv[1]]()
