"""Rebuild the local explanation from aligned master audio; never publish."""
from pathlib import Path
import json, math, subprocess, importlib.util, re, sys

ROOT = Path('data/productions/divine-wisdom/hanuman-chalisa/verse-first-2026-10-08')
SOURCE = ROOT.parent / 'explanation-te-2026-10-06'
OUT = ROOT / 'rebuilt-2026-10-11'
OUT.mkdir(exist_ok=True)
spec = importlib.util.spec_from_file_location('hanuman_video', 'scripts/hanuman-full-video.py')
v = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v)

def run(args):
    subprocess.run(args, check=True)

def save(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')

def prepare():
    timeline = json.loads((SOURCE / 'timeline.json').read_text(encoding='utf-8'))
    scenes = timeline['scenes'][:2]
    words = [w for s in scenes for w in s['words']]
    phrases = ['మీరు ఇచ్చిన', 'మీరు జతచేసిన']
    cuts = []
    removed = set()
    for i in range(len(words) - 1):
        if words[i]['text'] + ' ' + words[i + 1]['text'] in phrases:
            cuts.append(((words[i - 1]['end'] + words[i]['start']) / 2,
                         (words[i + 1]['end'] + words[i + 2]['start']) / 2))
            removed.update([i, i + 1])
    assert len(cuts) == 3, 'Expected exactly three known editorial phrases'
    original_end = scenes[-1]['end']
    def mapped(t):
        return t - sum(max(0, min(t, b) - a) for a, b in cuts if t > a)
    retained = [{**w, 'start': mapped(w['start']), 'end': mapped(w['end'])}
                for i, w in enumerate(words) if i not in removed]
    raw_duration = mapped(original_end)
    prefix_duration = math.ceil(raw_duration * 24) / 24
    spans = []
    p = 0
    for a, b in cuts:
        spans.append((p, a))
        p = b
    spans.append((p, original_end))
    filters = [f'[0:a]atrim=start={a}:end={b},asetpts=PTS-STARTPTS[a{i}]'
               for i, (a, b) in enumerate(spans)]
    filters.append(''.join(f'[a{i}]' for i in range(len(spans))) +
                   f'concat=n={len(spans)}:v=0:a=1,apad,atrim=duration={prefix_duration}[out]')
    master = OUT / 'opening-master.wav'
    if not master.exists():
        run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-i',
             str(SOURCE / 'hanuman-chalisa-full-master.wav'), '-filter_complex',
             ';'.join(filters), '-map', '[out]', '-c:a', 'pcm_s24le', str(master)])
    pages = []
    for s in scenes:
        ws = [w for w in retained if mapped(s['start']) <= w['start'] < mapped(s['end'])]
        lines, group = [[]], []
        def close():
            nonlocal lines, group
            if group:
                pages.append({'start': group[0]['start'], 'end': group[-1]['end'] + .1,
                              'lines': lines, 'words': group})
            lines, group = [[]], []
        for w in ws:
            if lines[-1] and (len(lines[-1]) >= 5 or
                    v.FONT.getlength(' '.join(x['text'] for x in lines[-1] + [w])) > 1600):
                if len(lines) == 2:
                    close()
                else:
                    lines.append([])
            lines[-1].append(w)
            group.append(w)
            if len(group) >= 8:
                close()
        close()
    header = v.ass_header().replace('Style: Default,Noto Sans Telugu,104',
                                    'Style: Default,Noto Sans Telugu,96')
    events = []
    for p in pages:
        text = '\\N'.join(' '.join(w['text'] for w in line) for line in p['lines'])
        events.append(f'Dialogue: 0,{v.time(p["start"])},{v.time(p["end"])},Default,,0,0,0,,{text}')
        for k, w in enumerate(p['words']):
            end = min(w['end'] + .02, p['end'])
            if k + 1 < len(p['words']):
                end = min(end, p['words'][k + 1]['start'])
            text = '\\N'.join(' '.join(('{\\c&H004AD5FF&}' + x['text'] +
                    '{\\c&H00FFFFFF&}') if x is w else x['text'] for x in line) for line in p['lines'])
            events.append(f'Dialogue: 1,{v.time(w["start"])},{v.time(end)},Default,,0,0,0,,{text}')
    (OUT / 'opening.ass').write_text(header + '\n'.join(events) + '\n', encoding='utf-8')
    plan = {'source': str(SOURCE / 'hanuman-chalisa-full-master.wav'),
            'removedAudioSpans': cuts, 'retainedAudioSpans': spans,
            'originalOpeningSeconds': original_end, 'openingSeconds': prefix_duration,
            'retainedWords': retained, 'captionPages': pages,
            'remainingVideoSource': 'hanuman-chalisa-full-text-and-telugu-explanation-1080p.mp4',
            'remainderStart': original_end, 'paidGenerations': 0}
    save('BUILD_PLAN.json', plan)
    def stamp(t):
        n = round(t * 1000)
        return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
    def seconds(t):
        h, m, s = t.replace(',', '.').split(':')
        return int(h) * 3600 + int(m) * 60 + float(s)
    cues = [(p['start'], p['end'], '\n'.join(' '.join(w['text'] for w in line)
             for line in p['lines'])) for p in pages]
    old_srt = (ROOT / 'hanuman-chalisa-full-text-and-telugu-explanation.srt').read_text(encoding='utf-8-sig')
    shift = original_end - prefix_duration
    for block in re.split(r'\n\s*\n', old_srt.strip()):
        lines = block.splitlines()
        if len(lines) < 3:
            continue
        a, b = [seconds(x.strip()) for x in lines[1].split('-->')]
        if a >= original_end - .002:
            cues.append((a - shift, b - shift, '\n'.join(lines[2:])))
    (OUT / 'hanuman-chalisa-explanation-rebuilt.srt').write_text('\n\n'.join(
        f'{i+1}\n{stamp(a)} --> {stamp(b)}\n{text}' for i, (a, b, text) in enumerate(cues)
    ) + '\n', encoding='utf-8')
    prefix = OUT / 'opening-1080p.mp4'
    if not prefix.exists():
        run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-loop', '1', '-framerate', '24',
             '-i', str(ROOT.parent / 'hanuman-temple-hero-v1.png'), '-i', str(master),
             '-vf', f'scale=1920:1080,setsar=1,subtitles={OUT.as_posix()}/opening.ass:fontsdir=public/fonts',
             '-t', str(prefix_duration), '-c:v', 'libx264', '-threads', '6', '-preset',
             'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a',
             '256k', '-ar', '48000', '-ac', '2', str(prefix)])
    return plan

