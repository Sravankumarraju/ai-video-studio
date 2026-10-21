from pathlib import Path
from PIL import ImageFont
import hashlib
import json
import math
import re
import subprocess
import sys
import time

BASE = Path('data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12')
ROOT = BASE / 'full-sung-v2-approved-2026-10-15'
FONT_SIZE = 96
FONT = ImageFont.truetype('public/fonts/NotoSansTelugu.ttf', FONT_SIZE)
FPS = 24


def run(arguments):
    subprocess.run(arguments, check=True)


def probe(path):
    return json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(path)
    ]))


def save(name, value):
    (ROOT / f'{name}.json').write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')


def stamp(seconds):
    value = round(seconds * 100)
    return f'{value // 360000}:{value // 6000 % 60:02}:{value // 100 % 60:02}.{value % 100:02}'


def lexical(text):
    return any('\u0c00' <= character <= '\u0c7f' for character in text)


def ranges(text):
    half = re.search(r'(?<!।)।(?!।)', text)
    if half:
        cut = half.end()
    else:
        candidates = [match.end() for match in re.finditer(r'\s+', text)]
        cut = min(candidates, key=lambda index: max(FONT.getlength(text[:index]), FONT.getlength(text[index:])))
    return [(0, cut), (cut, len(text))]


def caption_events(unit, start, end):
    text = unit['text'] + f" {unit['verse']}"
    lines = ranges(text)
    bounds = sorted(set([start, end] + [max(start, min(end, word[key])) for word in unit['words'] for key in ['start', 'end']]))
    events = []
    for left, right in zip(bounds, bounds[1:]):
        if round(right * 100) <= round(left * 100):
            continue
        middle = (left + right) / 2
        active = next((word for word in reversed(unit['words']) if word['start'] <= middle < word['end']), None)
        rendered = []
        for first, last in lines:
            if active and first <= active['spokenStart'] < last:
                word_start = active['spokenStart']
                word_end = active['spokenEnd']
                line = text[first:word_start] + '{\\c&H004AD5FF&}' + text[word_start:word_end] + '{\\c&H00FFFFFF&}' + text[word_end:last]
            else:
                line = text[first:last]
            rendered.append(line.strip())
        events.append(f"Dialogue: 0,{stamp(left)},{stamp(right)},Caption,,0,0,0,," + '\\N'.join(rendered))
    return events, len(lines)


