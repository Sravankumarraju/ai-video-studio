"""Resumable owner-song production using the channel's existing visual identity."""
from pathlib import Path
import json, math, re, shutil, subprocess, sys, hashlib
from PIL import Image, ImageOps, ImageDraw, ImageFont

ROOT = Path('data/productions/divine-wisdom/anjaneya-courage-2026-10-18')
ART = ROOT.parent / 'anjaneya-dandakam-2026-10-16'
LOGO = Path('data/branding/divine-wisdom/youtube-avatar/divine-wisdom-telugu-circle-safe.png')
OUT = ROOT / 'Anjaneya-Adugulo-Dhairyama-Divine-Wisdom-Telugu-1080p.mp4'
FPS, OPENING = 24, 6.0
SONG = float(json.loads((ROOT/'source-probe.json').read_text(encoding='utf8'))['format']['duration'])
CLOSING = 16.512
TOTAL = OPENING + SONG + CLOSING
FONT = 'public/fonts/NotoSansTelugu.ttf'
SOURCES = {
 'blessing': ART/'hanuman-blessing-original.png',
 'mountain': ART/'hanuman-sanjeevani-original.png',
 'ocean': ART/'hanuman-lanka-leap-v2.png',
 'heart': ART/'hanuman-rama-sita-heart-v2.png',
 'protector': ART/'hanuman-temple-protector-v2.png',
 'meditation': ART/'hanuman-cosmic-meditation-v2.png',
 'sunset': ART/'reference-v4/hanuman-sunset.png',
 'coronation': ART/'reference-v4/rama-sita-coronation.png',
}

def run(args):
    subprocess.run(args, check=True)

def read(name):
    return json.loads((ROOT/f'{name}.json').read_text(encoding='utf8'))

def save(name, data):
    (ROOT/f'{name}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')

def stamp(t, srt=False):
    scale = 1000 if srt else 100
    n=round(t*scale)
    if srt:return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
    return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'

