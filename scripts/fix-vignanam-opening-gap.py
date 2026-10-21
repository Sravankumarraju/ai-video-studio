"""Remove the padded 3–6 second welcome gap from the rendered video and subtitles."""
from pathlib import Path
import json,re,subprocess

ROOT=Path('data/productions/divine-wisdom/anjaneya-dandakam-2026-10-16/vignanam-normal-reading')
SOURCE=ROOT/'Anjaneya-Dandakam-Normal-Reading-1080p.mp4'
TARGET=ROOT/'Anjaneya-Dandakam-Normal-Reading-1080p-V2.mp4'
CUT_START=3.;CUT_END=6.;REMOVED=CUT_END-CUT_START
def run(args):return subprocess.run(args,check=True)
def probe(path):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(path)]))
def gaps(path):
    r=subprocess.run(['ffmpeg','-hide_banner','-nostdin','-i',str(path),'-vn','-af','silencedetect=noise=-40dB:d=1.4','-f','null','-'],capture_output=True,text=True,check=True)
    a=[float(x) for x in re.findall(r'silence_start: ([\d.]+)',r.stderr)]
    b=[float(x) for x in re.findall(r'silence_end: ([\d.]+)',r.stderr)]
    return list(zip(a,b))
def shift(t):return t if t<=CUT_START else CUT_START if t<CUT_END else t-REMOVED
def parse(s):
    h,m,t=s.replace(',','.').split(':');return int(h)*3600+int(m)*60+float(t)
def stamp(t,ass=False):
    n=round(t*(100 if ass else 1000))
    if ass:return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'
    return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'

def main():
    before=gaps(SOURCE);assert any(a<3.05 and b>5.95 for a,b in before),'Expected opening gap was not found'
    if not TARGET.exists():
        graph=('[0:v]split=2[v0][v1];[v0]trim=end=3,setpts=PTS-STARTPTS[headv];'
            '[v1]trim=start=6,setpts=PTS-STARTPTS[tailv];'
            '[0:a]asplit=2[a0][a1];[a0]atrim=end=3,asetpts=PTS-STARTPTS[heada];'
            '[a1]atrim=start=6,asetpts=PTS-STARTPTS[taila];'
            '[headv][heada][tailv][taila]concat=n=2:v=1:a=1[v][a]')
        run(['ffmpeg','-v','error','-nostdin','-n','-filter_complex_threads','2','-i',str(SOURCE),'-filter_complex',graph,
            '-map','[v]','-map','[a]','-c:v','h264_qsv','-preset','medium','-global_quality','20','-c:a','aac','-b:a','192k',
            '-movflags','+faststart','-progress',str(ROOT/'opening-fix-progress.txt'),str(TARGET)])
    # Shift matching subtitle sources as well as the already burned captions.
    cues=[]
    for block in (ROOT/'captions-te.srt').read_text(encoding='utf-8').strip().split('\n\n'):
        lines=block.splitlines();a,b=lines[1].split(' --> ');x,y=shift(parse(a)),shift(parse(b))
        if y>x:cues.append(f'{len(cues)+1}\n{stamp(x)} --> {stamp(y)}\n'+'\n'.join(lines[2:]))
    (ROOT/'captions-te-V2.srt').write_text('\n\n'.join(cues)+'\n',encoding='utf-8')
    lines=[]
    for line in (ROOT/'full-captions.ass').read_text(encoding='utf-8').splitlines():
        if line.startswith('Dialogue:'):
            parts=line.split(',',9);x,y=shift(parse(parts[1])),shift(parse(parts[2]))
            if y<=x:continue
            parts[1]=stamp(x,True);parts[2]=stamp(y,True);line=','.join(parts)
        lines.append(line)
    (ROOT/'full-captions-V2.ass').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    after=gaps(TARGET);assert not after,f'Long silent gaps remain: {after}'
    run(['ffmpeg','-v','error','-nostdin','-i',str(TARGET),'-f','null','-'])
    original=probe(SOURCE);fixed=probe(TARGET)
    expected=float(original['format']['duration'])-REMOVED
    actual=float(fixed['format']['duration']);assert abs(actual-expected)<.15
    v=next(s for s in fixed['streams'] if s['codec_type']=='video');a=next(s for s in fixed['streams'] if s['codec_type']=='audio')
    assert (v['width'],v['height'])==(1920,1080)
    assert abs(float(v['duration'])-float(a['duration']))<.15
    # Check the retained PCM through the cut: no spoken material was removed.
    pcm=subprocess.check_output(['ffmpeg','-v','error','-nostdin','-i',str(SOURCE),'-vn','-f','s16le','-acodec','pcm_s16le','-'])
    stride=48000*2*2;gap=pcm[round(CUT_START*stride):round(CUT_END*stride)]
    import array
    samples=array.array('h',gap);peak=max(abs(s) for s in samples)
    assert peak<330,'Cut contains audio louder than -40 dBFS; inspect for clipped speech'
    previous=json.loads((ROOT/'verification.json').read_text(encoding='utf-8'))
    backup=ROOT/'verification-before-opening-fix.json'
    if not backup.exists():backup.write_text(json.dumps(previous,ensure_ascii=False,indent=2),encoding='utf-8')
    report={**previous,'file':str(TARGET.resolve()),'seconds':actual,'openingSeconds':3,'removedSilentInterval':[3,6],
        'removedSeconds':REMOVED,'cutPeakSample':peak,'fullVideoLongSilentGapsOver1_4Seconds':after,
        'fullDecodePassed':True,'subtitleFile':str((ROOT/'captions-te-V2.srt').resolve()),
        'captionSyncPreservedByIdenticalAudioVideoCut':True,'published':False}
    (ROOT/'opening-gap-fix-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    (ROOT/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    frame=ROOT/'review-opening-V2.png'
    if not frame.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss','3.2','-i',str(TARGET),'-frames:v','1',str(frame)])
    print(json.dumps(dict(file=str(TARGET.resolve()),seconds=actual,longSilentGaps=after,cutPeakSample=peak)),flush=True)
if __name__=='__main__':main()
