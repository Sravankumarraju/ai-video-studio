"""Cinematic illustration edition with original instrumental under spoken prayer."""
from pathlib import Path
import importlib.util,json,math,subprocess,zipfile

spec=importlib.util.spec_from_file_location('recitation','scripts/render-anjaneya-recitation.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
ROOT=base.ROOT
OUT=ROOT/'cinematic-v2'
OUT.mkdir(exist_ok=True)
FPS=24
WORDS=base.read('recitation-words')['words']
SECONDS=base.read('recitation-words')['seconds']
SOURCES={
    'blessing':ROOT/'hanuman-blessing-original.png',
    'mountain':ROOT/'hanuman-sanjeevani-original.png',
    'lanka':ROOT/'hanuman-lanka-leap-v2.png',
    'heart':ROOT/'hanuman-rama-sita-heart-v2.png',
    'protector':ROOT/'hanuman-temple-protector-v2.png',
    'cosmic':ROOT/'hanuman-cosmic-meditation-v2.png',
}

def run(args):subprocess.run(args,check=True)
def save(name,value):(OUT/f'{name}.json').write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')

def prepare():
    artwork=OUT/'artwork';artwork.mkdir(exist_ok=True)
    for name,path in SOURCES.items():
        target=artwork/f'{name}.png'
        if not target.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(path),'-vf','scale=1920:1080:flags=lanczos,setsar=1','-frames:v','1',str(target)])
    blocks=(ROOT/'lyrics-supplied.txt').read_text(encoding='utf-8').strip().split('\n\n')
    names=['blessing','heart','protector','heart','lanka','lanka','mountain','protector','heart','blessing','cosmic','heart','cosmic','protector','protector','blessing','cosmic']
    cuts=[];i=0
    for block,name in zip(blocks,names):
        cuts.append((0 if not cuts else WORDS[i]['start'],name));i+=len(block.split())
    assert i==266
    frames=math.ceil(SECONDS*FPS)
    timeline=[];manifest=['ffconcat version 1.0']
    for i,(start,name) in enumerate(cuts):
        a=round(start*FPS)/FPS
        b=round(cuts[i+1][0]*FPS)/FPS if i+1<len(cuts) else frames/FPS
        assert b>a
        manifest += [f"file 'artwork/{name}.png'",'option framerate 24',f'duration {b-a:.9f}']
        timeline.append({'start':a,'end':b,'image':name})
    manifest += [f"file 'artwork/{cuts[-1][1]}.png'",'option framerate 24']
    (OUT/'artwork.ffconcat').write_text('\n'.join(manifest)+'\n',encoding='utf-8')
    save('plan',{'channel':'Divine Wisdom Telugu','seconds':SECONDS,'timeline':timeline,'illustrations':{k:str(v) for k,v in SOURCES.items()},
        'newIllustrationsThisRevision':4,'totalNewIllustrations':6,'spokenRecitationPreserved':True,'newSungPerformance':False,
        'music':'Original instrumental: harmonium, tanpura, pakhawaj, tabla, restrained dhol and cinematic strings, 92 BPM',
        'speech':'Same saved male narration voice as the earlier Hanuman Chalisa; original recitation and captions retained',
        'mix':'Backing normalized to -30 LUFS, then lowered 2 dB and ducked under speech with sidechain compression',
        'camera':'Gentle centered 1.01-1.03 zoom, text composited afterward and remains stationary',
        'captionFontSize':96,'words':266,'published':False})
    archive=ROOT/'Hanuman-Illustrations-6-Images.zip'
    if not archive.exists():
        with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
            for name,path in SOURCES.items():z.write(path,arcname=f'hanuman-{name}.png')

def mix():
    target=OUT/'recitation-with-music.wav'
    if not target.exists():
        graph=(f'[0:a]aresample=48000,aformat=channel_layouts=stereo,asplit=2[lead][side];'
            f'[1:a]loudnorm=I=-30:TP=-5:LRA=7,aresample=48000,aformat=channel_layouts=stereo,volume=0.8,'
            f'atrim=duration={SECONDS},afade=t=in:d=1.4,afade=t=out:st={SECONDS-2.4}:d=2.4[bed];'
            '[bed][side]sidechaincompress=threshold=0.025:ratio=6:attack=15:release=450[ducked];'
            '[lead][ducked]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.891251:level=false:latency=true[mix]')
        run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT/'Anjaneya-Dandakam-Spoken-Recitation.wav'),
            '-i',str(ROOT/'instrumental-v2.mp3'),'-filter_complex',graph,'-map','[mix]','-t',str(SECONDS),
            '-ar','48000','-ac','2','-c:a','pcm_s16le',str(target)])
    assert abs(base.duration(target)-SECONDS)<.05
    return target