HEADER = '''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Noto Sans Telugu,92,&H00FFFFFF,&H00FFFFFF,&H00100805,&H90000000,0,0,0,0,100,100,0,0,1,3,0,2,140,140,70,1
Style: Brand,Noto Sans,32,&H00D5E9FF,&H00FFFFFF,&H00100805,&H90000000,0,0,0,0,100,100,0,0,1,1,0,7,145,40,32,1
Style: Title,Noto Sans Telugu,125,&H004AD5FF,&H004AD5FF,&H00100805,&H90000000,0,0,0,0,100,100,0,0,1,3,0,5,100,100,70,1
Style: English,Noto Sans,57,&H004AD5FF,&H00FFFFFF,&H00100805,&H90000000,1,0,0,0,100,100,0,0,1,2,0,5,100,100,70,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''

def prepare():
    # Reuse only the general channel call to action, excluding the earlier Dandakam wording.
    closing_audio=ROOT/'closing-song.wav'
    if not closing_audio.exists():
        run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ART/'reference-v4/closing-voice.wav'),'-i',str(ROOT/'song-original.m4a'),
             '-filter_complex',f'[0:a]atrim=start=3.65,asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo[voice];[1:a]atrim=start={SONG-3.65}:end={SONG},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,apad,atrim=duration=3.65[tail];[voice][tail]concat=n=2:v=0:a=1[a]',
             '-map','[a]','-t',str(CLOSING),'-c:a','pcm_s16le',str(closing_audio)])
    words=[w for w in read('align')['words'] if w['text'].strip()]
    rows=read('performed-lines'); cursor=0; captions=[]
    for row in rows:
        tokens=re.sub(r'[—!…]',' ',row['text']).split()
        selected=words[cursor:cursor+len(tokens)]; cursor+=len(tokens)
        assert [w['text'] for w in selected]==tokens
        captions.append({**row,'start':selected[0]['start'],'end':selected[-1]['end'],'words':selected})
    assert cursor==len(words)
    # Scribe independently confirms 3 chants in each refrain, then 2 in the final response.
    # Correct the alignment's extra phantom chant and its drift through the ending.
    del captions[42]
    def correct(i, spans):
        c=captions[i]; assert len(c['words'])==len(spans),(i,c)
        c['words']=[dict(w,start=a,end=b) for w,(a,b) in zip(c['words'],spans)]
        c['start'],c['end']=spans[0][0],spans[-1][1]
    correct(40,[(143.96,144.46),(144.56,145.02),(145.08,145.48),(145.62,146.12)])
    correct(41,[(147.26,147.48),(147.52,147.70),(147.80,148.34),(149.44,149.66),(149.70,149.94),(149.96,150.44)])
    correct(43,[(154.90,155.70),(155.96,157.02),(157.06,157.30),(157.34,157.60),(157.62,158.16)])
    correct(44,[(159.22,160.12),(160.36,161.40),(161.44,161.68),(161.74,161.98),(162.04,162.52)])
    cues=[];events=[]
    def event(a,b,style,text,layer=0):
        if b>a:events.append(f'Dialogue: {layer},{stamp(a)},{stamp(b)},{style},,0,0,0,,{text}')
    event(0,TOTAL,'Brand','Divine Wisdom Telugu')
    event(.4,5.8,'English',r'{\pos(960,690)\fad(350,350)}Divine Wisdom Telugu')
    # Captions for the reused, audible channel welcome.
    welcome=json.loads((ART/'welcome-caption-layout.json').read_text(encoding='utf8'))['words']
    start=next(w['start'] for w in welcome if w['text'].startswith('డివైన్'))
    end=next(w['end'] for w in welcome if w['text'].startswith('స్వాగతం'))
    welcome=[dict(w,start=w['start']-start+.4,end=w['end']-start+.4) for w in welcome if start<=w['start'] and w['end']<=end]
    welcome=[w for w in welcome if w['end']<=OPENING]
    cues.append({'start':.4,'end':5.8,'text':'డివైన్ విజ్డమ్ తెలుగు ఛానల్‌కు స్వాగతం!','kind':'welcome','words':welcome})
    # A title card sits in the supplied recording's instrumental introduction.
    event(6.7,13.9,'Title',r'{\pos(960,790)\fad(600,600)}అంజనేయా')
    for i,c in enumerate(captions):
        c['displayEnd']=min(c['end']+.18,captions[i+1]['start']-.025 if i+1<len(captions) else SONG)
        assert c['displayEnd']>c['start'],c
        c.update(start=c['start']+OPENING,end=c['end']+OPENING,displayEnd=c['displayEnd']+OPENING)
        c['words']=[dict(w,start=w['start']+OPENING,end=w['end']+OPENING) for w in c['words']]
        cues.append(dict(c,end=c['displayEnd'],kind='song'))
    # Existing spoken subscribe/like/share/comment closing with its measured word timings.
    closing=json.loads((ART/'closing-caption-layout.json').read_text(encoding='utf8'))['words']
    closing=[dict(w,start=w['start']-3.65,end=w['end']-3.65) for w in closing if w['start']>=3.65]
    close_start=OPENING+SONG
    for k in range(0,len(closing),7):
        ws=[dict(w,start=w['start']+close_start,end=w['end']+close_start) for w in closing[k:k+7]]
        cues.append({'start':ws[0]['start'],'end':min(TOTAL,ws[-1]['end']+.08),'text':' '.join(w['text'] for w in ws),'kind':'closing','words':ws})
    cues.sort(key=lambda c:c['start'])
    for a,b in zip(cues,cues[1:]):
        a['end']=min(a['end'],b['start']-.01)
    for c in cues:
        size=92
        ws=c['words']
        def wrapped(size):
            font=ImageFont.truetype(FONT,size);lines=[[]]
            for j,w in enumerate(ws):
                if lines[-1] and font.getlength(' '.join(ws[x]['text'] for x in lines[-1]+[j]))>1620:lines.append([])
                lines[-1].append(j)
            return lines
        lines=wrapped(size)
        while len(lines)>2:size-=4;lines=wrapped(size)
        assert size>=76 and len(lines)<=2
        c['fontSize']=size;c['lines']=[' '.join(ws[j]['text'] for j in line) for line in lines]
        bounds=sorted(set([c['start'],c['end']]+[max(c['start'],min(c['end'],t)) for w in ws for t in (w['start'],w['end'])]))
        for a,b in zip(bounds,bounds[1:]):
            mid=(a+b)/2
            active=next((j for j,w in enumerate(ws) if w['start']<=mid<w['end'] and w['end']-w['start']>=.065),None)
            text=r'\N'.join(' '.join((r'{\c&H004AD5FF&}'+ws[j]['text']+r'{\c&H00FFFFFF&}') if j==active else ws[j]['text'] for j in line) for line in lines)
            event(a,b,'Caption',r'{\fs'+str(size)+'}'+text)
    cues.sort(key=lambda c:c['start'])
    for a,b in zip(cues,cues[1:]):
        a['end']=min(a['end'],b['start']-.01)
    assert all(a['end']<=b['start']+.02 for a,b in zip(cues,cues[1:]))
    (ROOT/'captions.ass').write_text(HEADER+'\n'.join(events)+'\n',encoding='utf8')
    (ROOT/'captions-te.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(c["start"],True)} --> {stamp(c["end"],True)}\n'+ '\n'.join(c['lines']) for i,c in enumerate(cues))+'\n',encoding='utf8')
    (ROOT/'captions-te.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(f'{stamp(c["start"],True).replace(",",".")} --> {stamp(c["end"],True).replace(",",".")}\n'+ '\n'.join(c['lines']) for c in cues)+'\n',encoding='utf8')
    save('captions',cues)
    cuts=[(0,'sunset'),(6,'blessing'),(14.82,'protector'),(26.84,'heart'),(32.44,'blessing'),(41,'ocean'),(45.36,'coronation'),(50.1,'heart'),(58.5,'coronation'),(67.28,'protector'),(79.22,'blessing'),(84.64,'protector'),(93.3,'mountain'),(102.06,'blessing'),(110.74,'heart'),(119.3,'meditation'),(126.02,'sunset'),(134.8,'protector'),(146.72,'blessing'),(156.52,'coronation'),(160.9,'sunset'),(169.62,'meditation'),(177.1,'sunset'),(OPENING+SONG,'blessing')]
    # Subdivide holds so no camera shot exceeds eight seconds.
    scenes=[]
    for i,(a,name) in enumerate(cuts):
        b=cuts[i+1][0] if i+1<len(cuts) else TOTAL
        count=math.ceil((b-a)/8)
        for j in range(count):
            first=round((a+(b-a)*j/count)*FPS)
            last=round((a+(b-a)*(j+1)/count)*FPS) if i+1<len(cuts) or j+1<count else math.ceil(TOTAL*FPS)
            scenes.append({'index':len(scenes),'start':first/FPS,'end':last/FPS,'frames':last-first,'image':name+'.png','focalX':.50,'focalY':.44,'motion':'zoom-in' if len(scenes)%2==0 else 'zoom-out'})
    (ROOT/'artwork').mkdir(exist_ok=True)
    for name,source in SOURCES.items():
        dst=ROOT/'artwork'/f'{name}.png'
        if not dst.exists():ImageOps.fit(Image.open(source).convert('RGB'),(1920,1080),method=Image.Resampling.LANCZOS).save(dst)
    save('timeline',{'seconds':TOTAL,'songSeconds':SONG,'openingSeconds':OPENING,'closingSeconds':CLOSING,'fps':FPS,'scenes':scenes})
    save('production-notes',{'styleReference':'Anjaneya Dandakam reference V4 and recent channel song editions','audio':'Owner supplied original M4A, full song without tempo or pitch changes; existing channel spoken welcome and closing reused','captionTiming':'Forced acoustic alignment checked against independent Scribe transcription; extra sung chants retained; ending corrected using recognizer timings','manualListeningVerified':False,'artwork':'Eight existing owner-project Hanuman illustrations reused','published':False})
    print(json.dumps({'phase':'prepared','songLines':len(captions),'captionCues':len(cues),'shots':len(scenes),'seconds':TOTAL}),flush=True)

def visuals():
    (ROOT/'pieces').mkdir(exist_ok=True)
    scenes=read('timeline')['scenes']
    for s in scenes:
        out=ROOT/'pieces'/f'{s["index"]:02}.mp4'
        if out.exists():continue
        n=s['frames'];u=f'(on/{max(1,n-1)})';ease=f'({u}*{u}*(3-2*{u}))'
        z=f'1.01+0.035*{ease}' if s['index']%2==0 else f'1.045-0.035*{ease}'
        vf=f"scale=2560:1440,zoompan=z='{z}':x='(iw-iw/zoom)*.50':y='(ih-ih/zoom)*.44':d={n}:s=1920x1080:fps={FPS},setsar=1"
        if s['index']==0:vf+=',fade=t=in:d=0.6'
        if s['index']==len(scenes)-1:vf+=f',fade=t=out:st={n/FPS-.8}:d=0.8'
        run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT/'artwork'/s['image']),'-vf',vf,'-frames:v',str(n),'-an','-c:v','h264_qsv','-preset','medium','-global_quality','19','-video_track_timescale','24000',str(out)])
        print(json.dumps({'visualScene':s['index']+1,'of':len(scenes)}),flush=True)
    (ROOT/'pieces.txt').write_text('\n'.join(f"file 'pieces/{s['index']:02}.mp4'" for s in scenes)+'\n',encoding='utf8')

def render():
    if OUT.exists():raise RuntimeError('Final exists; inspect before replacing')
    graph=(f"[0:v]drawbox=x=0:y=0:w=iw:h=82:color=black@.3:t=fill,drawbox=x=0:y=800:w=iw:h=280:color=0x050c20@.65:t=fill,ass=filename='{ROOT.as_posix()}/captions.ass':fontsdir='public/fonts':shaping=complex[base];"
        '[4:v]scale=92:92[logo];[base][logo]overlay=25:0:format=auto,format=nv12[v];'
        '[1:a]aresample=48000,aformat=channel_layouts=stereo[a];[2:a]aresample=48000,aformat=channel_layouts=stereo[b];'
        '[3:a]aresample=48000,aformat=channel_layouts=stereo[c];[a][b][c]concat=n=3:v=0:a=1[audio]')
    run(['ffmpeg','-v','error','-nostdin','-n','-filter_complex_threads','2','-f','concat','-safe','0','-i',str(ROOT/'pieces.txt'),'-i',str(ART/'reference-v4/opening-voice-clocked.wav'),'-i',str(ROOT/'song-original.m4a'),'-i',str(ROOT/'closing-song.wav'),'-i',str(LOGO),'-filter_complex',graph,'-map','[v]','-map','[audio]','-t',str(TOTAL),'-c:v','h264_qsv','-preset','medium','-global_quality','19','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-map_metadata','-1','-metadata','title=అంజనేయా — అడుగులో ధైర్యమా | Divine Wisdom Telugu','-metadata','artist=Divine Wisdom Telugu','-movflags','+faststart','-progress',str(ROOT/'render-progress.txt'),str(OUT)])
    print(json.dumps({'phase':'rendered','file':str(OUT)}),flush=True)

def package():
    art=Image.open(ROOT/'artwork/protector.png').convert('RGBA')
    # Left Hanuman portrait and dark right field preserve the channel's thumbnail composition.
    portrait=ImageOps.fit(Image.open(ROOT/'artwork/blessing.png').convert('RGB'),(1120,1080),centering=(.5,.4))
    art.paste(portrait,(0,0));shade=Image.new('RGBA',art.size);d=ImageDraw.Draw(shade)
    for x in range(1920):d.line((x,0,x,1080),fill=(7,13,24,int(245*max(0,min(1,(x-580)/520)))))
    Image.alpha_composite(art,shade).convert('RGB').save(ROOT/'thumbnail-background.png')
    e=[r'Dialogue: 0,0:00:00.00,0:00:02.00,Title,,0,0,0,,{\pos(1400,300)\fs190}అంజనేయా',r'Dialogue: 0,0:00:00.00,0:00:02.00,Title,,0,0,0,,{\pos(1400,535)\fs114\c&H00FFFFFF&}అడుగులో ధైర్యమా',r'Dialogue: 0,0:00:00.00,0:00:02.00,Title,,0,0,0,,{\pos(1400,730)\fs66}తెలుగు భక్తి గీతం',r'Dialogue: 0,0:00:00.00,0:00:02.00,English,,0,0,0,,{\pos(1400,950)\fs39}DIVINE WISDOM TELUGU']
    (ROOT/'thumbnail.ass').write_text(HEADER+'\n'.join(e)+'\n',encoding='utf8')
    graph=f"[0:v]ass=filename='{ROOT.as_posix()}/thumbnail.ass':fontsdir='public/fonts':shaping=complex[base];[1:v]scale=128:128[logo];[base][logo]overlay=45:35,scale=1280:720[v]"
    run(['ffmpeg','-v','error','-nostdin','-y','-i',str(ROOT/'thumbnail-background.png'),'-i',str(LOGO),'-filter_complex',graph,'-map','[v]','-frames:v','1','-q:v','2',str(ROOT/'youtube-thumbnail.jpg')])
    title='అంజనేయా — అడుగులో ధైర్యమా | Hanuman Telugu Devotional Song | Divine Wisdom Telugu'
    assert len(title)<=100
    labels={'Opening chorus':'ఆరంభ పల్లవి','Verse 1':'చరణం 1 · రామదూత హనుమా','Chorus':'పల్లవి','Verse 2':'చరణం 2 · ధైర్యం, సేవ','Bridge':'వినయం · భక్తి','Final chorus':'చివరి పల్లవి','Outro':'శ్రీరామ నామస్మరణ'}
    chapters=[{'start':0,'label':'స్వాగతం · అంజనేయా భక్తి గీతం'}];seen=set()
    for c in read('captions'):
        section=c.get('section')
        if section and section not in seen:
            seen.add(section)
            if section!='Opening chorus':chapters.append({'start':int(c['start']),'label':labels[section]})
    chapters.append({'start':int(OPENING+SONG),'label':'ముగింపు · జై హనుమాన్'})
    assert all(b['start']-a['start']>=10 for a,b in zip(chapters,chapters[1:]))
    chapter_text='\n'.join(f'{int(c["start"])//60:02}:{int(c["start"])%60:02} {c["label"]}' for c in chapters)
    lyrics=(ROOT/'lyrics-supplied.txt').read_text(encoding='utf8')
    description=f'''అంజనేయా — అడుగులో ధైర్యమా! | తెలుగు హనుమాన్ భక్తి గీతం

