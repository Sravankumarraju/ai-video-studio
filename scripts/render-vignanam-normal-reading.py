"""Plain spoken Dandakam, with measured removal of excess silent gaps."""
from pathlib import Path
import importlib.util,json,re,subprocess,shutil,wave,math,sys
spec=importlib.util.spec_from_file_location('visual','scripts/render-hanuman-original-elevenlabs.py')
visual=importlib.util.module_from_spec(spec);spec.loader.exec_module(visual)
ROOT=visual.ROOT;OUT=ROOT/(sys.argv[1] if len(sys.argv)>1 else 'vignanam-normal-reading');PLAN=json.loads((OUT/'plan.json').read_text(encoding='utf-8'))
RATE=48000;FRAME=4
def run(a):subprocess.run(a,check=True)
def read(n):return json.loads((OUT/f'{n}.json').read_text(encoding='utf-8'))
def save(n,v):(OUT/f'{n}.json').write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf-8')
def duration(p):return visual.duration(p)
OPENING=3.
def silence(path):
    r=subprocess.run(['ffmpeg','-hide_banner','-nostdin','-i',str(path),'-af','silencedetect=noise=-45dB:d=1.4','-f','null','-'],capture_output=True,text=True,check=True)
    starts=[float(x) for x in re.findall(r'silence_start: ([\d.]+)',r.stderr)]
    ends=[float(x) for x in re.findall(r'silence_end: ([\d.]+)',r.stderr)]
    return list(zip(starts,ends))
def write_wav(path,pcm):
    with wave.open(str(path),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(RATE);w.writeframes(pcm)

def prepare():
    all_chars=[];all_pcm=[];offset=0;cuts=[]
    for b in PLAN['batches']:
        stem=b['stem'];a=read(stem+'-alignment');assert not read(stem+'-checks')['collapsedWords']
        t=''.join(a['characters']);assert t==b['text']
        spans=[]
        for m in re.finditer(r'\S+',t):spans.append((min(a['character_start_times_seconds'][m.start():m.end()]),max(a['character_end_times_seconds'][m.start():m.end()])))
        raw=OUT/f'{stem}-normalized.wav'
        if not raw.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(OUT/f'{stem}.mp3'),'-af','loudnorm=I=-18:TP=-2:LRA=7,aresample=48000','-ar',str(RATE),'-ac','2','-c:a','pcm_s16le',str(raw)])
        with wave.open(str(raw),'rb') as w:pcm=w.readframes(w.getnframes())
        seconds=len(pcm)/FRAME/RATE;start=max(0,spans[0][0]-.08);end=min(seconds,spans[-1][1]+.18)
        intervals=[]
        for x,y in silence(raw):
            # Preserve all acoustically aligned words and normal breaths.
            if x>start+.1 and y<end-.1 and not any(v>x+.1 and u<y-.1 for u,v in spans):
                intervals.append((x+.18,y-.18))
        keep=[];cursor=start
        for x,y in intervals:keep.append((cursor,x));cursor=y
        keep.append((cursor,end))
        kept=b''.join(pcm[round(x*RATE)*FRAME:round(y*RATE)*FRAME] for x,y in keep)
        def remap(t):return max(0,min(end-start-sum(y-x for x,y in intervals),t-start-sum(max(0,min(t,y)-x) for x,y in intervals if t>x)))+offset
        if all_chars:
            all_chars += [dict(text='\n',start=offset,end=offset),dict(text='\n',start=offset,end=offset)]
        all_chars += [dict(text=c,start=remap(u),end=remap(v)) for c,u,v in zip(a['characters'],a['character_start_times_seconds'],a['character_end_times_seconds'])]
        all_pcm.append(kept);offset+=len(kept)/FRAME/RATE
        if b['index']+1<len(PLAN['batches']):all_pcm.append(bytes(round(.16*RATE)*FRAME));offset+=.16
        cuts.append(dict(batch=b['index'],headTrim=start,tailTrim=seconds-end,internalCuts=intervals))
    text=''.join(c['text'] for c in all_chars);assert text.split()==PLAN['text'].split()
    words=visual.words_from_alignment({'characters':all_chars})
    assert len(words)==PLAN['words'];assert all(w['end']-w['start']>=.02 for w in words)
    write_wav(OUT/'reading.wav',b''.join(all_pcm));save('align',{'characters':all_chars,'words':words})
    save('gap-edits',{'batches':cuts,'wordsPreserved':len(words),'music':False,'pitchOrSpeedChanged':False})
    mp3=OUT/'Anjaneya-Dandakam-Normal-Reading.mp3'
    if not mp3.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(OUT/'reading.wav'),'-c:a','libmp3lame','-b:a','192k',str(mp3)])
    return duration(OUT/'reading.wav')

