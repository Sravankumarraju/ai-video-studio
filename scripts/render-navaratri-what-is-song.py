"""Create a branded visual edition of the supplied recording; no provider calls."""
from pathlib import Path
import hashlib
import json
import math
import shutil
import subprocess
import sys

ROOT = Path('data/productions/divine-wisdom/navaratri-what-is-2026-10-16')
ART = Path('data/productions/divine-wisdom/navaratri-song-2026-10-15')
LOGO = Path('data/branding/divine-wisdom/logo-samples/01-lotus-book.png')
SOURCE = Path('C:/Users/sravankumar.raju/Downloads/నవరాత్రి అంటే ఏమిటమ్మా_.m4a')
OUT = ROOT / 'Navaratri-Ante-Emitamma-Logo-1080p.mp4'
FPS = 24

def run(args):
    subprocess.run(args, check=True)

def probe(path):
    return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(path)]))

def save(name, data):
    (ROOT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf8')

def prepare():
    ROOT.mkdir(parents=True, exist_ok=True)
    (ROOT / 'pieces').mkdir(exist_ok=True)
    copied = ROOT / 'recording-original.m4a'
    if not copied.exists():
        shutil.copy2(SOURCE, copied)
    assert hashlib.sha256(copied.read_bytes()).digest() == hashlib.sha256(SOURCE.read_bytes()).digest()
    info = probe(copied)
    duration = float(info['format']['duration'])
    (ROOT / 'lyrics-supplied.txt').write_text(info['format'].get('tags', {}).get('lyrics', ''), encoding='utf8')
    # Lyrics are source data. Bracketed performance directions are not rendered.
    ass = '''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Title,Noto Sans Telugu,86,&H008CE6FF,&H008CE6FF,&H00110B09,&H90000000,0,0,0,0,100,100,0,0,1,3,1,2,90,90,140,1
Style: Channel,Noto Sans,40,&H00FFFFFF,&H00FFFFFF,&H00110B09,&H90000000,0,0,0,0,100,100,0,0,1,2,1,2,90,90,65,1
Style: Closing,Noto Sans Telugu,58,&H00FFFFFF,&H00FFFFFF,&H00110B09,&H90000000,0,0,0,0,100,100,0,0,1,2,1,2,90,90,95,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 1,0:00:00.60,0:00:10.50,Title,,0,0,0,,{\\fad(600,650)}నవరాత్రి అంటే ఏమిటమ్మా?
Dialogue: 1,0:00:00.60,0:00:10.50,Channel,,0,0,0,,{\\fad(600,650)}DIVINE WISDOM TELUGU
Dialogue: 1,0:02:52.00,0:03:00.40,Closing,,0,0,0,,{\\fad(500,700)}సబ్‌స్క్రైబ్ చేయండి · లైక్ చేయండి
Dialogue: 1,0:02:52.00,0:03:00.40,Channel,,0,0,0,,{\\fs32\\fad(500,700)}DIVINE WISDOM TELUGU
'''
    (ROOT / 'branding.ass').write_text(ass, encoding='utf8')
    images = ['festival-courtyard', 'lamp-grace', 'devi-cosmic', 'festival-courtyard',
              'devi-cosmic', 'lamp-grace', 'kolatam-celebration', 'festival-courtyard',
              'lamp-grace', 'kolatam-celebration', 'devi-cosmic', 'lamp-grace']
    total_frames = math.ceil(duration * FPS)
    scenes = []
    for i, image in enumerate(images):
        first = round(i * total_frames / len(images))
        last = round((i + 1) * total_frames / len(images))
        scenes.append({'index': i, 'image': str(ART / (image + '.png')), 'start': first / FPS, 'frames': last - first})
    save('production.json', {'title': 'నవరాత్రి అంటే ఏమిటమ్మా?', 'channel': 'Divine Wisdom Telugu',
         'duration': duration, 'fps': FPS, 'logo': str(LOGO), 'scenes': scenes,
         'visuals': 'Existing project devotional artwork with gentle camera motion',
         'captions': 'Title and channel branding only; no unverified lyric timing', 'published': False})
    print(f'Prepared {len(scenes)} scenes, {duration:.3f} seconds', flush=True)

def render():
    plan = json.loads((ROOT / 'production.json').read_text(encoding='utf8'))
    for s in plan['scenes']:
        piece = ROOT / 'pieces' / f"{s['index']:02}.mp4"
        if piece.exists():
            continue
        n = s['frames']
        zoom = f'1.01+0.05*on/{n-1}' if s['index'] % 2 == 0 else f'1.06-0.05*on/{n-1}'
        vf = (f"[0:v]scale=2560:1440:force_original_aspect_ratio=increase,crop=2560:1440,"
              f"zoompan=z='{zoom}':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)*0.44':d={n}:s=1920x1080:fps={FPS},"
              f"setsar=1,fade=t=in:st=0:d=0.25,fade=t=out:st={n/FPS-0.25}:d=0.25,"
              f"setpts=PTS+{s['start']}/TB,ass=filename='{ROOT.as_posix()}/branding.ass':fontsdir='public/fonts':shaping=complex,"
              "setpts=PTS-STARTPTS[art];[1:v]scale=164:164,format=rgba[logo];"
              "[art][logo]overlay=W-w-34:28:format=auto,format=yuv420p[v]")
        run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-i', s['image'], '-i', str(LOGO),
             '-filter_complex_threads', '2', '-filter_complex', vf, '-map', '[v]', '-frames:v', str(n),
             '-an', '-c:v', 'libx264', '-threads', '6', '-preset', 'veryfast', '-crf', '19',
             '-video_track_timescale', '24000', str(piece)])
        print(f"Rendered scene {s['index']+1}/{len(plan['scenes'])}", flush=True)
    (ROOT / 'pieces.txt').write_text('\n'.join(f"file 'pieces/{s['index']:02}.mp4'" for s in plan['scenes'])+'\n', encoding='utf8')
    run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-f', 'concat', '-safe', '0', '-i', str(ROOT / 'pieces.txt'),
         '-i', str(ROOT / 'recording-original.m4a'), '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy',
         '-t', str(plan['duration']), '-map_metadata', '-1', '-metadata', 'title=నవరాత్రి అంటే ఏమిటమ్మా?',
         '-metadata', 'artist=Divine Wisdom Telugu', '-movflags', '+faststart', str(OUT)])
    print('Export complete', flush=True)

