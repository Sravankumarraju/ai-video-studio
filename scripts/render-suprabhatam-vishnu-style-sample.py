"""Suprabhatam sample using the saved Vishnu Sahasranamam presentation style."""
from pathlib import Path
import importlib.util
import json
import math
import re
import shutil
import subprocess

ROOT = Path('output/venkateswara-vishnu-style-sample-2026-10-22')
CHANT = Path('output/sri-venkateswara-full-approved-2026-10-20')
BOOKENDS = Path('data/productions/divine-wisdom/venkateswara/suprabhatam-2026-10-19/full-approved-natural-v3')
OUTPUT = ROOT / 'Venkateswara-Suprabhatam-Vishnu-Style-Sample-1080p.mp4'


def load_module(name, file):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(file))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


style = load_module('vishnu_style', 'package-vishnu-full.py')
prior = style.prior
style.ROOT = ROOT
style.OUTPUT = OUTPUT
original_write_ass = style.write_ass


def write_ass(path, pages, seconds, offset=0, kind=None):
    original_write_ass(path, pages, seconds, offset, kind)
    text = path.read_text(encoding='utf8').replace('శ్రీ విష్ణు సహస్రనామ స్తోత్రం', 'శ్రీ వేంకటేశ్వర సుప్రభాతం')
    path.write_text(text, encoding='utf8')


style.write_ass = write_ass


def save(name, value):
    (ROOT / f'{name}.json').write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf8')


def run(args):
    subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-n'] + args, check=True)


def framed(seconds):
    return math.ceil(seconds * 24) / 24


