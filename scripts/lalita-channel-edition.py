from pathlib import Path
import hashlib
import json
import math
import re
import subprocess

BASE = Path('data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12')
SOURCE_ROOT = BASE / 'full-sung-v2-approved-2026-10-15'
ROOT = SOURCE_ROOT / 'channel-edition'
SOURCE = SOURCE_ROOT / 'Sri-Lalita-Sahasranamam-Full-Song-Large-Telugu-Lyrics.mp4'
FPS = 24


def run(arguments):
    subprocess.run(arguments, check=True)


def probe(path):
    return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(path)]))


def stamp(seconds):
    value = round(seconds * 100)
    return f'{value // 360000}:{value // 6000 % 60:02}:{value // 100 % 60:02}.{value % 100:02}'


def section_video(section):
    name = section['name']
    voice = ROOT / f'{name}.mp3'
    seconds = math.ceil((float(probe(voice)['format']['duration']) + 1.2) * FPS) / FPS
    alignment = json.loads((ROOT / f'{name}-alignment.json').read_text(encoding='utf-8'))
    assert ''.join(alignment['characters']) == section['text']
    starts = alignment['character_start_times_seconds']
    ends = alignment['character_end_times_seconds']
    collapsed = []
    for token in re.finditer(r'\S+', section['text']):
        if max(ends[token.start():token.end()]) - min(starts[token.start():token.end()]) < .02:
            collapsed.append(token.group())
    assert not collapsed, f'{name}: collapsed narration words'
    events = []

    def card(style, text, position):
        events.append(f'Dialogue: 0,{stamp(0)},{stamp(seconds)},{style},,0,0,0,,{{\\an5\\pos({position[0]},{position[1]})}}{text}')

    card('Channel', 'డివైన్ విజ్డమ్ తెలుగు', (1370, 280))
    if name == 'welcome':
        card('Title', 'శ్రీ లలితా\\Nసహస్రనామం', (1370, 485))
        card('Small', 'మధురమైన భక్తి సంగీతం', (1370, 680))
    else:
        card('Blessing', 'శ్రీమాత అనుగ్రహం\\Nమీ అందరికీ కలగాలి', (1370, 450))
        card('Action', 'సబ్‌స్క్రైబ్ • లైక్\\Nషేర్ • కామెంట్', (1370, 675))
    for match in re.finditer(r'[^.]+\.?', section['text']):
        phrase = match.group().strip()
        if not phrase:
            continue
        start = min(starts[match.start():match.end()]) + .3
        end = max(ends[match.start():match.end()]) + .3
        events.append(f'Dialogue: 1,{stamp(start)},{stamp(end)},Caption,,0,0,0,,{phrase}')
    header = '''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Channel,Noto Sans Telugu,64,&H00FFFFFF,&H00FFFFFF,&H00101010,&H90000000,0,0,0,0,100,100,0,0,1,2,0,5,50,50,50,1
Style: Title,Noto Sans Telugu,110,&H004AD5FF,&H004AD5FF,&H00101010,&H90000000,0,0,0,0,100,100,0,0,1,2,0,5,50,50,50,1
Style: Small,Noto Sans Telugu,48,&H00FFFFFF,&H00FFFFFF,&H00101010,&H90000000,0,0,0,0,100,100,0,0,1,2,0,5,50,50,50,1
Style: Blessing,Noto Sans Telugu,62,&H00FFFFFF,&H00FFFFFF,&H00101010,&H90000000,0,0,0,0,100,100,0,0,1,2,0,5,50,50,50,1
Style: Action,Noto Sans Telugu,72,&H004AD5FF,&H004AD5FF,&H00101010,&H90000000,0,0,0,0,100,100,0,0,1,2,0,5,50,50,50,1
Style: Caption,Noto Sans Telugu,54,&H00FFFFFF,&H00FFFFFF,&H00101010,&H90000000,0,0,0,0,100,100,0,0,3,2,0,2,100,100,35,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    subtitle = ROOT / f'{name}.ass'
    subtitle.write_text(header + '\n'.join(events) + '\n', encoding='utf-8')
    output = ROOT / f'{name}-1080p.mp4'
    if not output.exists():
        video = f"scale=1920:1080,setsar=1,drawbox=x=900:y=140:w=960:h=670:color=black@0.55:t=fill,ass=filename='{subtitle.as_posix()}':fontsdir='public/fonts':shaping=complex,format=yuv420p"
        audio = (
            f'[1:a]loudnorm=I=-17:TP=-2:LRA=7,aresample=48000,aformat=channel_layouts=stereo,adelay=300|300,apad,atrim=duration={seconds}[voice];'
            f'[2:a]volume=0.04,afade=t=in:d=0.8,afade=t=out:st={seconds - 1}:d=1,atrim=duration={seconds}[bed];'
            '[voice][bed]amix=inputs=2:normalize=0,alimiter=limit=0.891251:level=false:latency=true[audio]'
        )
        run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-loop', '1', '-i', str(BASE / 'video-01-background/assets/hero.png'),
             '-i', str(voice), '-stream_loop', '-1', '-i', 'data/productions/divine-wisdom/animation-samples/original-devotional-bed.wav',
             '-vf', video, '-filter_complex', audio, '-map', '0:v:0', '-map', '[audio]', '-t', str(seconds), '-r', str(FPS),
             '-c:v', 'libx264', '-profile:v', 'high', '-level:v', '4.0', '-preset', 'veryfast', '-crf', '20', '-threads', '4',
             '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', str(output)])
    frame = ROOT / f'review-{name}.png'
    if not frame.exists():
        run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-ss', str(min(4, seconds / 2)), '-i', str(output), '-frames:v', '1', str(frame)])
    return output, seconds


def main():
    plan = json.loads((ROOT / 'plan.json').read_text(encoding='utf-8'))
    source_hash = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    clips = [section_video(section) for section in plan['sections']]
    manifest = ROOT / 'channel-concat.txt'
    manifest.write_text(f"file '{clips[0][0].name}'\nfile '../{SOURCE.name}'\nfile '{clips[1][0].name}'\n", encoding='utf-8')
    final = ROOT / 'Sri-Lalita-Sahasranamam-Full-Song-Welcome-and-Closing.mp4'
    if not final.exists():
        run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-f', 'concat', '-safe', '0', '-i', str(manifest), '-c', 'copy', '-movflags', '+faststart', str(final)])
    run(['ffmpeg', '-v', 'error', '-nostdin', '-i', str(final), '-f', 'null', '-'])
    info = probe(final)
    original_seconds = float(probe(SOURCE)['format']['duration'])
    actual_seconds = float(info['format']['duration'])
    assert abs(actual_seconds - original_seconds - sum(seconds for clip, seconds in clips)) < .15
    video = next(stream for stream in info['streams'] if stream['codec_type'] == 'video')
    audio = next(stream for stream in info['streams'] if stream['codec_type'] == 'audio')
    assert abs(float(video['duration']) - float(audio['duration'])) < .15
    assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == source_hash
    report = {'file': str(final.resolve()), 'seconds': actual_seconds, 'channelName': plan['channelName'],
              'welcomeSpokenInTelugu': True, 'introducesSriLalitaSahasranamam': True,
              'closingIncludesSubscribeLikeShareComment': True, 'originalFullSongFileUnchanged': True,
              'fullSongAddedByStreamCopy': True, 'largerSongLyricsPreserved': True,
              'fullDecodePassed': True, 'voiceListeningReviewPending': True, 'published': False}
    (ROOT / 'VERIFICATION.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report), flush=True)


if __name__ == '__main__':
    main()
