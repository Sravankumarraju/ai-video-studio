"""Create the Durgamma channel edition using existing channel art and original AAC."""
from pathlib import Path
import json
import math
import shutil
import subprocess
import sys

ROOT = Path('data/productions/divine-wisdom/durgamma-song-2026-10-15/original-art-edition')
ART = Path('data/productions/divine-wisdom/devi-navaratri-2026/00-intro/v1')
SOURCE = Path(r'C:\Users\sravankumar.raju\Downloads\అమ్మా దుర్గమ్మా — నాలో నిలవమ్మా.m4a')
FINAL = ROOT / 'Amma-Durgamma-Nalo-Nilavamma-1080p.mp4'
FPS = 24


def run(args):
    subprocess.run(args, check=True)


def probe(path):
    return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(path)]))


def stamp(t):
    n = round(t * 100)
    return f'{n // 360000}:{n // 6000 % 60:02}:{n // 100 % 60:02}.{n % 100:02}'


def prepare():
    ROOT.mkdir(parents=True, exist_ok=True)
    (ROOT / 'pieces').mkdir(exist_ok=True)
    shutil.copy2(SOURCE, ROOT / 'song-original.m4a')
    info = probe(SOURCE)
    duration = float(info['format']['duration'])
    tags = info['format'].get('tags', {})
    lyrics = next((v for k, v in tags.items() if 'lyric' in k.lower()), '')
    if lyrics:
        (ROOT / 'lyrics-original.txt').write_text(lyrics, encoding='utf-8')
    header = '''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Channel,Noto Sans,60,&H009EE7FF,&H009EE7FF,&H00201810,&H90000000,1,0,0,0,100,100,0,0,1,2,1,5,60,60,40,1
Style: Telugu,Noto Sans Telugu,66,&H00FFFFFF,&H00FFFFFF,&H00201810,&H90000000,0,0,0,0,100,100,0,0,1,2,1,5,60,60,40,1
Style: Small,Noto Sans Telugu,38,&H00FFFFFF,&H00FFFFFF,&H00201810,&H90000000,0,0,0,0,100,100,0,0,1,2,1,5,60,60,40,1
Style: Watermark,Noto Sans,28,&H00FFFFFF,&H00FFFFFF,&H00201810,&H90000000,0,0,0,0,100,100,0,0,1,1,1,7,60,60,40,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    events = []

    def event(a, b, style, x, y, text, extra=''):
        events.append(f'Dialogue: 1,{stamp(a)},{stamp(b)},{style},,0,0,0,,{{\\pos({x},{y})\\fad(500,500){extra}}}{text}')

    event(.4, 6.5, 'Channel', 960, 858, 'Divine Wisdom Telugu')
    event(.4, 6.5, 'Small', 960, 945, 'డివైన్ విజ్డమ్ తెలుగు ఛానల్‌కు స్వాగతం')
    event(6.8, 16, 'Telugu', 960, 862, 'అమ్మా దుర్గమ్మా — నాలో నిలవమ్మా')
    event(6.8, 16, 'Small', 960, 957, 'దుర్గమ్మ భక్తి గీతం')
    event(16.4, 167.5, 'Small', 960, 951, 'అమ్మా దుర్గమ్మా — నాలో నిలవమ్మా')
    event(6.8, duration - .4, 'Watermark', 60, 44, 'DIVINE WISDOM TELUGU')
    event(168, duration - .3, 'Channel', 960, 825, 'Divine Wisdom Telugu', r'\fs48')
    event(168, duration - .3, 'Telugu', 960, 902, 'సబ్‌స్క్రైబ్ చేయండి · లైక్ చేయండి', r'\fs54')
    event(168, duration - .3, 'Telugu', 960, 980, 'షేర్ చేయండి · మీ అభిప్రాయాన్ని కామెంట్ చేయండి', r'\fs44')
    (ROOT / 'branding.ass').write_text(header + '\n'.join(events) + '\n', encoding='utf-8')
    images = ['durga-lion-original', 'durga-prayer-original', 'durga-lion-original', 'durga-lion-original', 'durga-kindness-original', 'durga-lion-original', 'durga-prayer-original', 'durga-prayer-original', 'durga-kindness-original', 'durga-lion-original', 'durga-kindness-original', 'durga-lion-original', 'durga-lion-original']
    boundaries = [0, 16, 30, 44, 58, 72, 86, 100, 114, 128, 142, 156, 168, duration]
    scenes = []
    for i, name in enumerate(images):
        start = round(boundaries[i] * FPS)
        end = round(boundaries[i + 1] * FPS) if i < len(images) - 1 else math.ceil(duration * FPS)
        scenes.append({'index': i, 'image': str(ROOT.parent / f'{name}.png'), 'startFrame': start, 'frames': end - start})
    (ROOT / 'production.json').write_text(json.dumps({'title': 'అమ్మా దుర్గమ్మా — నాలో నిలవమ్మా', 'channel': 'Divine Wisdom Telugu', 'duration': duration, 'fps': FPS, 'scenes': scenes, 'sourceAudio': str(SOURCE), 'captionMode': 'Song title and channel branding; no unverified lyric timing', 'published': False}, ensure_ascii=False, indent=2), encoding='utf-8')
    print('Prepared 13 scenes with channel opening and closing', flush=True)


def render():
    plan = json.loads((ROOT / 'production.json').read_text(encoding='utf-8'))
    for scene in plan['scenes']:
        output = ROOT / 'pieces' / f'{scene["index"]:02}.mp4'
        if output.exists():
            continue
        n = scene['frames']
        u = f'(on/{n - 1})'
        ease = f'({u}*{u}*(3-2*{u}))'
        zoom = f'1.015+0.045*{ease}' if scene['index'] % 2 == 0 else f'1.06-0.045*{ease}'
        offset = scene['startFrame'] / FPS
        vf = (f"scale=2304:1296:force_original_aspect_ratio=increase,crop=2304:1296,"
              f"zoompan=z='{zoom}':x='(iw-iw/zoom)*0.5':y='(ih-ih/zoom)*0.42':d={n}:s=1920x1080:fps={FPS},"
              f"setsar=1,drawbox=x=0:y=790:w=iw:h=290:color=black@0.67:t=fill,"
              f"setpts=PTS+{offset}/TB,ass=filename='{ROOT.as_posix()}/branding.ass':fontsdir='public/fonts':shaping=complex,"
              f"setpts=PTS-STARTPTS,format=yuv420p")
        if scene['index'] == 0:
            vf += ',fade=t=in:st=0:d=0.6'
        if scene['index'] == len(plan['scenes']) - 1:
            vf += f',fade=t=out:st={n / FPS - .8}:d=0.8'
        run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-i', scene['image'], '-vf', vf, '-frames:v', str(n), '-an', '-c:v', 'libx264', '-threads', '4', '-preset', 'veryfast', '-crf', '19', '-video_track_timescale', '24000', str(output)])
        print(f'Rendered scene {scene["index"] + 1}/13', flush=True)
    (ROOT / 'pieces.txt').write_text('\n'.join(f"file 'pieces/{s['index']:02}.mp4'" for s in plan['scenes']) + '\n', encoding='utf-8')
    run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-f', 'concat', '-safe', '0', '-i', str(ROOT / 'pieces.txt'), '-i', str(ROOT / 'song-original.m4a'), '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy', '-t', str(plan['duration']), '-metadata', 'title=అమ్మా దుర్గమ్మా — నాలో నిలవమ్మా', '-metadata', 'artist=Divine Wisdom Telugu', '-map_metadata', '-1', '-movflags', '+faststart', str(FINAL)])


def verify():
    info = probe(FINAL)
    video = next(s for s in info['streams'] if s['codec_type'] == 'video')
    assert (video['width'], video['height']) == (1920, 1080)
    assert abs(float(info['format']['duration']) - 181.12) < .1
    run(['ffmpeg', '-v', 'error', '-nostdin', '-i', str(FINAL), '-f', 'null', '-'])

    def audiohash(path):
        return subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-map', '0:a:0', '-c', 'copy', '-f', 'hash', '-hash', 'sha256', '-']).decode().strip()

    assert audiohash(SOURCE) == audiohash(FINAL)
    for label, t in [('opening', 3), ('title', 10), ('middle', 80), ('closing', 175)]:
        run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-ss', str(t), '-i', str(FINAL), '-frames:v', '1', '-q:v', '2', str(ROOT / f'review-{label}.jpg')])
    report = {'video': str(FINAL.resolve()), 'resolution': '1920x1080', 'fps': FPS, 'duration': float(info['format']['duration']), 'fullDecodePassed': True, 'originalAudioPacketsUnchanged': True, 'channelOpening': 'Divine Wisdom Telugu', 'closing': ['subscribe', 'like', 'share', 'comment'], 'published': False}
    (ROOT / 'verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report), flush=True)


if __name__ == '__main__':
    {'prepare': prepare, 'render': render, 'verify': verify}[sys.argv[1]]()
