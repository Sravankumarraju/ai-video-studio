"""Remove only the padded welcome silence and shift all dependent production timing."""
from pathlib import Path
import importlib.util,json,math,re,shutil,subprocess,sys,zipfile,hashlib

spec=importlib.util.spec_from_file_location('base','scripts/render-anjaneya-courage.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
OLD=base.ROOT
ROOT=OLD/'no-gap-v2'
ROOT.mkdir(exist_ok=True)
SOURCE=base.OUT
OUT=ROOT/'Anjaneya-Adugulo-Dhairyama-No-Gap-V2-1080p.mp4'
KEEP,RESUME,REMOVED=3.25,6.0,2.75

def run(args):subprocess.run(args,check=True)
def read(name,root=ROOT):return json.loads((root/f'{name}.json').read_text(encoding='utf8'))
def save(name,data):(ROOT/f'{name}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
def shift(t):return t if t<=KEEP else max(KEEP,t-REMOVED)

def prepare():
    for name in ['song-original.m4a','source-probe.json','lyrics-supplied.txt','lyrics-performed-final.txt','youtube-title.txt','youtube-tags.txt','youtube-thumbnail.jpg','youtube-pinned-comment.txt']:
        shutil.copyfile(OLD/name,ROOT/name)
    (ROOT/'artwork').mkdir(exist_ok=True)
    for image in (OLD/'artwork').glob('*.jpg'):shutil.copyfile(image,ROOT/'artwork'/image.name)
    cues=read('captions',OLD)
    for c in cues:
        for key in ['start','end','displayEnd']:
            if key in c:c[key]=shift(c[key])
        for w in c['words']:w['start']=shift(w['start']);w['end']=shift(w['end'])
    assert all(a['end']<=b['start'] for a,b in zip(cues,cues[1:]))
    save('captions',cues)
    for ext in ['srt','vtt']:
        stamp=lambda t:base.stamp(t,True).replace(',', '.' if ext=='vtt' else ',')
        entries=[(('' if ext=='vtt' else f'{i+1}\n')+f'{stamp(c["start"])} --> {stamp(c["end"])}\n'+'\n'.join(c['lines'])) for i,c in enumerate(cues)]
        (ROOT/f'captions-te.{ext}').write_text(('WEBVTT\n\n' if ext=='vtt' else '')+'\n\n'.join(entries)+'\n',encoding='utf8')
    t=read('timeline',OLD);scenes=[]
    for s in t['scenes']:
        s.update(start=shift(s['start']),end=shift(s['end']))
        if s['end']<=s['start']:continue
        s['index']=len(scenes);s['frames']=round((s['end']-s['start'])*24);scenes.append(s)
    t.update(seconds=t['seconds']-REMOVED,openingSeconds=KEEP,scenes=scenes)
    save('timeline',t)
    old=read('publishing',OLD);labels={'Verse 1':'చరణం 1 · రామదూత హనుమా','Chorus':'పల్లవి','Verse 2':'చరణం 2 · ధైర్యం, సేవ','Bridge':'వినయం · భక్తి','Final chorus':'చివరి పల్లవి','Outro':'శ్రీరామ నామస్మరణ'}
    chapters=['00:00 స్వాగతం · అంజనేయా భక్తి గీతం'];seen=set()
    for c in cues:
        section=c.get('section')
        if section in labels and section not in seen:
            seen.add(section);n=int(c['start']);chapters.append(f'{n//60:02}:{n%60:02} {labels[section]}')
    n=int(KEEP+base.SONG);chapters.append(f'{n//60:02}:{n%60:02} ముగింపు · జై హనుమాన్')
    chapters='\n'.join(chapters)
    old['description']=old['description'].replace(old['chapters'],chapters);old['chapters']=chapters
    save('publishing',old)
    (ROOT/'youtube-description.txt').write_text(old['description'],encoding='utf8')
    (ROOT/'youtube-chapters.txt').write_text(chapters+'\n',encoding='utf8')
    save('gap-fix',{'removedIntervalSeconds':[KEEP,RESUME],'removedSeconds':REMOVED,'measuredOriginalSilenceSeconds':3.055,'expectedRemainingPauseSeconds':.305,'songChanged':False,'oldVersionPreserved':True})
    print(json.dumps({'phase':'prepared','seconds':t['seconds'],'removedSeconds':REMOVED}),flush=True)

def render():
    graph=f'[0:v]split=2[va][vb];[va]trim=end={KEEP},setpts=PTS-STARTPTS[v0];[vb]trim=start={RESUME},setpts=PTS-STARTPTS[v1];[0:a]asplit=2[aa][ab];[aa]atrim=end={KEEP},asetpts=PTS-STARTPTS[a0];[ab]atrim=start={RESUME},asetpts=PTS-STARTPTS[a1];[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]'
    run(['ffmpeg','-v','error','-nostdin','-n','-filter_complex_threads','2','-i',str(SOURCE),'-filter_complex',graph,'-map','[v]','-map','[a]','-t',str(base.TOTAL-REMOVED),'-c:v','h264_qsv','-preset','medium','-global_quality','18','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart','-progress',str(ROOT/'progress.txt'),str(OUT)])
    print(json.dumps({'phase':'rendered','file':str(OUT)}),flush=True)

def verify():
    base.ROOT=ROOT;base.OUT=OUT;base.OPENING=KEEP;base.TOTAL-=REMOVED
    base.verify()
    result=subprocess.run(['ffmpeg','-hide_banner','-nostdin','-i',str(OUT),'-t','7','-vn','-af','silencedetect=noise=-45dB:d=0.15','-f','null','-'],capture_output=True,text=True,check=True)
    durations=[float(x) for x in re.findall(r'silence_duration: ([0-9.]+)',result.stderr)]
    assert durations and max(durations)<.6,durations
    report=read('verification');report.update(openingSilenceDurationsSeconds=durations,removedWelcomePaddingSeconds=REMOVED)
    save('verification',report)
    run(['ffmpeg','-v','error','-nostdin','-n','-i',str(OUT),'-map','0:a:0','-c:a','copy',str(ROOT/'full-master-audio.m4a')])
    print(json.dumps({'phase':'gap verified','silences':durations}),flush=True)

def deliver():
    target=Path('output/anjaneya-courage-youtube-v2');target.mkdir(exist_ok=True)
    names=[OUT.name,'youtube-thumbnail.jpg','youtube-title.txt','youtube-description.txt','youtube-tags.txt','youtube-chapters.txt','youtube-pinned-comment.txt','captions-te.srt','captions-te.vtt','lyrics-supplied.txt','lyrics-performed-final.txt','publishing.json','story-studio-project.json','verification.json','gap-fix.json','video-review-contact.jpg']
    for name in names:shutil.copyfile(ROOT/name,target/name)
    manifest={'version':'v2','removedWelcomePaddingSeconds':REMOVED,'seconds':read('verification')['seconds'],'files':[{'name':n,'sha256':hashlib.sha256((target/n).read_bytes()).hexdigest()} for n in names],'uploaded':False}
    (target/'delivery-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
    archive=Path('output/anjaneya-courage-youtube-v2-package.zip')
    with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=3) as z:
        for f in target.iterdir():z.write(f,arcname=f.name)
    with zipfile.ZipFile(archive) as z:assert z.testzip() is None
    print(json.dumps({'video':str((target/OUT.name).resolve()),'package':str(archive.resolve())}),flush=True)

if __name__=='__main__':{'prepare':prepare,'render':render,'verify':verify,'deliver':deliver}[sys.argv[1]]()
