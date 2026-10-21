"""Clean artwork plus one shaped caption per region; retain verified audio."""
from pathlib import Path
import json, math, subprocess, sys, importlib.util, shutil
from PIL import ImageFont, Image

ROOT = Path('data/productions/divine-wisdom/hanuman-chalisa/verse-first-2026-10-08')
PREVIOUS = ROOT / 'rebuilt-2026-10-11'
OUT = ROOT / 'clear-telugu-2026-10-11'
OUT.mkdir(exist_ok=True)
(OUT / 'artwork').mkdir(exist_ok=True)
(OUT / 'fonts').mkdir(exist_ok=True)
for font_path in Path('public/fonts').glob('*.ttf'):
    shutil.copyfile(font_path, OUT / 'fonts' / font_path.name)
FONT = ImageFont.truetype('public/fonts/NotoSansTelugu.ttf', 88)
plan = json.loads((PREVIOUS / 'BUILD_PLAN.json').read_text(encoding='utf-8'))
project = json.loads((ROOT / 'PROJECT_V3.json').read_text(encoding='utf-8'))
doc = project['document']
scenes = {s['id']: s for s in doc['scenes']}
assets = {a['id']: a['name'] for a in project['assets']}
variant = next(v for v in doc['variants'] if v['id'] == 'hanuman-recitation-persistent-verse-v3')
spec = importlib.util.spec_from_file_location('hv', 'scripts/hanuman-full-video.py')
v = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v)

def run(args):
    subprocess.run(args, check=True)

def save(name, data):
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

def wrap(words, maximum=1560, max_words=7):
    lines = [[]]
    for w in words:
        if lines[-1] and (len(lines[-1]) >= max_words or
                FONT.getlength(' '.join(x['text'] for x in lines[-1] + [w])) > maximum):
            lines.append([])
        lines[-1].append(w)
    return lines

def pages(words, start, end):
    # Reflow from individual aligned words; old page breaks and overlays are discarded.
    lines = wrap(words)
    result = []
    for i in range(0, len(lines), 2):
        group = lines[i:i+2]
        ws = sum(group, [])
        if ws:
            result.append({'start': max(start, ws[0]['start']),
                           'end': min(end, ws[-1]['end'] + .1),
                           'lines': group, 'words': ws})
    for i in range(len(result)-1):
        result[i]['end'] = min(result[i]['end'], result[i+1]['start'])
    return result

