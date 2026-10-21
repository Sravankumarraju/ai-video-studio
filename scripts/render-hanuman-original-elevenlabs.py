"""Original Telugu song: ElevenLabs audio, illustrated video and acoustic captions."""
from pathlib import Path
import importlib.util,json,re,math,subprocess,shutil
spec=importlib.util.spec_from_file_location('v4','scripts/render-anjaneya-reference-v4.py')
v4=importlib.util.module_from_spec(spec);spec.loader.exec_module(v4)
ROOT=v4.ROOT;OUT=ROOT/'elevenlabs-original-song';FPS=24
OPENING=6.
PLAN=json.loads((OUT/'plan.json').read_text(encoding='utf-8'))
def run(args):subprocess.run(args,check=True)
def duration(p):return v4.duration(p)
def read(name):return json.loads((OUT/f'{name}.json').read_text(encoding='utf-8'))
def save(name,data):(OUT/f'{name}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
def words_from_alignment(a):
    if 'characters' in a and a['characters'] and isinstance(a['characters'][0],dict):
        cs=a['characters'];t=''.join(c['text'] for c in cs)
        return [dict(text=m.group(),start=min(c['start'] for c in cs[m.start():m.end()]),end=max(c['end'] for c in cs[m.start():m.end()])) for m in re.finditer(r'\S+',t)]
    t=''.join(a['characters'])
    return [dict(text=m.group(),start=min(a['character_start_times_seconds'][m.start():m.end()]),end=max(a['character_end_times_seconds'][m.start():m.end()])) for m in re.finditer(r'\S+',t)]

def audio():
    song=OUT/'song-normalized.wav';closing=OUT/'closing-normalized.wav'
    for source,target in [(OUT/'song.mp3',song),(OUT/'closing.mp3',closing)]:
        if not target.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(source),'-af','loudnorm=I=-17:TP=-2:LRA=7,aresample=48000','-ar','48000','-ac','2','-c:a','pcm_s16le',str(target)])
    prayer=duration(song);seconds=6+prayer+duration(closing)
    mix=OUT/'full-mix.wav'
    if not mix.exists():
        graph=('[0:a]aresample=48000,aformat=channel_layouts=stereo[a];[1:a]anull[b];[2:a]anull[c];[a][b][c]concat=n=3:v=0:a=1[lead];'
            f'[3:a]loudnorm=I=-32:TP=-4:LRA=6,aresample=48000,aformat=channel_layouts=stereo,atrim=duration={seconds},'
            f"volume='if(between(t,6,{6+prayer}),0,1)':eval=frame[bed];"
            '[lead][bed]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.891251:level=false:latency=true[out]')
        run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT/'reference-v4/opening-voice-clocked.wav'),'-i',str(song),'-i',str(closing),
            '-i',str(ROOT/'instrumental-v2.mp3'),'-filter_complex',graph,'-map','[out]','-ar','48000','-ac','2','-c:a','pcm_s16le',str(mix)])
    return prayer,seconds,mix

def captions(prayer,seconds):
    words=words_from_alignment(read('align'))
    assert [w['text'] for w in words]==PLAN['text'].split()
    collapsed=[w for w in words if w['end']-w['start']<.07]
    save('word-timings',{'words':words,'shortHighlights':collapsed,'exactLyricsPerformanceVerified':False})
    close=read('closing');cw=words_from_alignment(close['alignment'])
    folder=OUT/'closing-captions';folder.mkdir(exist_ok=True)
    (folder/'lyrics-supplied.txt').write_text(close['text'],encoding='utf-8')
    old=v4.base.ROOT;v4.base.ROOT=folder;v4.base.captions(cw,duration(OUT/'closing-normalized.wav'));v4.base.ROOT=old
    shutil.copyfile(folder/'recitation-highlight.ass',OUT/'closing.ass')
    (OUT/'lyrics-supplied.txt').write_text(PLAN['text'],encoding='utf-8')
    v4.OUT=OUT;v4.ROOT=OUT;v4.captions(words,prayer,seconds)
    path=OUT/'full-captions.ass';s=path.read_text(encoding='utf-8')
    s=s.replace('శ్రీ ఆంజనేయ\\Nదండకం','నీ తోడులో\\Nవెలుగు').replace('శ్రీ ఆంజనేయ దండకం','హనుమంతుని భక్తిగీతం')
    path.write_text(s,encoding='utf-8')
    # Deliver a portable subtitle track with welcome, song and closing.
    cues=[(0,OPENING,'డివైన్ విజ్డమ్ తెలుగు\nఛానల్‌కు స్వాగతం')]
    for page in read('recitation-caption-layout')['pages']:
        cues.append((OPENING+page['start'],OPENING+page['end'],'\n'.join(' '.join(w['text'] for w in line) for line in page['lines'])))
    for page in json.loads((folder/'recitation-caption-layout.json').read_text(encoding='utf-8'))['pages']:
        cues.append((OPENING+prayer+page['start'],OPENING+prayer+page['end'],'\n'.join(' '.join(w['text'] for w in line) for line in page['lines'])))
    (OUT/'captions-te.srt').write_text('\n\n'.join(f'{i+1}\n{v4.base.bookends.srtstamp(a)} --> {v4.base.bookends.srtstamp(b)}\n{t}' for i,(a,b,t) in enumerate(cues))+'\n',encoding='utf-8')
    return words

