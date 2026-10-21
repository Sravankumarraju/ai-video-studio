"""Burn readable, acoustically timed Telugu captions into a new video edition."""
from pathlib import Path
import json
import subprocess
import sys
from PIL import ImageFont

ROOT = Path('data/productions/divine-wisdom/durgamma-song-2026-10-15/original-art-edition')
OUT = ROOT / 'Amma-Durgamma-Large-Telugu-Captions-1080p-v2.mp4'
SOURCE = ROOT / 'Amma-Durgamma-Nalo-Nilavamma-1080p.mp4'
END = 188.125


def run(args):
    subprocess.run(args, check=True)


def stamp(t):
    n = round(t * 100)
    return f'{n // 360000}:{n // 6000 % 60:02}:{n // 100 % 60:02}.{n % 100:02}'


def srtstamp(t):
    n = round(t * 1000)
    return f'{n // 3600000:02}:{n // 60000 % 60:02}:{n // 1000 % 60:02},{n % 1000:03}'


def prepare():
    aligned = json.loads((ROOT / 'align.json').read_text(encoding='utf8'))
    words = [w for w in aligned['words'] if w['text'].strip()]
    lines = (ROOT / 'lyrics-performed.txt').read_text(encoding='utf8').splitlines()
    captions = []
    offset = 0
    for index, line in enumerate(lines):
        n = len(line.split())
        ws = words[offset:offset+n]
        offset += n
        assert ''.join(w['text'] for w in ws) == ''.join(line.split())
        # Later lines omitted by the performed arrangement must not be squeezed
        # into the final sustained vocals by the forced aligner.
        if index >= 55:
            continue
        if index == 8:
            line = 'నాలో నిలవమ్మా!'
        if index in (14, 34):
            line = 'జయ జయ దుర్గమ్మా!'
        captions.append({'text': line, 'start': ws[0]['start'], 'end': ws[-1]['end']})
    # Anchors from Scribe's actual final-verse timestamps correct omitted lines
    # in the written lyrics. No final written chorus is present in this audio.
    captions += [
        {'start': 146.82, 'end': 149.2, 'text': 'ఇంటింట వెలిగే దీపాలలో'},
        {'start': 149.38, 'end': 152.62, 'text': 'ఆడబిడ్డ అడుగులు భయపడకుండా'},
        {'start': 153.42, 'end': 155.64, 'text': 'మన ఇంటి నుంచే మార్పు రావాలమ్మా!'},
        {'start': 156.0, 'end': 158.02, 'text': 'శ్రమించే చేతికి గౌరవమిచ్చి'},
        {'start': 158.52, 'end': 160.44, 'text': 'ఆకలి ఉన్న చోట అన్నం పంచి…'},
        {'start': 160.82, 'end': 163.22, 'text': 'ఒంటరిగా ఉన్న మనిషిని పలకరించి'},
        {'start': 163.28, 'end': 166.54, 'text': 'దుర్గమ్మా…'},
        {'start': 166.62, 'end': 169.3, 'text': 'జగదంబా…'},
        {'start': 169.36, 'end': 181.10, 'text': 'నాలో నిలవమ్మా…'},
    ]
    font = ImageFont.truetype('public/fonts/NotoSansTelugu.ttf', 104)
    for i, c in enumerate(captions):
        c['displayEnd'] = min(c['end'] + .25, captions[i+1]['start'] - .02 if i+1 < len(captions) else 181.12)
        assert c['displayEnd'] > c['start'], c
        tokens = c['text'].split()
        if font.getlength(c['text']) > 1650:
            cut = min(range(1, len(tokens)), key=lambda k: max(font.getlength(' '.join(tokens[:k])), font.getlength(' '.join(tokens[k:]))))
            c['displayText'] = ' '.join(tokens[:cut]) + r'\N' + ' '.join(tokens[cut:])
        else:
            c['displayText'] = c['text']
        assert max(font.getlength(l) for l in c['displayText'].split(r'\N')) <= 1680
    header = '''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Lyric,Noto Sans Telugu,104,&H00FFFFFF,&H00FFFFFF,&H00120D08,&H90000000,0,0,0,0,100,100,0,0,1,3,1,2,110,110,68,1
Style: Channel,Noto Sans,74,&H009EE7FF,&H009EE7FF,&H00120D08,&H90000000,1,0,0,0,100,100,0,0,1,2,1,5,60,60,40,1
Style: Telugu,Noto Sans Telugu,64,&H00FFFFFF,&H00FFFFFF,&H00120D08,&H90000000,0,0,0,0,100,100,0,0,1,2,1,5,60,60,40,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    events = [f'Dialogue: 1,{stamp(c["start"])},{stamp(c["displayEnd"])},Lyric,,0,0,0,,{c["displayText"]}' for c in captions]
    for start, end, style, y, text in [
        (.3, 4.1, 'Channel', 858, 'Divine Wisdom Telugu'),
        (.3, 4.1, 'Telugu', 970, 'ఛానల్‌కు స్వాగతం'),
        (181.2, 188.0, 'Channel', 827, 'Divine Wisdom Telugu'),
        (181.2, 188.0, 'Telugu', 917, 'సబ్‌స్క్రైబ్ చేయండి · లైక్ చేయండి'),
        (181.2, 188.0, 'Telugu', 1003, 'షేర్ చేయండి · కామెంట్ చేయండి'),
    ]:
        events.append(f'Dialogue: 1,{stamp(start)},{stamp(end)},{style},,0,0,0,,{{\\pos(960,{y})}}{text}')
    (ROOT / 'large-captions-v2.ass').write_text(header+'\n'.join(events)+'\n', encoding='utf8')
    (ROOT / 'captions-te-v2.srt').write_text('\n\n'.join(f'{i+1}\n{srtstamp(c["start"])} --> {srtstamp(c["displayEnd"])}\n'+c['displayText'].replace(r'\N','\n') for i,c in enumerate(captions))+'\n', encoding='utf8')
    (ROOT / 'caption-timing-v2.json').write_text(json.dumps({'fontSize': 104, 'captions': captions, 'timing': 'Scribe transcription and forced alignment; final verse mapped to transcription anchors', 'manualListeningVerified': False, 'unperformedWrittenFinalChorusOmitted': True}, ensure_ascii=False, indent=2), encoding='utf8')
    print(f'Prepared {len(captions)} large Telugu captions', flush=True)


def filters():
    return f"tpad=stop_mode=clone:stop_duration=7,drawbox=x=0:y=790:w=iw:h=290:color=0x100d0a:t=fill,ass=filename='{ROOT.as_posix()}/large-captions-v2.ass':fontsdir='public/fonts':shaping=complex"


def render():
    run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-i', str(SOURCE), '-map', '0:v:0', '-map', '0:a:0', '-vf', filters(), '-t', str(END), '-c:v', 'libx264', '-threads', '6', '-preset', 'veryfast', '-crf', '18', '-c:a', 'copy', '-movflags', '+faststart', str(OUT)])


def preview():
    for t in (3, 12, 46, 119, 150, 175, 185):
        run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-i', str(SOURCE), '-vf', filters()+f',select=gte(t\\,{t})', '-frames:v', '1', '-fps_mode', 'vfr', '-q:v', '2', str(ROOT / f'caption-preview-{t}.jpg')])


def verify():
    info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(OUT)]))
    v = next(s for s in info['streams'] if s['codec_type'] == 'video')
    assert (v['width'], v['height']) == (1920, 1080)
    assert abs(float(info['format']['duration']) - END) < .1
    run(['ffmpeg', '-v', 'error', '-nostdin', '-i', str(OUT), '-f', 'null', '-'])
    def audiohash(path):
        return subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-map', '0:a:0', '-c', 'copy', '-f', 'hash', '-hash', 'sha256', '-']).decode().strip()
    assert audiohash(SOURCE) == audiohash(OUT)
    report = {'video': str(OUT.resolve()), 'burnedInTeluguCaptions': True, 'fontSize': 104, 'captionCount': len(json.loads((ROOT/'caption-timing-v2.json').read_text(encoding='utf8'))['captions']), 'resolution': '1920x1080', 'seconds': float(info['format']['duration']), 'originalAudioUnchanged': True, 'fullDecodePassed': True, 'closingCardSeconds': 7, 'originalVersionPreserved': True, 'published': False}
    (ROOT / 'verification-captions-v2.json').write_text(json.dumps(report, indent=2), encoding='utf8')
    print(json.dumps(report), flush=True)


if __name__ == '__main__':
    {'prepare': prepare, 'render': render, 'preview': preview, 'verify': verify}[sys.argv[1]]()