def main():
    prayer=prepare()
    source=ROOT/'elevenlabs-original-song'
    for name in ['closing.json','closing-normalized.wav']:shutil.copyfile(source/name,OUT/name)
    opening=OUT/'opening-voice.wav'
    if not opening.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT/'reference-v4/opening-voice-clocked.wav'),'-t',str(OPENING),'-c:a','pcm_s16le',str(opening)])
    seconds=OPENING+prayer+duration(OUT/'closing-normalized.wav')
    listing=OUT/'voice.ffconcat';listing.write_text('ffconcat version 1.0\n'+''.join(f"file '{p.resolve().as_posix()}'\n" for p in [opening,OUT/'reading.wav',OUT/'closing-normalized.wav']),encoding='utf-8')
    mix=OUT/'full-voice.wav'
    if not mix.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(listing),'-c','copy',str(mix)])
    visual.OUT=OUT;visual.PLAN=PLAN;visual.OPENING=OPENING;visual.v4.OPENING=OPENING
    words=visual.captions(prayer,seconds)
    p=OUT/'full-captions.ass';s=p.read_text(encoding='utf-8').replace('నీ తోడులో\\Nవెలుగు','శ్రీ ఆంజనేయ\\Nదండకం').replace('హనుమంతుని భక్తిగీతం','ఆంజనేయ దండకం')
    p.write_text(s,encoding='utf-8')
    bg=visual.background(words,prayer,seconds)
    target=OUT/'Anjaneya-Dandakam-Normal-Reading-1080p.mp4'
    if not target.exists():
        graph=('[0:v]drawbox=x=0:y=0:w=iw:h=94:color=black@.4:t=fill,drawbox=x=0:y=785:w=iw:h=295:color=0x050C20@.83:t=fill,'
            f"ass=filename='{p.as_posix()}':fontsdir='public/fonts':shaping=complex[base];[2:v]scale=100:100[logo];[base][logo]overlay=25:0:format=auto,format=nv12[v]")
        run(['ffmpeg','-v','error','-nostdin','-n','-filter_complex_threads','2','-i',str(bg),'-i',str(mix),'-i',visual.v4.base.BRAND['logo'],'-filter_complex',graph,
            '-map','[v]','-map','1:a:0','-t',str(seconds),'-c:v','h264_qsv','-preset','medium','-global_quality','20','-c:a','aac','-b:a','192k','-movflags','+faststart',
            '-progress',str(OUT/'render-progress.txt'),str(target)])
    run(['ffmpeg','-v','error','-nostdin','-i',str(target),'-f','null','-'])
    info=visual.v4.base.bookends.probe(target);v=next(x for x in info['streams'] if x['codec_type']=='video');a=next(x for x in info['streams'] if x['codec_type']=='audio')
    assert abs(float(v['duration'])-float(a['duration']))<.15
    assert abs(float(info['format']['duration'])-seconds)<.15
    remaining=silence(OUT/'reading.wav')
    assert not remaining,'Excess silence remains in plain reading; inspect before delivery'
    for n,t in [('opening',2),('reading',20),('middle',seconds/2),('closing',seconds-3)]:
        p=OUT/f'review-{n}.png'
        if not p.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(t),'-i',str(target),'-frames:v','1',str(p)])
    save('verification',dict(file=str(target.resolve()),audio=str((OUT/'Anjaneya-Dandakam-Normal-Reading.mp3').resolve()),
        seconds=duration(target),readingSeconds=prayer,source=PLAN['source'],mainTextWordsMapped=len(words),normalSpeech=True,
        music=False,singing=False,speedChanged=False,excessSilentGapsOver1_4Seconds=remaining,fullDecodePassed=True,
        exactPronunciationListeningReviewPending=True,bracketAlternativesOmitted=PLAN.get('bracketedAlternativeReadingsOmitted',False),published=False))
    print(json.dumps(read('verification')),flush=True)
if __name__=='__main__':main()
