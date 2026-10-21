from pathlib import Path
import importlib.util
import json
import re
import subprocess

BASE = Path('data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12')
ROOT = BASE / 'sung-76bpm-sample-v4-2026-10-15'
FPS = 24
spec = importlib.util.spec_from_file_location('full_caps', Path(__file__).with_name('full-shloka-captions.py'))
captions = importlib.util.module_from_spec(spec)
spec.loader.exec_module(captions)


def run(arguments):
    subprocess.run(arguments, check=True)


def probe(path):
    return json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(path)
    ]))


def main():
    plan = json.loads((ROOT / 'plan.json').read_text(encoding='utf-8'))
    alignment = json.loads((ROOT / 'alignment.json').read_text(encoding='utf-8'))
    characters = [character for character in alignment['characters'] if character['text'] != '\r']
    assert ''.join(character['text'] for character in characters) == plan['text'], 'Alignment text mismatch'
    seconds = float(probe(ROOT / 'sample.mp3')['format']['duration'])
    units = []
    offset = 0
    for unit in plan['units']:
        words = []
        for match in re.finditer(r'\S+', unit['text']):
            if not any(captions.telugu_character(character) for character in match.group()):
                continue
            selected = characters[offset + match.start():offset + match.end()]
            start = min(character['start'] for character in selected)
            end = max(character['end'] for character in selected)
            assert end - start >= .02, 'Collapsed sung word timing; inspect the sample'
            words.append({
                'text': match.group(), 'start': start, 'end': end,
                'spokenStart': match.start(), 'spokenEnd': match.end()
            })
        units.append({**unit, 'words': words})
        offset += len(unit['text']) + 1
    cuts = [0] + [
        (previous['words'][-1]['end'] + following['words'][0]['start']) / 2
        for previous, following in zip(units, units[1:])
    ] + [seconds]
    cuts = [round(value * FPS) / FPS for value in cuts]
    assert all(end > start for start, end in zip(cuts, cuts[1:])), 'Invalid verse boundaries'
    reports = []
    concat = []
    for index, unit in enumerate(units):
        start = cuts[index]
        duration = cuts[index + 1] - start
        words = [{**word, 'start': word['start'] - start, 'end': word['end'] - start} for word in unit['words']]
        subtitle = ROOT / f'captions-{index:02}.ass'
        reports.append(captions.write_full_shloka(
            subtitle, unit['text'], unit['text'], words, duration, unit['verse'], font_size=84
        ))
        clip = ROOT / f'video-{index:02}.mp4'
        if not clip.exists():
            filters = (
                "scale=2000:1126,"
                f"zoompan=z='1.025+on*0.000018':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1920x1080:fps={FPS},"
                "drawbox=x=0:y=800:w=iw:h=280:color=black@0.5:t=fill,"
                f"ass=filename='{subtitle.as_posix()}':fontsdir='public/fonts':shaping=complex,format=yuv420p"
            )
            run([
                'ffmpeg', '-v', 'error', '-nostdin', '-n', '-loop', '1',
                '-i', str(BASE / 'video-01-background/assets/hero.png'),
                '-vf', filters, '-t', str(duration), '-r', str(FPS), '-an',
                '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-threads', '2', str(clip)
            ])
        concat.append(f"file 'video-{index:02}.mp4'")
    (ROOT / 'video-concat.txt').write_text('\n'.join(concat) + '\n', encoding='utf-8')
    final = ROOT / 'Lalita-Sahasranamam-New-Melody-Sample.mp4'
    if not final.exists():
        run([
            'ffmpeg', '-v', 'error', '-nostdin', '-n', '-f', 'concat', '-safe', '0',
            '-i', str(ROOT / 'video-concat.txt'), '-i', str(ROOT / 'sample.mp3'),
            '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', str(seconds),
            '-movflags', '+faststart', str(final)
        ])
    run(['ffmpeg', '-v', 'error', '-nostdin', '-i', str(final), '-f', 'null', '-'])
    metadata = probe(final)
    video = next(stream for stream in metadata['streams'] if stream['codec_type'] == 'video')
    audio = next(stream for stream in metadata['streams'] if stream['codec_type'] == 'audio')
    assert (video['width'], video['height']) == (1920, 1080)
    assert audio['codec_name'] == 'aac'
    for index in [0, 2]:
        frame = ROOT / f'review-{index:02}.png'
        if not frame.exists():
            run([
                'ffmpeg', '-v', 'error', '-nostdin', '-n', '-ss', str((cuts[index] + cuts[index + 1]) / 2),
                '-i', str(final), '-frames:v', '1', str(frame)
            ])
    report = {
        'sampleFile': str(final.resolve()), 'seconds': seconds, 'verses': len(units),
        'musicDirection': plan['musicDirection'], 'fullDecodePassed': True,
        'fullShlokaVisible': True, 'wordHighlight': True, 'captionChecks': reports,
        'alignmentLoss': alignment.get('loss'), 'pronunciationApproved': False,
        'humanListeningReviewPending': True, 'fullVersionApproved': False,
        'fullVersionStarted': False, 'published': False
    }
    (ROOT / 'VERIFICATION.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report), flush=True)


if __name__ == '__main__':
    main()
