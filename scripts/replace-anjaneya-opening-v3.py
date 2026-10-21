"""Replace the blue opening card with the existing cinematic Hanuman artwork."""
from pathlib import Path
import json,subprocess

ROOT=Path('data/productions/divine-wisdom/anjaneya-dandakam-2026-10-16')
OUT=ROOT/'cinematic-v3'
OUT.mkdir(exist_ok=True)
PREVIOUS=ROOT/'Sri-Anjaneya-Dandakam-Cinematic-Music-V2.mp4'

def run(args):subprocess.run(args,check=True)
def probe(path):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(path)]))
def duration(path):return float(probe(path)['format']['duration'])
def stamp(t):
    n=round(t*100)
    return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'

def main():
    seconds=duration(ROOT/'welcome-1080p.mp4')
    source=(ROOT/'welcome.ass').read_text(encoding='utf-8')
    header=source.split('[Events]')[0]+'[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n'
    captions=[line for line in source.splitlines() if line.startswith('Dialogue:') and ',Caption,' in line]
    assert captions
    cards=[
        f'Dialogue: 0,{stamp(0)},{stamp(seconds)},Channel,,0,0,0,,{{\\an4\\pos(150,47)\\fs36}}Divine Wisdom Telugu',
        f'Dialogue: 0,{stamp(0)},{stamp(seconds)},Title,,0,0,0,,{{\\an5\\pos(960,695)\\fs82}}శ్రీ ఆంజనేయ దండకం'
    ]
    subtitle=OUT/'opening.ass'
    subtitle.write_text(header+'\n'.join(cards+captions)+'\n',encoding='utf-8')
    welcome=OUT/'welcome-cinematic-v3.mp4'
    if not welcome.exists():
        graph=(
            '[0:v]setsar=1,drawbox=x=0:y=0:w=iw:h=94:color=black@0.40:t=fill,'
            'drawbox=x=0:y=625:w=iw:h=155:color=black@0.36:t=fill,'
            'drawbox=x=0:y=785:w=iw:h=295:color=0x050C20@0.94:t=fill,'
            f"ass=filename='{subtitle.as_posix()}':fontsdir='public/fonts':shaping=complex[base];"
            '[2:v]scale=100:100[logo];[base][logo]overlay=25:0:format=auto,format=nv12[v]')
        run(['ffmpeg','-v','error','-nostdin','-n','-filter_complex_threads','2',
            '-i',str(ROOT/'cinematic-v2/motion-00.mp4'),'-i',str(ROOT/'welcome-1080p.mp4'),
            '-i','data/branding/divine-wisdom/youtube-avatar/divine-wisdom-telugu-circle-safe.png',
            '-filter_complex',graph,'-map','[v]','-map','1:a:0','-t',str(seconds),'-r','24',
            '-c:v','h264_qsv','-preset','medium','-global_quality','20','-profile:v','high','-level:v','4.0',
            '-c:a','copy','-movflags','+faststart',str(welcome)])
    assert abs(duration(welcome)-seconds)<.06
    manifest=OUT/'final.ffconcat'
    manifest.write_text("ffconcat version 1.0\nfile 'welcome-cinematic-v3.mp4'\nfile '../cinematic-v2/Anjaneya-Dandakam-Cinematic-Main-V2-Stable.mp4'\nfile '../closing-1080p.mp4'\n",encoding='utf-8')
    final=ROOT/'Sri-Anjaneya-Dandakam-Cinematic-V3.mp4'
    if not final.exists():
        run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(manifest),'-i',str(PREVIOUS),
            '-map','0:v:0','-map','1:a:0','-c','copy','-t',str(duration(PREVIOUS)),'-movflags','+faststart',str(final)])
    run(['ffmpeg','-v','error','-nostdin','-i',str(final),'-f','null','-'])
    def audiohash(path):
        return subprocess.check_output(['ffmpeg','-v','error','-nostdin','-i',str(path),'-map','0:a:0','-c','copy','-f','hash','-hash','sha256','-']).decode().strip()
    assert audiohash(final)==audiohash(PREVIOUS),'Audio packet preservation failed'
    info=probe(final)
    assert abs(float(info['format']['duration'])-duration(PREVIOUS))<.1
    video=next(s for s in info['streams'] if s['codec_type']=='video')
    assert (video['width'],video['height'])==(1920,1080)
    for name,t in [('first-frame',0),('welcome',3),('title',8),('transition',seconds+.5)]:
        frame=OUT/f'review-{name}.png'
        if not frame.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(t),'-i',str(final),'-frames:v','1',str(frame)])
    report={'file':str(final.resolve()),'seconds':float(info['format']['duration']),
        'opening':'Full-frame cinematic Hanuman temple artwork with gentle movement, small corner logo, Telugu title and highlighted welcome captions',
        'flatBlueOpeningRemoved':True,'welcomeDurationPreserved':True,'fullAudioPacketsPreserved':True,
        'fullDecodePassed':True,'resolution':'1920x1080','published':False}
    (OUT/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report),flush=True)

if __name__=='__main__':main()
