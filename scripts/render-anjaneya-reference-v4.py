"""Reference-informed original chant-directed vocal and illustrated edition."""
from pathlib import Path
import importlib.util,json,math,re,subprocess,zipfile,wave

spec=importlib.util.spec_from_file_location('previous','scripts/render-anjaneya-recitation.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
ROOT=base.ROOT
OUT=ROOT/'reference-v4'
PLAN=json.loads((OUT/'plan.json').read_text(encoding='utf-8'))
FPS=24
FADE=.5
OPENING=6.0

def run(args):subprocess.run(args,check=True)
def read(name):return json.loads((OUT/f'{name}.json').read_text(encoding='utf-8'))
def save(name,value):(OUT/f'{name}.json').write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')
def duration(path):return base.duration(path)

def audio():
    pieces=[];words=[];offset=0
    for batch in PLAN['batches']:
        stem=batch['stem'];assert not read(stem+'-checks')['collapsedWords']
        path=OUT/f'{stem}-normalized.wav'
        if not path.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(OUT/f'{stem}.mp3'),'-af','loudnorm=I=-17:TP=-2:LRA=7,aresample=48000,apad=pad_dur=0.15','-ar','48000','-ac','2','-c:a','pcm_s16le',str(path)])
        a=read(stem+'-alignment');text=''.join(a['characters'])
        assert text.split()==batch['text'].split()
        for match in re.finditer(r'\S+',text):
            start=min(a['character_start_times_seconds'][match.start():match.end()])+offset
            end=max(a['character_end_times_seconds'][match.start():match.end()])+offset
            assert end-start>=.02
            words.append({'text':match.group(),'start':start,'end':end})
        offset+=duration(path);pieces.append(path)
    source=(ROOT/'lyrics-supplied.txt').read_text(encoding='utf-8').strip()
    assert [w['text'] for w in words]==source.split()
    assert len(words)==266
    manifest=OUT/'vocal.ffconcat'
    manifest.write_text('ffconcat version 1.0\n'+''.join(f"file '{p.name}'\n" for p in pieces),encoding='utf-8')
    prayer=OUT/'full-new-vocal.wav'
    if not prayer.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(manifest),'-c','copy',str(prayer)])
    # Retain a concise audible channel welcome over the six-second sunset card.
    welcome_words=base.read('welcome-caption-layout')['words']
    start=next(w['start'] for w in welcome_words if w['text'].startswith('డివైన్'))
    end=next(w['end'] for w in welcome_words if w['text'].startswith('స్వాగతం'))
    assert end-start<OPENING-.5
    opening=OUT/'opening-voice-clocked.wav'
    if not opening.exists():
        pcm=subprocess.check_output(['ffmpeg','-v','error','-nostdin','-i',str(ROOT/'welcome-1080p.mp4'),'-vn','-af',f'atrim=start={start}:end={end}',
            '-ar','48000','-ac','2','-c:a','pcm_s16le','-f','s16le','-'])
        payload=bytes(round(.4*48000)*4)+pcm
        target_bytes=round(OPENING*48000)*4
        assert len(payload)<target_bytes
        payload+=bytes(target_bytes-len(payload))
        with wave.open(str(opening),'wb') as wav:
            wav.setnchannels(2);wav.setsampwidth(2);wav.setframerate(48000);wav.writeframes(payload)
    assert abs(duration(opening)-OPENING)<.01
    closing=OUT/'closing-voice.wav'
    if not closing.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT/'closing-1080p.mp4'),'-vn','-ar','48000','-ac','2','-c:a','pcm_s16le',str(closing)])
    full_list=OUT/'full-voice.ffconcat'
    full_list.write_text("ffconcat version 1.0\nfile 'opening-voice-clocked.wav'\nfile 'full-new-vocal.wav'\nfile 'closing-voice.wav'\n",encoding='utf-8')
    full_voice=OUT/'full-voice-v4-timed.wav'
    if not full_voice.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(full_list),'-c','copy',str(full_voice)])
    seconds=duration(full_voice);prayer_seconds=duration(prayer)
    mixed=OUT/'full-mix.wav'
    if not mixed.exists():
        graph=(f'[0:a]asplit=2[lead][side];[1:a]loudnorm=I=-26:TP=-3:LRA=7,aresample=48000,'
            f'aformat=channel_layouts=stereo,volume=0.8,atrim=duration={seconds},afade=t=in:d=0.7,'
            f'afade=t=out:st={seconds-2}:d=2[bed];'
            '[bed][side]sidechaincompress=threshold=0.05:ratio=4:attack=15:release=300[ducked];'
            '[lead][ducked]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.891251:level=false:latency=true[a]')
        run(['ffmpeg','-v','error','-nostdin','-n','-i',str(full_voice),'-stream_loop','-1','-i',str(ROOT/'instrumental-v2.mp3'),'-filter_complex',graph,'-map','[a]','-t',str(seconds),'-ar','48000','-ac','2','-c:a','pcm_s16le',str(mixed)])
    save('words',{'words':words,'prayerSeconds':prayer_seconds,'seconds':seconds,'openingSeconds':OPENING,'closingStart':OPENING+prayer_seconds})
    return words,prayer_seconds,seconds,mixed