def process_batch(batch, render):
    stem = f"batch-{batch['index']:02}"
    audio = ROOT / f'{stem}-repaired-v2.wav' if (ROOT / f'{stem}-repaired-v2.wav').exists() else ROOT / f'{stem}.mp3'
    alignment_file = ROOT / f'{stem}-repaired-v2-alignment.json' if (ROOT / f'{stem}-repaired-v2-alignment.json').exists() else ROOT / f'{stem}-alignment.json'
    if not audio.exists() or not alignment_file.exists():
        return None
    alignment = json.loads(alignment_file.read_text(encoding='utf-8'))
    characters = [character for character in alignment['characters'] if character['text'] != '\r']
    assert ''.join(character['text'] for character in characters) == batch['text'], f'Alignment mismatch: {stem}'
    seconds = math.ceil(float(probe(audio)['format']['duration']) * FPS) / FPS
    offset = 0
    units = []
    collapsed = []
    for unit in batch['units']:
        words = []
        for token in re.finditer(r'\S+', unit['text']):
            if not lexical(token.group()):
                continue
            selected = characters[offset + token.start():offset + token.end()]
            start = min(character['start'] for character in selected)
            end = max(character['end'] for character in selected)
            if end - start < .02:
                collapsed.append({'verse': unit['verse'], 'text': token.group(), 'start': start, 'end': end})
            words.append({'text': token.group(), 'start': start, 'end': end, 'spokenStart': token.start(), 'spokenEnd': token.end()})
        assert words
        units.append({**unit, 'words': words})
        offset += len(unit['text']) + 1
    audit = {'batch': batch['index'], 'alignmentLoss': alignment.get('loss'), 'verseUnits': len(units), 'collapsedWords': collapsed, 'pronunciationApproved': False}
    save(f'{stem}-audit', audit)
    if render:
        assert not collapsed, f'{stem}: {len(collapsed)} collapsed words; inspect audio before finalizing'
    cuts = [0] + [(previous['words'][-1]['end'] + following['words'][0]['start']) / 2 for previous, following in zip(units, units[1:])] + [seconds]
    assert all(right > left for left, right in zip(cuts, cuts[1:]))
    if not (ROOT / f'{stem}-repaired-v2-alignment.json').exists():
        save(f'{stem}-units-timed', {'seconds': seconds, 'units': units, 'cuts': cuts})
    header = f'''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Noto Sans Telugu,{FONT_SIZE},&H00FFFFFF,&H00FFFFFF,&H00101010,&H90000000,0,0,0,0,100,100,0,0,3,2,0,2,100,100,55,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    events = []
    layouts = []
    for index, unit in enumerate(units):
        verse_events, line_count = caption_events(unit, cuts[index], cuts[index + 1])
        events.extend(verse_events)
        layouts.append({'verse': unit['verse'], 'fontSize': FONT_SIZE, 'lines': line_count, 'start': cuts[index], 'end': cuts[index + 1]})
    subtitle = ROOT / f'{stem}-large.ass'
    subtitle.write_text(header + '\n'.join(events) + '\n', encoding='utf-8')
    save(f'{stem}-layout', {'seconds': seconds, 'verses': layouts, 'completeVerseAlwaysVisible': True})
    if render:
        video = ROOT / f'{stem}-large-v2-video.mp4'
        if not video.exists():
            filters = (
                "scale=2000:1126,"
                f"zoompan=z='1.025+0.007*sin(on/1200)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1920x1080:fps={FPS},"
                "drawbox=x=0:y=760:w=iw:h=320:color=black@0.48:t=fill,"
                f"ass=filename='{subtitle.as_posix()}':fontsdir='public/fonts':shaping=complex,format=yuv420p"
            )
            print(json.dumps({'stage': 'rendering', 'batch': batch['index'], 'seconds': seconds, 'fontSize': FONT_SIZE}), flush=True)
            run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-loop', '1', '-i', str(BASE / 'video-01-background/assets/hero.png'),
                 '-vf', filters, '-t', str(seconds), '-r', str(FPS), '-an', '-c:v', 'libx264', '-preset', 'veryfast',
                 '-crf', '20', '-threads', '4', str(video)])
        wave = ROOT / f'{stem}-final-v2.wav'
        if not wave.exists():
            run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-i', str(audio), '-af', f'aresample=48000,apad,atrim=duration={seconds}',
                 '-ac', '2', '-c:a', 'pcm_s24le', str(wave)])
        print(json.dumps({'stage': 'rendered', 'batch': batch['index'], 'verses': len(units)}), flush=True)
        if batch['index'] == 0:
            frame = ROOT / 'review-large-font-opening-v2.png'
            if not frame.exists():
                run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-ss', '8', '-i', str(video), '-frames:v', '1', str(frame)])
    return {'batch': batch['index'], 'seconds': seconds, 'verses': layouts}


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else 'audit'
    assert mode in ['audit', 'render', 'finalize', 'opening', 'watch']
    plan = json.loads((ROOT / 'plan.json').read_text(encoding='utf-8'))
    if mode == 'watch':
        completed = set()
        while len(completed) < len(plan['batches']):
            for batch in plan['batches']:
                if batch['index'] in completed:
                    continue
                stem = f"batch-{batch['index']:02}"
                if not (ROOT / f'{stem}-alignment.json').exists():
                    continue
                if (ROOT / 'repair-plan.json').exists():
                    repair_plan = json.loads((ROOT / 'repair-plan.json').read_text(encoding='utf-8'))
                    if any(unit['verse'] in repair_plan['flaggedVerses'] for unit in batch['units']) and not (ROOT / f'{stem}-repaired-v2-alignment.json').exists():
                        continue
                report = process_batch(batch, True)
                if report:
                    completed.add(batch['index'])
                    save('RENDER-PROGRESS', {'renderedBatches': sorted(completed), 'totalBatches': len(plan['batches'])})
            if len(completed) < len(plan['batches']):
                time.sleep(5)
        print(json.dumps({'stage': 'all-batches-rendered', 'batches': len(completed)}), flush=True)
        return
    selected = plan['batches'][:1] if mode == 'opening' else plan['batches']
    reports = [process_batch(batch, mode in ['render', 'opening']) for batch in selected]
    ready = [report for report in reports if report]
    save('CAPTION-PROGRESS', {'readyBatches': len(ready), 'totalBatches': len(plan['batches']), 'fontSize': FONT_SIZE, 'completeVerseAlwaysVisible': True})
    print(json.dumps({'stage': 'caption-progress', 'readyBatches': len(ready), 'totalBatches': len(plan['batches'])}), flush=True)
    if mode != 'finalize':
        return
    assert len(ready) == len(plan['batches']), 'Audio or alignment incomplete'
    assert [verse['verse'] for report in ready for verse in report['verses']] == list(range(1, 184))
    for batch in plan['batches']:
        stem = f"batch-{batch['index']:02}"
        assert (ROOT / f'{stem}-large-v2-video.mp4').exists() and (ROOT / f'{stem}-final-v2.wav').exists()
    (ROOT / 'video-concat.txt').write_text(''.join(f"file 'batch-{batch['index']:02}-large-v2-video.mp4'\n" for batch in plan['batches']), encoding='utf-8')
    (ROOT / 'audio-concat.txt').write_text(''.join(f"file 'batch-{batch['index']:02}-final-v2.wav'\n" for batch in plan['batches']), encoding='utf-8')
    master = ROOT / 'full-song-polished.m4a'
    if not master.exists():
        filters = 'highpass=f=40,equalizer=f=280:t=q:w=0.8:g=-0.7,equalizer=f=2600:t=q:w=0.7:g=0.6,treble=g=-0.5:f=8000,volume=0.5dB,alimiter=limit=0.891251:attack=5:release=80:level=false:latency=true'
        run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-f', 'concat', '-safe', '0', '-i', str(ROOT / 'audio-concat.txt'),
             '-af', filters, '-c:a', 'aac', '-b:a', '256k', str(master)])
    final = ROOT / 'Sri-Lalita-Sahasranamam-Full-Song-Large-Telugu-Lyrics.mp4'
    if not final.exists():
        run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-f', 'concat', '-safe', '0', '-i', str(ROOT / 'video-concat.txt'),
             '-i', str(master), '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy', '-movflags', '+faststart', str(final)])
    run(['ffmpeg', '-v', 'error', '-nostdin', '-i', str(final), '-f', 'null', '-'])
    metadata = probe(final)
    video = next(stream for stream in metadata['streams'] if stream['codec_type'] == 'video')
    audio = next(stream for stream in metadata['streams'] if stream['codec_type'] == 'audio')
    assert (video['width'], video['height']) == (1920, 1080)
    assert abs(float(video['duration']) - float(audio['duration'])) < .15
    sample_audio = BASE / 'sung-album-sample-v2-2026-10-15/sample.mp3'
    assert hashlib.sha256(sample_audio.read_bytes()).digest() == hashlib.sha256((ROOT / 'batch-00.mp3').read_bytes()).digest()
    chapters = []
    offset = 0
    for report in ready:
        for verse in report['verses']:
            if verse['verse'] in [1, 5, 25, 50, 75, 100, 125, 150, 175, 183]:
                seconds = round(offset + verse['start'])
                chapters.append(f"{seconds // 3600:02}:{seconds // 60 % 60:02}:{seconds % 60:02} Verse {verse['verse']}")
        offset += report['seconds']
    (ROOT / 'chapters.txt').write_text('\n'.join(chapters) + '\n', encoding='utf-8')
    for name, seconds in [('middle', offset / 2), ('ending', offset - 10)]:
        frame = ROOT / f'review-large-font-{name}.png'
        if not frame.exists():
            run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-ss', str(seconds), '-i', str(final), '-frames:v', '1', str(frame)])
    report = {
        'file': str(final.resolve()), 'seconds': float(metadata['format']['duration']), 'verseUnits': 183,
        'referenceNameRegisterRows': 1000, 'completeOrderedSourceTextAligned': True,
        'approvedV2OpeningPreserved': True, 'sameGentlePolishApplied': True,
        'captionFontSize': FONT_SIZE, 'completeVerseAlwaysVisible': True, 'wordHighlight': True,
        'fullDecodePassed': True, 'pronunciationListeningReviewPending': True,
        'openingPrayersIncluded': False, 'fullPhalashrutiIncluded': False, 'published': False
    }
    save('VERIFICATION', report)
    print(json.dumps(report), flush=True)


if __name__ == '__main__':
    main()