Divine Wisdom Telugu ఛానల్‌కు స్వాగతం!

హనుమంతుని ధైర్యం, బలం, వినయం, రామభక్తి, సేవా గుణాలను స్మరించుకునే తెలుగు భక్తి గీతం. కష్టాల్లో ధైర్యంగా ముందడుగు వేయడం, బలహీనులకు తోడుగా నిలవడం, ఫలితంపై గర్వం లేకుండా సేవ చేయడం ఈ పాట సందేశం.

🎵 పాట: అంజనేయా — అడుగులో ధైర్యమా
భాష: తెలుగు | 1080p | తెలుగు పాట పదాలు, బంగారు రంగులో పదాల హైలైట్

వీడియో భాగాలు:
{chapter_text}

పాట పదాలు:
{lyrics}

మీకు నచ్చిన పంక్తిని కామెంట్‌లో చెప్పండి. పాట నచ్చితే లైక్ చేయండి, కుటుంబ సభ్యులతో షేర్ చేయండి. మరిన్ని భక్తి గీతాల కోసం Divine Wisdom Telugu ఛానల్‌కు సబ్‌స్క్రైబ్ చేయండి. జై హనుమాన్! జై శ్రీరామ్!

Audio: owner-supplied recording. The song is retained in full at its original speed and pitch. Existing channel welcome and closing are included. Illustrations are imagined AI-assisted devotional artwork reused from this channel's production assets. Telugu captions and editing prepared with AI assistance. This devotional song is not presented as a quotation from scripture.