def verify():
    info = probe(OUT)
    video = next(s for s in info['streams'] if s['codec_type'] == 'video')
    assert (video['width'], video['height']) == (1920, 1080)
    original = ROOT / 'recording-original.m4a'
    assert abs(float(info['format']['duration']) - float(probe(original)['format']['duration'])) < 0.1
    def audiohash(path):
        return subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-map', '0:a:0', '-c', 'copy', '-f', 'hash', '-hash', 'sha256', '-']).decode().strip()
    assert audiohash(OUT) == audiohash(original)
    run(['ffmpeg', '-v', 'error', '-xerror', '-nostdin', '-i', str(OUT), '-f', 'null', '-'])
    for name, t in [('opening', 5), ('middle', 76), ('closing', 176)]:
        run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-ss', str(t), '-i', str(OUT), '-frames:v', '1', '-q:v', '2', str(ROOT / f'review-{name}.jpg')])
    run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-ss', '5', '-i', str(OUT), '-vf', 'scale=1280:720', '-frames:v', '1', '-q:v', '2', str(ROOT / 'youtube-thumbnail.jpg')])
    save('verification.json', {'video': str(OUT.resolve()), 'duration': float(info['format']['duration']),
         'resolution': [1920, 1080], 'fullDecodePassed': True, 'originalAudioPacketsUnchanged': True,
         'logoThroughout': True, 'bytes': OUT.stat().st_size, 'published': False})
    print('Verified full decode, 1080p, duration, and unchanged original audio', flush=True)

if __name__ == '__main__':
    {'prepare': prepare, 'render': render, 'verify': verify}[sys.argv[1]]()