def captions(words,prayer_seconds,seconds):
    # Reuse the verified Telugu shaping and wrapping, with fresh vocal timings.
    (OUT/'lyrics-supplied.txt').write_text((ROOT/'lyrics-supplied.txt').read_text(encoding='utf-8'),encoding='utf-8')
    old_root=base.ROOT;base.ROOT=OUT
    base.captions(words,prayer_seconds)
    base.ROOT=old_root
    source=(OUT/'recitation-highlight.ass').read_text(encoding='utf-8')
    header=source.split('[Events]')[0]+'[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n'
    extra='''Style: Large,Noto Sans Telugu,96,&H004AD5FF,&H004AD5FF,&H00101010,&H90000000,-1,0,0,0,100,100,0,0,1,3,0,5,80,80,70,1
Style: Welcome,Noto Sans Telugu,66,&H00FFFFFF,&H00FFFFFF,&H00101010,&H90000000,0,0,0,0,100,100,0,0,1,3,0,5,80,80,70,1
'''
    header=header.replace('[Events]',extra+'[Events]')
    events=[]
    def event(a,b,style,text):events.append(f'Dialogue: 0,{base.bookends.stamp(a)},{base.bookends.stamp(b)},{style},,0,0,0,,{text}')
    event(0,seconds,'Brand',r'{\pos(150,47)}Divine Wisdom Telugu')
    event(0,OPENING,'Large',r'{\pos(1320,380)\fad(350,350)}శ్రీ ఆంజనేయ\Nదండకం')
    event(.3,OPENING,'Welcome',r'{\pos(960,930)\fs70\fad(350,350)}డివైన్ విజ్డమ్ తెలుగు\Nఛానల్‌కు స్వాగతం')
    for line in source.splitlines():
        if line.startswith('Dialogue:') and ',Caption,' in line:
            parts=line.split(',',9)
            def seconds_from_stamp(t):
                h,m,s=t.split(':');return int(h)*3600+int(m)*60+float(s)
            parts[1]=base.bookends.stamp(seconds_from_stamp(parts[1])+OPENING)
            parts[2]=base.bookends.stamp(seconds_from_stamp(parts[2])+OPENING)
            events.append(','.join(parts))
    closing_start=OPENING+prayer_seconds
    event(closing_start,seconds,'Large',r'{\pos(1420,380)}జై హనుమాన్')
    event(closing_start,seconds,'Welcome',r'{\pos(1420,570)}సబ్‌స్క్రైబ్ · లైక్\Nషేర్ · కామెంట్')
    closing=(ROOT/'closing.ass').read_text(encoding='utf-8')
    for line in closing.splitlines():
        if line.startswith('Dialogue:') and ',Caption,' in line:
            parts=line.split(',',9)
            def parse(t):
                h,m,s=t.split(':');return int(h)*3600+int(m)*60+float(s)
            parts[1]=base.bookends.stamp(parse(parts[1])+closing_start)
            parts[2]=base.bookends.stamp(parse(parts[2])+closing_start)
            parts[9]=r'{\fs88}'+parts[9]
            events.append(','.join(parts))
    (OUT/'full-captions.ass').write_text(header+'\n'.join(events)+'\n',encoding='utf-8')