def build(plan):
    target = OUT / 'hanuman-chalisa-explanation-rebuilt-1080p.mp4'
    if not target.exists():
        # Accurate input seeking decodes to the first verse frame. Re-encode the
        # join once so video and audio share one timeline and keyframe structure.
        run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-i', str(OUT / 'opening-1080p.mp4'),
             '-ss', str(plan['remainderStart']), '-i', str(ROOT / plan['remainingVideoSource']),
             '-filter_complex', '[0:v]setpts=PTS-STARTPTS[v0];[0:a]asetpts=PTS-STARTPTS[a0];'
             '[1:v]setpts=PTS-STARTPTS[v1];[1:a]asetpts=PTS-STARTPTS[a1];'
             '[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]',
             '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-threads', '6', '-preset',
             'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', '24', '-c:a', 'aac',
             '-b:a', '256k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', str(target)])
    return target

def silence(file):
    p = subprocess.run(['ffmpeg', '-hide_banner', '-nostdin', '-i', str(file), '-vn',
                        '-af', 'silencedetect=noise=-45dB:d=1.5', '-f', 'null', '-'],
                       capture_output=True, text=True, check=True)
    return [line.split('] ', 1)[-1] for line in p.stderr.splitlines() if 'silence_' in line]

def verify(target, plan):
    import numpy as np
    def decoded(file):
        p = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(file), '-vn', '-ac', '1',
                            '-ar', '48000', '-f', 'f32le', '-'], capture_output=True, check=True)
        return np.frombuffer(p.stdout, dtype=np.float32)
    source_audio = decoded(plan['source'])
    opening_audio = decoded(OUT / 'opening-master.wav')
    correlations = []
    for w in plan['retainedWords']:
        elapsed = 0
        for a, b in plan['retainedAudioSpans']:
            if elapsed <= w['start'] < elapsed + b - a:
                original_start = a + w['start'] - elapsed
                break
            elapsed += b - a
        i, k = round(w['start'] * 48000), round(original_start * 48000)
        n = round((w['end'] - w['start']) * 48000)
        x, y = source_audio[k:k+n], opening_audio[i:i+n]
        correlations.append(float(np.corrcoef(x, y)[0, 1]))
    assert min(correlations) > .999, 'Word timing does not match retained source audio'
    baseline = silence(ROOT / 'hanuman-chalisa-natural-explanation-final-1080p.mp4')
    assert baseline, 'Regression check must reproduce the old failure'
    gaps = silence(target)
    assert not gaps, f'Rebuilt file has long silent gaps: {gaps}'
    run(['ffmpeg', '-v', 'error', '-nostdin', '-i', str(target), '-f', 'null', '-'])
    info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams',
                                            '-show_format', '-of', 'json', str(target)]))
    video = next(s for s in info['streams'] if s['codec_type'] == 'video')
    assert (video['width'], video['height']) == (1920, 1080)
    expected = 2102.291667 - plan['remainderStart'] + plan['openingSeconds']
    assert abs(float(info['format']['duration']) - expected) < .15
    for t in [6, 12, 20, 49, 56, 70, 1000, 2090]:
        run(['ffmpeg', '-v', 'error', '-nostdin', '-y', '-ss', str(t), '-i', str(target),
             '-frames:v', '1', '-q:v', '2', str(OUT / f'review-{t}s.jpg')])
    if not (OUT / 'opening-review-80s.mp4').exists():
        run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-i', str(target), '-t', '80',
             '-c', 'copy', str(OUT / 'opening-review-80s.mp4')])
    report = {'video': str(target.resolve()), 'bytes': target.stat().st_size,
              'durationSeconds': float(info['format']['duration']), 'resolution': '1920x1080',
              'oldFileFailsSilenceCheck': True, 'oldSilenceEvents': baseline,
              'newLongSilentGaps': gaps, 'fullDecodePassed': True,
              'openingCaptionTimesDerivedFromSameAudioCuts': True,
              'openingWordsVerifiedAgainstMaster': len(correlations),
              'minOpeningWordAudioCorrelation': min(correlations),
              'remainingVerseSequenceAndAudioReusedFromV3': True,
              'fullIndependentListeningReview': False, 'uploaded': False}
    save('VERIFICATION.json', report)
    print(json.dumps(report), flush=True)

if __name__ == '__main__':
    plan = prepare()
    print(json.dumps({'phase': 'opening rebuilt', 'seconds': plan['openingSeconds']}), flush=True)
    target = build(plan)
    verify(target, plan)