def motion_background():
    # Encode each still on a regular frame clock before compositing. Applying
    # zoompan directly after sparse image-concat timestamps can buffer frames.
    timeline=json.loads((OUT/'plan.json').read_text(encoding='utf-8'))['timeline']
    merged=[]
    for item in timeline:
        if merged and merged[-1]['image']==item['image']:merged[-1]['end']=item['end']
        else:merged.append(dict(item))
    clips=[]
    for i,scene in enumerate(merged):
        path=OUT/f'motion-{i:02}.mp4'
        frames=round((scene['end']-scene['start'])*FPS)
        if not path.exists():
            run(['ffmpeg','-v','error','-nostdin','-n','-filter_threads','2','-loop','1','-framerate',str(FPS),
                '-i',str(OUT/'artwork'/f'{scene["image"]}.png'),
                '-vf',f"zoompan=z='1.01+min(0.02,0.000025*on)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1920x1080:fps={FPS},format=nv12",
                '-frames:v',str(frames),'-an','-c:v','h264_qsv','-preset','medium','-global_quality','20',
                '-profile:v','high','-level:v','4.0','-movflags','+faststart',str(path)])
        assert abs(base.duration(path)-frames/FPS)<.06
        clips.append(path)
        print(json.dumps({'motionScene':i+1,'total':len(merged),'image':scene['image']}),flush=True)
    manifest=OUT/'motion.ffconcat'
    manifest.write_text('ffconcat version 1.0\n'+''.join(f"file '{p.name}'\n" for p in clips),encoding='utf-8')
    result=OUT/'motion-background.mp4'
    if not result.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(manifest),'-c','copy','-movflags','+faststart',str(result)])
    return result

def main():
    prepare();audio=mix();background=motion_background()
    main_video=OUT/'Anjaneya-Dandakam-Cinematic-Main-V2-Stable.mp4'
    if not main_video.exists():
        graph=(f'[0:v]fps={FPS},'
            'setsar=1,drawbox=x=0:y=0:w=iw:h=94:color=black@0.45:t=fill,'
            'drawbox=x=0:y=785:w=iw:h=295:color=0x050C20@0.94:t=fill,'
            f"ass=filename='{ROOT.as_posix()}/recitation-highlight.ass':fontsdir='public/fonts':shaping=complex[base];"
            '[2:v]scale=100:100[logo];[base][logo]overlay=25:0:format=auto,format=nv12[v]')
        run(['ffmpeg','-v','error','-nostdin','-n','-filter_complex_threads','2','-i',str(background),
            '-i',str(audio),'-i',base.BRAND['logo'],'-filter_complex',graph,'-map','[v]','-map','1:a:0','-t',str(SECONDS),
            '-c:v','h264_qsv','-preset','medium','-global_quality','20','-profile:v','high','-level:v','4.0',
            '-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart',
            '-progress',str(OUT/'progress.txt'),str(main_video)])
    manifest=OUT/'final.ffconcat'
    manifest.write_text("ffconcat version 1.0\nfile '../welcome-1080p.mp4'\nfile 'Anjaneya-Dandakam-Cinematic-Main-V2-Stable.mp4'\nfile '../closing-1080p.mp4'\n",encoding='utf-8')
    final=ROOT/'Sri-Anjaneya-Dandakam-Cinematic-Music-V2.mp4'
    if not final.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(manifest),
        '-c:v','copy','-af','aresample=async=1:first_pts=0','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart',str(final)])
    mp3=ROOT/'Sri-Anjaneya-Dandakam-Devotional-Music-V2.mp3'
    if not mp3.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(final),'-vn','-af','asetpts=N/SR/TB','-c:a','libmp3lame','-b:a','192k',str(mp3)])
    run(['ffmpeg','-v','error','-nostdin','-i',str(final),'-f','null','-'])
    info=base.bookends.probe(final)
    v=next(s for s in info['streams'] if s['codec_type']=='video')
    a=next(s for s in info['streams'] if s['codec_type']=='audio')
    expected=SECONDS+base.duration(ROOT/'welcome-1080p.mp4')+base.duration(ROOT/'closing-1080p.mp4')
    assert (v['width'],v['height'])==(1920,1080)
    assert abs(float(info['format']['duration'])-expected)<.2
    assert abs(float(v['duration'])-float(a['duration']))<.2
    offset=base.duration(ROOT/'welcome-1080p.mp4')
    timeline=json.loads((OUT/'plan.json').read_text(encoding='utf-8'))['timeline']
    for label,scene in [('heart',timeline[1]),('lanka',timeline[4]),('mountain',timeline[6]),('protector',timeline[13]),('cosmic',timeline[16])]:
        candidates=[w for w in WORDS if scene['start']+.5<w['start']<scene['end']-.5]
        word=candidates[min(1,len(candidates)-1)] if candidates else WORDS[0]
        t=offset+(word['start']+word['end'])/2
        frame=OUT/f'review-{label}.png'
        if not frame.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(t),'-i',str(final),'-frames:v','1',str(frame)])
    save('verification',{'file':str(final.resolve()),'audio':str(mp3.resolve()),'seconds':float(info['format']['duration']),
        'fullDecodePassed':True,'resolution':'1920x1080','newIllustrationsThisRevision':4,'illustrationsTotal':6,
        'instrumentalAdded':True,'vocalDucking':True,'spokenRecitationPreserved':True,'newSingingVoiceGenerated':False,
        'captionFontSize':96,'highlightedWords':266,'voiceId':base.PLAN['voiceId'],'welcomeAndClosingPreserved':True,
        'pronunciationListeningReviewPending':True,'published':False})
    print((OUT/'verification.json').read_text(encoding='utf-8'),flush=True)

if __name__=='__main__':main()