def background(words,prayer,seconds):
    art=ROOT/'reference-v4/artwork'
    names=['blessing','heart','protector','panchamukha','cosmic','mountain','lanka','coronation','sunset']
    assert all((art/f'{name}.png').exists() for name in names)
    scenes=[dict(start=0,end=OPENING,image='sunset')]
    positions=[];i=0
    for block in PLAN['verses']:positions.append(words[i]['start']);i+=len(block.split())
    assert i==len(words)
    themes=[['blessing','sunset','heart','protector'],['heart','blessing','panchamukha','cosmic'],
        ['protector','mountain','heart','blessing'],['heart','panchamukha','cosmic','sunset'],
        ['blessing','coronation','protector','heart'],['sunset','cosmic','mountain','blessing']]
    for i,a in enumerate(positions):
        a=0 if i==0 else a;b=positions[i+1] if i+1<len(positions) else prayer
        count=max(1,math.ceil((b-a)/8))
        for j in range(count):
            scenes.append(dict(start=round((OPENING+a+(b-a)*j/count)*FPS)/FPS,end=round((OPENING+a+(b-a)*(j+1)/count)*FPS)/FPS,image=themes[i][j%4]))
    scenes.append(dict(start=round((OPENING+prayer)*FPS)/FPS,end=math.ceil(seconds*FPS)/FPS,image='cosmic'))
    save('timeline',{'scenes':scenes,'images':len(names)})
    groups=[];fade=.5
    for k in range(0,len(scenes),5):
        group=scenes[k:k+5];target=OUT/f'background-group-{k//5:02}.mp4'
        if not target.exists():
            args=['ffmpeg','-v','error','-nostdin','-n','-filter_complex_threads','2'];filters=[];elapsed=0
            for j,scene in enumerate(group):
                hold=scene['end']-scene['start'];length=hold+(fade if j<len(group)-1 else 0)
                args+=['-loop','1','-framerate',str(FPS),'-t',str(length),'-i',str(art/f'{scene["image"]}.png')]
                filters.append(f"[{j}:v]zoompan=z='1.01+min(.02,.000035*on)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1920x1080:fps={FPS},setsar=1,format=yuv420p[v{j}]")
                if j:
                    prev='v0' if j==1 else f'x{j-1}'
                    filters.append(f'[{prev}][v{j}]xfade=transition=fade:duration={fade}:offset={elapsed}[x{j}]')
                elapsed+=hold
            last=f'x{len(group)-1}' if len(group)>1 else 'v0';filters.append(f'[{last}]format=nv12[out]')
            args+=['-filter_complex',';'.join(filters),'-map','[out]','-t',str(elapsed),'-an','-c:v','h264_qsv','-preset','medium','-global_quality','20','-movflags','+faststart',str(target)]
            run(args)
        groups.append(target);print(json.dumps({'group':k//5+1,'total':math.ceil(len(scenes)/5)}),flush=True)
    manifest=OUT/'background.ffconcat';manifest.write_text('ffconcat version 1.0\n'+''.join(f"file '{p.name}'\n" for p in groups),encoding='utf-8')
    target=OUT/'background.mp4'
    if not target.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(manifest),'-c','copy','-movflags','+faststart',str(target)])
    return target

def main():
    prayer,seconds,mix=audio();words=captions(prayer,seconds);bg=background(words,prayer,seconds)
    target=OUT/'Hanuman-Original-Telugu-Song-ElevenLabs.mp4'
    if not target.exists():
        graph=('drawbox=x=0:y=0:w=iw:h=94:color=black@.40:t=fill,drawbox=x=0:y=785:w=iw:h=295:color=0x050C20@.83:t=fill,'
            f"ass=filename='{OUT.as_posix()}/full-captions.ass':fontsdir='public/fonts':shaping=complex[base];"
            '[2:v]scale=100:100[logo];[base][logo]overlay=25:0:format=auto,format=nv12[v]')
        run(['ffmpeg','-v','error','-nostdin','-n','-filter_complex_threads','2','-i',str(bg),'-i',str(mix),'-i',v4.base.BRAND['logo'],
            '-filter_complex',graph,'-map','[v]','-map','1:a:0','-t',str(seconds),'-c:v','h264_qsv','-preset','medium','-global_quality','20',
            '-c:a','aac','-b:a','192k','-movflags','+faststart','-progress',str(OUT/'render-progress.txt'),str(target)])
    mp3=OUT/'Hanuman-Original-Telugu-Song-ElevenLabs.mp3'
    if not mp3.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(mix),'-c:a','libmp3lame','-b:a','192k',str(mp3)])
    run(['ffmpeg','-v','error','-nostdin','-i',str(target),'-f','null','-'])
    info=v4.base.bookends.probe(target);v=next(x for x in info['streams'] if x['codec_type']=='video');a=next(x for x in info['streams'] if x['codec_type']=='audio')
    assert (v['width'],v['height'])==(1920,1080)
    assert abs(float(info['format']['duration'])-seconds)<.15
    assert abs(float(v['duration'])-float(a['duration']))<.15
    for name,t in [('opening',2),('song',15),('middle',100),('closing',seconds-4)]:
        path=OUT/f'review-{name}.png'
        if not path.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(t),'-i',str(target),'-frames:v','1',str(path)])
    save('verification',dict(file=str(target.resolve()),audio=str(mp3.resolve()),seconds=float(info['format']['duration']),
        songSeconds=prayer,fullDecodePassed=True,videoAudioDurationMatched=True,allAudioGeneratedWith='ElevenLabs',
        newOriginalLyrics=True,suppliedDandakamReplaced=True,wordsMapped=len(words),exactLyricPerformanceVerified=False,
        listeningReviewPending=True,knownTranscriptionDifferences=['First stanza: ASR combines or omits the written words నా అడుగు; human listening review needed.'],
        copiedRecordingUsed=False,visuals='Nine existing original project illustrations',commercialLicense='Creator plan, subject to ElevenLabs Music Terms',
        copyrightClaimImmunityGuaranteed=False,published=False))
    print(json.dumps(read('verification')),flush=True)
if __name__=='__main__':main()