def visuals(words,prayer_seconds,seconds):
    sources={
        'sunset':OUT/'hanuman-sunset.png','panchamukha':OUT/'hanuman-panchamukha.png','coronation':OUT/'rama-sita-coronation.png',
        'blessing':ROOT/'hanuman-blessing-original.png','mountain':ROOT/'hanuman-sanjeevani-original.png',
        'lanka':ROOT/'hanuman-lanka-leap-v2.png','heart':ROOT/'hanuman-rama-sita-heart-v2.png',
        'protector':ROOT/'hanuman-temple-protector-v2.png','cosmic':ROOT/'hanuman-cosmic-meditation-v2.png'}
    art=OUT/'artwork';art.mkdir(exist_ok=True)
    for name,path in sources.items():
        target=art/f'{name}.png'
        if not target.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(path),'-vf','scale=1920:1080:flags=lanczos,setsar=1','-frames:v','1',str(target)])
    primary=['blessing','panchamukha','protector','heart','lanka','lanka','mountain','protector','coronation','blessing','panchamukha','heart','cosmic','panchamukha','protector','blessing','sunset']
    alternate=['panchamukha','heart','blessing','coronation','protector','mountain','blessing','lanka','heart','panchamukha','cosmic','blessing','panchamukha','protector','cosmic','heart','blessing']
    blocks=(ROOT/'lyrics-supplied.txt').read_text(encoding='utf-8').strip().split('\n\n')
    positions=[];index=0
    for block in blocks:positions.append(words[index]['start']);index+=len(block.split())
    assert index==266
    scenes=[{'start':0,'end':OPENING,'image':'sunset'}]
    for i,(a,name) in enumerate(zip(positions,primary)):
        a=0 if i==0 else a
        b=positions[i+1] if i+1<len(positions) else prayer_seconds
        count=max(1,math.ceil((b-a)/8))
        for j in range(count):
            start=round((OPENING+a+(b-a)*j/count)*FPS)/FPS
            end=round((OPENING+a+(b-a)*(j+1)/count)*FPS)/FPS
            scenes.append({'start':start,'end':end,'image':name if j%2==0 else alternate[i]})
    scenes.append({'start':round((OPENING+prayer_seconds)*FPS)/FPS,'end':math.ceil(seconds*FPS)/FPS,'image':'cosmic'})
    save('timeline',{'scenes':scenes,'illustrations':9,'crossDissolveSeconds':FADE,'captionFontSize':96})
    # Bound each cross-dissolve graph to five inputs to keep memory predictable.
    groups=[]
    for k in range(0,len(scenes),5):
        group=scenes[k:k+5];target=OUT/f'background-group-{k//5:02}.mp4'
        if not target.exists():
            args=['ffmpeg','-v','error','-nostdin','-n','-filter_complex_threads','2']
            filters=[];elapsed=0
            for j,scene in enumerate(group):
                hold=scene['end']-scene['start'];length=hold+(FADE if j<len(group)-1 else 0)
                args+=['-loop','1','-framerate',str(FPS),'-t',str(length),'-i',str(art/f'{scene["image"]}.png')]
                filters.append(f"[{j}:v]zoompan=z='1.01+min(.02,.000035*on)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1920x1080:fps={FPS},setsar=1,format=yuv420p[v{j}]")
                if j:
                    prev='v0' if j==1 else f'x{j-1}'
                    filters.append(f'[{prev}][v{j}]xfade=transition=fade:duration={FADE}:offset={elapsed}[x{j}]')
                elapsed+=hold
            last=f'x{len(group)-1}' if len(group)>1 else 'v0'
            filters.append(f'[{last}]format=nv12[out]')
            args+=['-filter_complex',';'.join(filters),'-map','[out]','-t',str(elapsed),'-an','-c:v','h264_qsv','-preset','medium','-global_quality','20','-profile:v','high','-level:v','4.0','-movflags','+faststart',str(target)]
            run(args)
        groups.append(target)
        print(json.dumps({'backgroundGroup':k//5+1,'total':math.ceil(len(scenes)/5),'scenes':len(group)}),flush=True)
    manifest=OUT/'background.ffconcat'
    manifest.write_text('ffconcat version 1.0\n'+''.join(f"file '{p.name}'\n" for p in groups),encoding='utf-8')
    result=OUT/'background.mp4'
    if not result.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(manifest),'-c','copy','-movflags','+faststart',str(result)])
    archive=ROOT/'Hanuman-Illustrations-9-Images.zip'
    if not archive.exists():
        with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
            for name,path in sources.items():z.write(path,arcname=f'hanuman-{name}.png')
    return result

def main():
    words,prayer_seconds,seconds,mixed=audio();captions(words,prayer_seconds,seconds)
    background=visuals(words,prayer_seconds,seconds)
    final=ROOT/'Sri-Anjaneya-Dandakam-Reference-Inspired-V4.mp4'
    if not final.exists():
        graph=('[0:v]drawbox=x=0:y=0:w=iw:h=94:color=black@.40:t=fill,'
            'drawbox=x=0:y=785:w=iw:h=295:color=0x050C20@.83:t=fill,'
            f"ass=filename='{OUT.as_posix()}/full-captions.ass':fontsdir='public/fonts':shaping=complex[base];"
            '[2:v]scale=100:100[logo];[base][logo]overlay=25:0:format=auto,format=nv12[v]')
        run(['ffmpeg','-v','error','-nostdin','-n','-filter_complex_threads','2','-i',str(background),'-i',str(mixed),'-i',base.BRAND['logo'],
            '-filter_complex',graph,'-map','[v]','-map','1:a:0','-t',str(seconds),'-c:v','h264_qsv','-preset','medium','-global_quality','20',
            '-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart','-progress',str(OUT/'progress.txt'),str(final)])
    mp3=ROOT/'Sri-Anjaneya-Dandakam-New-Vocal-V4.mp3'
    if not mp3.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(final),'-vn','-c:a','libmp3lame','-b:a','192k',str(mp3)])
    run(['ffmpeg','-v','error','-nostdin','-i',str(final),'-f','null','-'])
    info=base.bookends.probe(final);v=next(x for x in info['streams'] if x['codec_type']=='video');a=next(x for x in info['streams'] if x['codec_type']=='audio')
    assert (v['width'],v['height'])==(1920,1080)
    assert abs(float(info['format']['duration'])-seconds)<.15
    assert abs(float(v['duration'])-float(a['duration']))<.15
    pages=read('recitation-caption-layout')['pages']
    assert sum(len(p['words']) for p in pages)==266
    for label,t in [('opening',2.5),('chant',OPENING+(words[2]['start']+words[2]['end'])/2),('middle',seconds/2),('closing',seconds-7)]:
        frame=OUT/f'review-{label}.png'
        if not frame.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(t),'-i',str(final),'-frames:v','1',str(frame)])
    save('verification',{'file':str(final.resolve()),'audio':str(mp3.resolve()),'seconds':float(info['format']['duration']),
        'newVocalPerformance':True,'vocalDirection':PLAN['vocalDirection'],'referenceUrl':PLAN['referenceUrl'],
        'styleMatchListeningReviewPending':True,'pronunciationListeningReviewPending':True,'fullDecodePassed':True,
        'all266WordsMapped':True,'captionFontSize':96,'images':9,'newImagesThisRevision':3,'crossDissolves':True,
        'openingSeconds':OPENING,'sunsetOpening':True,'blueCardsRemoved':True,'published':False})
    print(json.dumps(read('verification')),flush=True)

if __name__=='__main__':main()
