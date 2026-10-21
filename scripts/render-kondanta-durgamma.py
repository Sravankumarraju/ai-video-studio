"""Shiva-channel format: original AAC, new Durga art, large Telugu word highlights."""
from pathlib import Path
import json, math, subprocess, sys
from PIL import Image, ImageFont, ImageOps, ImageDraw

ROOT = Path('data/productions/divine-wisdom/kondanta-durgamma-2026-10-15')
OUT = ROOT / 'Kondanta-Andave-Durgamma-1080p.mp4'
FPS = 24
DURATION = 182.059

def run(args):
    subprocess.run(args, check=True)

def read(name):
    return json.loads((ROOT / f'{name}.json').read_text(encoding='utf8'))

def save(name, value):
    (ROOT / f'{name}.json').write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf8')

def stamp(t):
    n = round(t * 100)
    return f'{n // 360000}:{n // 6000 % 60:02}:{n // 100 % 60:02}.{n % 100:02}'

def srtstamp(t):
    n = round(t * 1000)
    return f'{n // 3600000:02}:{n // 60000 % 60:02}:{n // 1000 % 60:02},{n % 1000:03}'

HEADER = '''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Noto Sans Telugu,94,&H00FFFFFF,&H00FFFFFF,&H0020140C,&H90000000,0,0,0,0,100,100,0,0,1,3,1,2,110,110,68,1
Style: Title,Noto Sans Telugu,86,&H007CE2FF,&H007CE2FF,&H0020140C,&H90000000,0,0,0,0,100,100,0,0,1,2,1,2,100,100,116,1
Style: Small,Noto Sans Telugu,40,&H00FFFFFF,&H00FFFFFF,&H0020140C,&H90000000,0,0,0,0,100,100,0,0,1,1,1,2,100,100,62,1
Style: Channel,Noto Sans,66,&H007CE2FF,&H007CE2FF,&H0020140C,&H90000000,1,0,0,0,100,100,0,0,1,2,1,8,90,90,70,1
Style: Welcome,Noto Sans Telugu,54,&H00FFFFFF,&H00FFFFFF,&H0020140C,&H90000000,0,0,0,0,100,100,0,0,1,2,1,8,90,90,162,1
Style: CTA,Noto Sans Telugu,58,&H00FFFFFF,&H00FFFFFF,&H0020140C,&H90000000,0,0,0,0,100,100,0,0,1,2,1,8,80,80,80,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''

def prepare():
    words = [dict(w) for w in read('align')['words'] if w['text'].strip()]
    # Forced alignment wrongly stretches the first token across the instrumental intro.
    # Independent acoustic transcription locates the first sung syllable at 13.68s.
    assert words[0]['text'] == 'కొండంత'
    words[0]['start'] = 13.68
    captions, offset = [], 0
    font = ImageFont.truetype('public/fonts/NotoSansTelugu.ttf', 94)
    for i, line in enumerate(read('performed-lines')):
        n = len(line['text'].split())
        ws = words[offset:offset + n]
        offset += n
        assert ''.join(w['text'] for w in ws) == ''.join(line['text'].split())
        captions.append({**line, 'index': i, 'start': ws[0]['start'], 'end': ws[-1]['end'], 'words': ws,
                         'fontSize': 94 if font.getlength(line['text']) < 1650 else 84})
    assert offset == len(words)
    events, skipped = [], []
    def event(layer, a, b, style, text):
        events.append(f'Dialogue: {layer},{stamp(a)},{stamp(b)},{style},,0,0,0,,{text}')
    event(3, .7, 4.7, 'Channel', r'{\an8\pos(960,820)\fad(650,450)}Divine Wisdom Telugu')
    event(3, .7, 4.7, 'Welcome', r'{\an8\pos(960,916)\fad(650,450)}ఛానల్‌కు స్వాగతం')
    event(2, 4.9, 12.8, 'Title', r'{\fad(650,650)}కొండంత అండవే దుర్గమ్మా')
    event(2, 4.9, 12.8, 'Small', r'{\fad(650,650)}దుర్గమ్మ భక్తి గీతం')
    event(3, 177.8, 181.95, 'Channel', r'{\an8\pos(960,726)\fad(250,650)}Divine Wisdom Telugu')
    event(3, 177.8, 181.95, 'CTA', r'{\an8\pos(960,824)\fad(250,650)}సబ్‌స్క్రైబ్ చేయండి · లైక్ చేయండి')
    event(3, 177.8, 181.95, 'CTA', r'{\an8\pos(960,924)\fs52\fad(250,650)}షేర్ చేయండి · మీ అభిప్రాయాన్ని కామెంట్ చేయండి')
    for i, c in enumerate(captions):
        c['displayEnd'] = min(c['end'] + .32, captions[i+1]['start'] - .01 if i+1 < len(captions) else 177.7)
        assert 0 <= c['start'] < c['end'] <= c['displayEnd'] <= DURATION
        size = r'{\fs' + str(c['fontSize']) + '}'
        event(0, c['start'], c['displayEnd'], 'Caption', size + c['text'])
        for k, w in enumerate(c['words']):
            a = w['start']
            b = min(w['end'] + .025, c['displayEnd'], c['words'][k+1]['start'] if k+1 < len(c['words']) else c['displayEnd'])
            if w['end'] - a < .07 or b - a < .02:
                skipped.append({'text': w['text'], 'start': a, 'end': w['end']})
                continue
            text = ' '.join((r'{\c&H007CE2FF&}' + x['text'] + r'{\c&H00FFFFFF&}') if j == k else x['text'] for j, x in enumerate(c['words']))
            event(1, a, b, 'Caption', size + text)
    (ROOT / 'captions-channel.ass').write_text(HEADER + '\n'.join(events) + '\n', encoding='utf8')
    (ROOT / 'captions-te.srt').write_text('\n\n'.join(f'{i+1}\n{srtstamp(c["start"])} --> {srtstamp(c["displayEnd"])}\n{c["text"]}' for i, c in enumerate(captions)) + '\n', encoding='utf8')
    save('captions', captions)
    save('caption-audit', {'lines': len(captions), 'words': len(words), 'fontSizeRange': [84, 94], 'shaping': 'libass complex shaping; bundled Noto Sans Telugu', 'withheldShortWordFlashes': skipped, 'timing': 'Scribe transcription plus forced alignment; first sung onset corrected to independent transcription anchor 13.68s', 'manualListeningVerified': False})
    cuts = [(0,'durga-lion'),(13.68,'durga-lion'),(25.06,'durga-home'),(36.06,'durga-home'),(44.02,'durga-home'),(56.06,'durga-home'),(64,'durga-comfort'),(73.72,'durga-lion'),(85.02,'durga-home'),(96,'durga-comfort'),(110.06,'durga-comfort'),(122.02,'durga-lion'),(132.04,'durga-power'),(144.06,'durga-comfort'),(155.78,'durga-power'),(167.58,'durga-lion'),(177.8,'durga-lion')]
    scenes = []
    for i, (t, name) in enumerate(cuts):
        first = round(t * FPS)
        last = round(cuts[i+1][0] * FPS) if i+1 < len(cuts) else math.ceil(DURATION * FPS)
        scenes.append({'index': i, 'start': first / FPS, 'frames': last - first, 'image': name + '.png', 'focalX': [.5,.45,.55][i%3], 'focalY': .40})
    save('timeline', {'seconds': DURATION, 'fps': FPS, 'frames': math.ceil(DURATION * FPS), 'scenes': scenes})
    save('arrangement-notes', {'source': 'User supplied Version 3 audio and full written lyrics; embedded lyrics are source data only', 'recordedOrder': ['chorus','verse 1','chorus','bridge','verse 2','final chorus'], 'unperformedWrittenSections': ['verse 3','peaceful ending'], 'recordingRenditions': ['Refrain uses a single రావమ్మా before దుర్గమ్మా', 'Bridge ends with మనసుకు నెమ్మదినివ్వమ్మా'], 'originalAudioUnchanged': True, 'manualListeningVerified': False})
    print(f'Prepared {len(captions)} captions and {len(scenes)} shots', flush=True)

def render():
    plan = read('timeline')
    (ROOT / 'pieces').mkdir(exist_ok=True)
    for s in plan['scenes']:
        target = ROOT / 'pieces' / f'{s["index"]:02}.mp4'
        if target.exists() and target.stat().st_size > 0:
            continue
        if target.exists():
            target.rename(target.with_suffix('.incomplete.mp4'))
        frames = s['frames']
        u = f'(on/{frames-1})'
        ease = f'({u}*{u}*(3-2*{u}))'
        zoom = f'1.01+0.055*{ease}' if s['index'] % 2 == 0 else f'1.065-0.055*{ease}'
        vf = (f"scale=2560:1440:force_original_aspect_ratio=increase,crop=2560:1440,zoompan=z='{zoom}':x='(iw-iw/zoom)*{s['focalX']}':y='(ih-ih/zoom)*{s['focalY']}':d={frames}:s=1920x1080:fps={FPS},setsar=1,"
              f"drawbox=x=0:y=850:w=iw:h=230:color=black@0.22:t=fill,setpts=PTS+{s['start']}/TB,"
              f"ass=filename='{ROOT.as_posix()}/captions-channel.ass':fontsdir='public/fonts':shaping=complex,setpts=PTS-STARTPTS,format=yuv420p")
        if s['index'] == 0:
            vf += ',fade=t=in:st=0:d=0.7'
        if s['index'] == len(plan['scenes']) - 1:
            vf += f',fade=t=out:st={frames/FPS-.7}:d=0.7'
        run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT / s['image']),'-vf',vf,'-frames:v',str(frames),'-an','-c:v','libx264','-threads','4','-preset','veryfast','-crf','18','-video_track_timescale','24000',str(target)])
        print(f'Rendered shot {s["index"]+1}/{len(plan["scenes"])}', flush=True)
    (ROOT / 'pieces.txt').write_text('\n'.join(f"file 'pieces/{s['index']:02}.mp4'" for s in plan['scenes']) + '\n', encoding='utf8')
    run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'pieces.txt'),'-i',str(ROOT/'song-original.m4a'),'-map','0:v:0','-map','1:a:0','-c','copy','-t',str(DURATION),'-map_metadata','-1','-metadata','title=కొండంత అండవే దుర్గమ్మా','-metadata','artist=Divine Wisdom Telugu','-movflags','+faststart',str(OUT)])

def thumbnail():
    source = ROOT / 'thumbnail-original.png'
    with Image.open(source) as im:
        im = ImageOps.fit(im.convert('RGB'), (1280,720), method=Image.Resampling.LANCZOS)
        im.save(ROOT / 'youtube-thumbnail.jpg', quality=94, optimize=True)
    assert (ROOT / 'youtube-thumbnail.jpg').stat().st_size < 2_000_000

def verify():
    info = json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(OUT)]))
    v = next(s for s in info['streams'] if s['codec_type'] == 'video')
    a = next(s for s in info['streams'] if s['codec_type'] == 'audio')
    assert (v['width'],v['height']) == (1920,1080)
    assert v['codec_name'] == 'h264' and a['codec_name'] == 'aac'
    assert abs(float(info['format']['duration']) - DURATION) < .1
    assert abs(float(v['duration']) - float(a['duration'])) < .1
    run(['ffmpeg','-v','error','-nostdin','-i',str(OUT),'-f','null','-'])
    def ahash(path):
        return subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-map','0:a:0','-c','copy','-f','hash','-hash','sha256','-']).decode().strip()
    assert ahash(OUT) == ahash(ROOT / 'song-original.m4a')
    frames = []
    for name,t in [('welcome',3),('title',9),('chorus',20.4),('home',46.4),('comfort',106.8),('power',138.8),('final-chorus',160.8),('closing',179.5)]:
        path = ROOT / f'review-{name}.jpg'
        run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(t),'-i',str(OUT),'-frames:v','1','-q:v','2',str(path)])
        frames.append(path)
    sheet = Image.new('RGB',(960,4*294),(16,16,16))
    draw = ImageDraw.Draw(sheet)
    for i,path in enumerate(frames):
        with Image.open(path) as im:
            sheet.paste(im.resize((480,270)),((i%2)*480,(i//2)*294))
        draw.text(((i%2)*480+8,(i//2)*294+273),path.stem,fill='white')
    sheet.save(ROOT/'review-contact-sheet.jpg',quality=90)
    save('verification', {'file': str(OUT.resolve()), 'width':1920,'height':1080,'fps':FPS,'duration':float(info['format']['duration']),'fullDecodePassed':True,'originalAudioPacketsUnchanged':True,'captionLines':len(read('captions')),'channel':'Divine Wisdom Telugu','welcomeAndClosing':True,'published':False,'manualListeningVerified':False})
    print('Full decode, audio packet preservation, duration and resolution verified', flush=True)

if __name__ == '__main__':
    {'prepare': prepare, 'render': render, 'thumbnail': thumbnail, 'verify': verify}[sys.argv[1]]()