def prepare():
    original_opening = plan['remainderStart']
    shift = original_opening - plan['openingSeconds']
    old_t = 0
    visual = []
    caption_pages = []
    held = []
    for i, sid in enumerate(variant['sceneIds']):
        s = scenes[sid]
        original_start = old_t
        old_t += s['duration']
        if i < 2:
            def mapped(t):
                return t - sum(max(0, min(t, b) - a) for a, b in plan['removedAudioSpans'] if t > a)
            start, end = mapped(original_start), mapped(old_t)
            if i == 1:
                end = plan['openingSeconds']
            words = [w for w in plan['retainedWords'] if start <= w['start'] < end]
        else:
            start, end = original_start - shift, old_t - shift
            words = []
            if sid.startswith('hanuman-explanation-') and i > 0:
                previous_id = variant['sceneIds'][i-1]
                if previous_id.replace('hanuman-verse-card-', '') == sid.replace('hanuman-explanation-', ''):
                    # Hold the complete prayer above its matching explanation.
                    held[-1]['end'] = end
            for c in s['captions']:
                if c.get('display') == 'full-verse':
                    held.append({'start': start, 'end': end,
                                 'text': c['text'].replace('\n', ' ')})
                else:
                    words += [{**w, 'start': start + w['start'], 'end': start + w['end']}
                              for w in c.get('words', [])]
        # Deduplicate words by their source time/text; reject invalid time ranges.
        unique = {(round(w['start'], 6), w['text']): w for w in words}
        words = sorted(unique.values(), key=lambda w: w['start'])
        assert all(w['end'] > w['start'] for w in words)
        caption_pages.extend(pages(words, start, end))
        visual.append({'start': start, 'end': end, 'image': assets[s['assetId']]})
    assert abs(visual[-1]['end'] - 2100) < .1
    # Still image duration is rounded only at the final video output; audio stays untouched.
    entries = ['ffconcat version 1.0']
    for s in visual:
        source_art = ROOT.parent / s['image']
        art_path = OUT / 'artwork' / s['image']
        if not art_path.exists():
            with Image.open(source_art) as im:
                im.convert('RGB').resize((1920, 1080), Image.Resampling.LANCZOS).save(art_path)
        art = art_path.resolve().as_posix()
        # Identical pixel format and dimensions prevent filter reinitialization
        # from discarding the initial held frames in a sparse image concat.
        entries += [f"file '{art}'", 'option framerate 24', f"duration {s['end'] - s['start']:.9f}"]
    entries += [entries[-3], 'option framerate 24']
    (OUT / 'artwork.ffconcat').write_text('\n'.join(entries) + '\n', encoding='utf-8')
    header = '''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Narration,Noto Sans Telugu,88,&H00FFFFFF,&H00FFFFFF,&H00101010,&H80000000,0,0,0,0,100,100,0,0,1,2,0,2,140,140,80,1
Style: Verse,Noto Sans Telugu,88,&H00FFFFFF,&H00FFFFFF,&H00101010,&H80000000,0,0,0,0,100,100,0,0,1,2,0,5,140,140,80,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    events, intervals = [], []
    def event(a, b, style, text, pos):
        a, b = round(a*100)/100, round(b*100)/100
        if b <= a:
            return
        # Explicit position disables libass automatic collision relocation.
        events.append(f'Dialogue: 0,{v.time(a)},{v.time(b)},{style},,0,0,0,,{{\\pos(960,{pos})\\fsp0}}{text}')
        intervals.append((a, b, style))
    for p in caption_pages:
        boundaries = sorted(set([p['start'], p['end']] +
            [max(p['start'], min(p['end'], t)) for w in p['words'] for t in (w['start'], w['end'])]))
        for a, b in zip(boundaries, boundaries[1:]):
            active = next((w for w in p['words'] if w['start'] <= (a+b)/2 < w['end']), None)
            text = '\\N'.join(' '.join(('{\\c&H004AD5FF&}' + w['text'] +
                   '{\\c&H00FFFFFF&}') if w is active else w['text'] for w in line) for line in p['lines'])
            event(a, b, 'Narration', text, 990)
    for p in held:
        lines = wrap([{'text': w} for w in p['text'].split()], max_words=99)
        # Keep full traditional verse in a separate fixed area above the explanation.
        size = 88
        if len(lines) > 3:
            size = 64
            small = ImageFont.truetype('public/fonts/NotoSansTelugu.ttf', size)
            lines = [[]]
            for word in p['text'].split():
                if lines[-1] and small.getlength(' '.join(lines[-1]+[word])) > 1580:
                    lines.append([])
                lines[-1].append(word)
            text = '\\N'.join(' '.join(line) for line in lines)
        else:
            text = '\\N'.join(' '.join(w['text'] for w in line) for line in lines)
        assert len(lines) <= 4, 'Full verse must fit without entering narration area'
        event(p['start'], p['end'], 'Verse', f'{{\\fs{size}}}' + text, 480)
    # Regression: at most one dialogue per region at every timestamp.
    for style in ['Narration', 'Verse']:
        spans = sorted((a, b) for a, b, s in intervals if s == style)
        assert all(b <= c for (a,b),(c,d) in zip(spans, spans[1:])), f'{style} overlaps'
    (OUT / 'clear.ass').write_text(header + '\n'.join(events) + '\n', encoding='utf-8')
    def stamp(t):
        n = round(t * 1000)
        return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
    (OUT / 'clear-telugu.srt').write_text('\n\n'.join(
        f'{i+1}\n{stamp(p["start"])} --> {stamp(p["end"])}\n' +
        '\n'.join(' '.join(w['text'] for w in line) for line in p['lines'])
        for i, p in enumerate(caption_pages)) + '\n', encoding='utf-8')
    save('CAPTION_LAYOUT.json', {'narrationPages': caption_pages, 'heldVerses': held,
         'visualScenes': visual, 'duplicateCaptionIntervals': 0,
         'shaping': 'complex', 'font': 'Noto Sans Telugu', 'fontSize': 88,
         'narrationPositionY': 990, 'versePositionY': 480})
    print(json.dumps({'phase': 'layout verified', 'events': len(events), 'heldVerses': len(held)}), flush=True)

def render(preview=False):
    target = OUT / ('clear-telugu-preview-85s-final.mp4' if preview else 'hanuman-chalisa-clear-telugu-1080p.mp4')
    if not target.exists():
        run(['ffmpeg', '-v', 'warning', '-nostdin', '-n', '-f', 'concat', '-safe', '0',
             '-i', str(OUT / 'artwork.ffconcat'), '-i',
             str(PREVIOUS / 'hanuman-chalisa-explanation-rebuilt-1080p.mp4'),
             '-map', '0:v', '-map', '1:a', '-vf',
             f'fps=24,setsar=1,ass={OUT.as_posix()}/clear.ass:fontsdir={OUT.as_posix()}/fonts:shaping=complex',
             '-t', '85' if preview else '2100', '-c:v', 'libx264', '-threads', '6',
             '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'copy',
             '-movflags', '+faststart', str(target)])
    for t in [2, 6, 12, 20, 49, 60, 70, 80]:
        run(['ffmpeg', '-v', 'error', '-nostdin', '-y', '-ss', str(t), '-i', str(target),
             '-frames:v', '1', '-q:v', '2', str(OUT / f'review-{t}s.jpg')])
    print(json.dumps({'phase': 'rendered', 'file': str(target)}), flush=True)
    return target

if __name__ == '__main__':
    prepare()
    render('--preview' in sys.argv)