#అంజనేయా #Hanuman #TeluguDevotionalSongs #Anjaneya #DivineWisdomTelugu

ఈ వీడియోలో పాట పదాలు, ఉచ్చారణ లేదా వివరణలో ఏదైనా పొరపాటు ఉంటే మనస్ఫూర్తిగా క్షమాపణలు కోరుతున్నాం. దయచేసి కామెంట్‌లో తెలియజేయండి; పరిశీలించి సరిచేస్తాం.
'''
    assert len(description)<=5000,len(description)
    tags=['అంజనేయా','అడుగులో ధైర్యమా','హనుమాన్ భక్తి పాట','Anjaneya Adugulo Dhairyama','Hanuman Telugu song','Telugu Hanuman devotional song','Vayuputra','Rama Dootha Hanuma','Jai Hanuman','Telugu bhakti songs','Divine Wisdom Telugu']
    publishing={'title':title,'titles':[title],'description':description,'tags':tags,'hashtags':'#అంజనేయా #Hanuman #TeluguDevotionalSongs #DivineWisdomTelugu','chapters':chapter_text,'language':'te','category':'Music','thumbnail':'youtube-thumbnail.jpg','privacy':'private','uploaded':False,'published':False}
    save('publishing',publishing)
    (ROOT/'lyrics-performed-final.txt').write_text('\n'.join(c['text'] for c in read('captions') if c['kind']=='song')+'\n',encoding='utf8')
    for name,text in [('youtube-title',title),('youtube-description',description),('youtube-tags',', '.join(tags)),('youtube-chapters',chapter_text)]: (ROOT/f'{name}.txt').write_text(text+'\n',encoding='utf8')
    print(json.dumps({'phase':'packaged','descriptionCharacters':len(description),'titleCharacters':len(title)}),flush=True)

def sample():
    graph=(f"[0:v]setpts=PTS+16/TB,drawbox=x=0:y=0:w=iw:h=82:color=black@0.3:t=fill,drawbox=x=0:y=800:w=iw:h=280:color=0x050c20@0.65:t=fill,ass=filename='{ROOT.as_posix()}/captions.ass':fontsdir='public/fonts':shaping=complex[base];"
           '[1:v]scale=92:92[logo];[base][logo]overlay=25:0[v]')
    run(['ffmpeg','-v','error','-nostdin','-y','-i',str(ROOT/'artwork/protector.png'),'-i',str(LOGO),'-filter_complex',graph,'-map','[v]','-frames:v','1',str(ROOT/'caption-layout-check.png')])

def verify():
    info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(OUT)]))
    v=next(s for s in info['streams'] if s['codec_type']=='video');a=next(s for s in info['streams'] if s['codec_type']=='audio')
    assert (v['width'],v['height'],v['codec_name'],a['codec_name'])==(1920,1080,'h264','aac')
    assert abs(float(info['format']['duration'])-TOTAL)<.1
    run(['ffmpeg','-v','error','-nostdin','-i',str(OUT),'-f','null','-'])
    # Compare decoded song samples with the final audio at the six-second offset.
    import numpy as np
    def pcm(path,start):
        return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-ss',str(start),'-i',str(path),'-t','12','-map','0:a:0','-ac','1','-ar','16000','-f','f32le','-']),dtype=np.float32)
    correlations=[]
    for t in [15,75,145]:
        source=pcm(ROOT/'song-original.m4a',t);rendered=pcm(OUT,t+OPENING);n=min(len(source),len(rendered))
        correlations.append(float(np.corrcoef(source[:n],rendered[:n])[0,1]))
    assert min(correlations)>.98,correlations
    frames=[]
    for i,t in enumerate([3,10,16,28,43,49,66,88,107,123,140,157,170,190,199]):
        file=ROOT/f'review-{i:02}-{t}s.jpg'
        if not file.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(t),'-i',str(OUT),'-frames:v','1','-q:v','2',str(file)])
        frames.append(file)
    sheet=Image.new('RGB',(1280,math.ceil(len(frames)/4)*200),'#10151f');d=ImageDraw.Draw(sheet)
    for i,f in enumerate(frames):sheet.paste(ImageOps.fit(Image.open(f),(320,180)),((i%4)*320,(i//4)*200));d.text(((i%4)*320+8,(i//4)*200+182),f.stem,fill='white')
    sheet.save(ROOT/'video-review-contact.jpg')
    report={'file':str(OUT.resolve()),'seconds':float(info['format']['duration']),'songSeconds':SONG,'resolution':'1920x1080','fps':v['r_frame_rate'],'video':'H.264','audio':'AAC stereo 48 kHz','fullDecodePassed':True,'originalSongSampleCorrelations':correlations,'tempoOrPitchChanges':False,'bytes':OUT.stat().st_size,'captionCues':len(read('captions')),'shots':len(read('timeline')['scenes']),'artworkCount':len(SOURCES),'manualListeningVerified':False,'published':False}
    save('verification',report)
    print(json.dumps(report),flush=True)

def deliver():
    import zipfile
    report=read('verification');assert report['fullDecodePassed']
    target=Path('output/anjaneya-courage-youtube');target.mkdir(parents=True,exist_ok=True)
    names=[OUT.name,'youtube-thumbnail.jpg','youtube-title.txt','youtube-description.txt','youtube-tags.txt','youtube-chapters.txt','youtube-pinned-comment.txt','captions-te.srt','captions-te.vtt','lyrics-supplied.txt','lyrics-performed-final.txt','publishing.json','story-studio-project.json','verification.json','video-review-contact.jpg']
    for name in names:shutil.copyfile(ROOT/name,target/name)
    manifest={'title':read('publishing')['title'],'seconds':report['seconds'],'resolution':report['resolution'],'sourceSongPreservedAtOriginalTempoAndPitch':True,'published':False,'uploaded':False,'manualListeningReviewPending':True,'portableProject':'story-studio-project.json','files':[{'name':name,'bytes':(target/name).stat().st_size,'sha256':hashlib.sha256((target/name).read_bytes()).hexdigest()} for name in names]}
    (target/'delivery-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
    archive=Path('output/anjaneya-courage-youtube-package.zip')
    with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=3) as z:
        for file in target.iterdir():z.write(file,arcname=file.name)
    with zipfile.ZipFile(archive) as z:assert z.testzip() is None
    print(json.dumps({'directory':str(target.resolve()),'archive':str(archive.resolve()),'files':len(manifest['files'])+1}),flush=True)

if __name__=='__main__':
    {'prepare':prepare,'visuals':visuals,'render':render,'package':package,'verify':verify,'sample':sample,'deliver':deliver}[sys.argv[1]]()