def main():
    ROOT.mkdir(exist_ok=True)
    for folder in ['art', 'fonts', 'audio-pieces', 'review']:
        (ROOT / folder).mkdir(exist_ok=True)
    art = {'01': '01-tirumala-sunrise', '02': '02-venkateswara-portrait', '03': '03-crown-garlands', '04': '04-lamps-temple', '07': '06-serene-closing'}
    for dest, name in art.items():
        shutil.copyfile(BOOKENDS / 'art' / f'{name}.png', ROOT / 'art' / f'{dest}.png')
    for name in ['NotoSansTelugu.ttf', 'OFL.txt']:
        shutil.copyfile(Path('public/fonts') / name, ROOT / 'fonts' / name)
    shutil.copyfile('data/branding/divine-wisdom/youtube-avatar/divine-wisdom-telugu-circle-safe.png', ROOT / 'channel-logo.png')
    selected = json.loads((CHANT / 'full-timeline.json').read_text(encoding='utf8'))['verses'][:4]
    parts = []
    offset = 0
    for name, source, seconds in [
        ('welcome', BOOKENDS / 'welcome.mp3', framed(prior.duration(BOOKENDS / 'welcome.mp3') + .2)),
        ('prayer', CHANT / 'chant-with-light-music.wav', framed(selected[-1]['end'])),
        ('closing', BOOKENDS / 'closing.mp3', framed(prior.duration(BOOKENDS / 'closing.mp3') + .3)),
    ]:
        target = ROOT / 'audio-pieces' / f'{name}.wav'
        if not target.exists():
            run(['-i', str(source), '-af', f'atrim=duration={seconds},loudnorm=I=-17:TP=-1.5:LRA=7,aresample=48000,apad,atrim=duration={seconds}', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s24le', str(target)])
        parts.append({'name': name, 'start': offset, 'end': offset + seconds, 'seconds': seconds, 'source': str(source)})
        offset += seconds
    welcome, prayer, closing = parts
    (ROOT / 'audio-concat.txt').write_text('\n'.join(f"file 'audio-pieces/{p['name']}.wav'" for p in parts) + '\n', encoding='utf8')
    if not (ROOT / 'finished-audio-master.wav').exists():
        run(['-f', 'concat', '-safe', '0', '-i', str(ROOT / 'audio-concat.txt'), '-c:a', 'copy', str(ROOT / 'finished-audio-master.wav')])
    pages = []
    for verse in selected:
        # Preserve full half-verses where a source uses extra short line breaks.
        display = re.sub(r'(?<![।॥])\n', ' ', verse['text']) + f" {verse['verse']} ॥"
        positions = [i for i, c in enumerate(display) if style.norm(c)]
        assert style.norm(display) == style.norm(''.join(w['text'] for w in verse['words']))
        words = []
        cursor = 0
        for w in verse['words']:
            length = len(style.norm(w['text']))
            assert length and w['end'] > w['start']
            words.append({**w, 'start': w['start'] + prayer['start'], 'end': w['end'] + prayer['start'], 'displayStart': positions[cursor], 'displayEnd': positions[cursor + length - 1] + 1})
            cursor += length
        assert cursor == len(positions)
        spans, size = style.layout(display)
        pages.append({'start': prayer['start'] + verse['start'], 'end': prayer['start'] + verse['end'] if verse['verse'] < 4 else prayer['end'], 'display': display, 'ranges': spans, 'fontSize': size, 'words': words, 'verse': verse['verse'], 'section': 'prayer', 'completeShlokaAlwaysVisible': True})
    for part in [welcome, closing]:
        alignment = json.loads((BOOKENDS / f"{part['name']}-alignment.json").read_text(encoding='utf8'))
        words = [{**w, 'start': w['start'] + part['start'], 'end': w['end'] + part['start']} for w in prior.aligned_words(alignment)]
        for index in range(0, len(words), 6):
            group = words[index:index + 6]
            text = ' '.join(w['text'] for w in group[:3]) + ('\n' + ' '.join(w['text'] for w in group[3:]) if len(group) > 3 else '')
            mapped = []
            cursor = 0
            for w in group:
                start = text.index(w['text'], cursor)
                cursor = start + len(w['text'])
                mapped.append({**w, 'displayStart': start, 'displayEnd': cursor})
            spans, size = style.layout(text)
            pages.append({'start': max(part['start'], group[0]['start'] - .03), 'end': words[index + 6]['start'] if index + 6 < len(words) else part['end'], 'display': text, 'ranges': spans, 'fontSize': min(76, size), 'words': mapped, 'section': part['name']})
    pages.sort(key=lambda p: p['start'])
    assert all(p['end'] > p['start'] and all(w['end'] > w['start'] for w in p['words']) for p in pages)
    scenes = [
        {'kind': 'welcome', 'image': '01', 'start': 0, 'end': welcome['end']},
        {'kind': 'prayer', 'image': '02', 'start': prayer['start'], 'end': prayer['start'] + selected[2]['start']},
        {'kind': 'prayer', 'image': '03', 'start': prayer['start'] + selected[2]['start'], 'end': prayer['start'] + selected[3]['start']},
        {'kind': 'prayer', 'image': '04', 'start': prayer['start'] + selected[3]['start'], 'end': prayer['end']},
        {'kind': 'closing', 'image': '07', 'start': closing['start'], 'end': closing['end']},
    ]
    # Match scene cuts to video frames; captions retain their recorded word times.
    for index, scene in enumerate(scenes):
        scene['index'] = index
        scene['start'] = round(scene['start'] * 24) / 24
        scene['end'] = round(scene['end'] * 24) / 24
        scene['seconds'] = scene['end'] - scene['start']
    timeline = {'seconds': offset, 'prayerStart': prayer['start'], 'prayerEnd': prayer['end'], 'audio': parts, 'scenes': scenes, 'units': selected}
    save('timeline', timeline)
    save('captions', {'pages': pages})
    save('caption-audit', {'issues': [], 'completeNumberedVerses': 4, 'fullVerseHeldOnScreen': True, 'wordHighlight': True, 'humanListeningReviewPending': True})
    write_ass(ROOT / 'telugu-captions.ass', pages, offset)
    (ROOT / 'telugu-captions.srt').write_text('\n\n'.join(f"{i + 1}\n{prior.srt_time(p['start'])} --> {prior.srt_time(p['end'])}\n{p['display']}" for i, p in enumerate(pages)) + '\n', encoding='utf8')
    save('production-notes', {'request': 'Sample first: Venkateswara Suprabhatam using Vishnu Sahasranamam style', 'styleReference': 'data/productions/divine-wisdom/vishnu-sahasranamam-2026-10-22', 'audio': 'Previously generated female Suprabhatam chant and existing Suprabhatam-specific channel welcome/closing; no new voice generation', 'visuals': 'Five saved original Venkateswara/temple illustrations', 'scope': 'Welcome, verses 1–4, channel closing. Full version not started.', 'published': False})
    print(json.dumps({'stage': 'sample-prepared', 'seconds': offset, 'scenes': len(scenes)}), flush=True)
    style.render()
    info = prior.probe(OUTPUT)
    video = next(s for s in info['streams'] if s['codec_type'] == 'video')
    assert (video['width'], video['height'], video['r_frame_rate']) == (1920, 1080, '24/1')
    assert abs(float(info['format']['duration']) - offset) < .15
    run(['-xerror', '-i', str(OUTPUT), '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', '-'])
    for name, seconds in [('welcome', 4), ('verse-1', prayer['start'] + 3), ('verse-3', prayer['start'] + selected[2]['start'] + 4), ('closing', closing['start'] + 4)]:
        image = ROOT / 'review' / f'{name}.jpg'
        if not image.exists():
            run(['-ss', str(seconds), '-i', str(OUTPUT), '-frames:v', '1', '-update', '1', str(image)])
    save('VERIFICATION', {'file': str(OUTPUT.resolve()), 'seconds': float(info['format']['duration']), 'resolution': [1920, 1080], 'fps': 24, 'fullDecodePassed': True, 'completeVerses': [1, 2, 3, 4], 'prayerWords': sum(len(v['words']) for v in selected), 'styleMatchesVishnuSahasranamam': True, 'welcomeAndClosing': True, 'newVisualRender': True, 'existingChantReused': True, 'humanPronunciationAndSyncReviewPending': True, 'published': False})
    print(json.dumps({'stage': 'sample-verified', 'seconds': offset, 'file': str(OUTPUT.resolve())}), flush=True)


if __name__ == '__main__':
    main()
