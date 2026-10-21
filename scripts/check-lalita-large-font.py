from pathlib import Path
from PIL import Image
import importlib.util
import json
import subprocess

spec = importlib.util.spec_from_file_location('full_video', Path(__file__).with_name('lalita-full-sung-v2-video.py'))
video = importlib.util.module_from_spec(spec)
spec.loader.exec_module(video)
root = video.ROOT
plan = json.loads((root / 'plan.json').read_text(encoding='utf-8'))
header = (root / 'batch-00-large.ass').read_text(encoding='utf-8').split('[Events]')[0]
events = ['[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text']
for index, unit in enumerate(plan['units']):
    text = unit['text'] + f" {unit['verse']}"
    lines = '\\N'.join(text[start:end].strip() for start, end in video.ranges(text))
    events.append(f'Dialogue: 0,{video.stamp(index)},{video.stamp(index + 1)},Caption,,0,0,0,,{lines}')
subtitle = root / 'font-fit-all-verses.ass'
subtitle.write_text(header + '\n'.join(events) + '\n', encoding='utf-8')
frames = root / 'font-fit-frames'
frames.mkdir(exist_ok=True)
if len(list(frames.glob('*.png'))) != 183:
    subprocess.run([
        'ffmpeg', '-v', 'error', '-nostdin', '-y', '-f', 'lavfi',
        '-i', 'color=c=black:s=1920x1080:r=1:d=183',
        '-vf', f"ass=filename='{subtitle.as_posix()}':fontsdir='public/fonts':shaping=complex",
        '-frames:v', '183', str(frames / '%03d.png')
    ], check=True)
reports = []
for index, path in enumerate(sorted(frames.glob('*.png'))):
    with Image.open(path) as image:
        bounds = image.convert('L').point(lambda value: 255 if value > 20 else 0).getbbox()
    assert bounds, f'Missing text in verse {index + 1}'
    assert bounds[0] >= 80 and bounds[2] <= 1840 and bounds[1] >= 740 and bounds[3] <= 1045, f'Unsafe text bounds for verse {index + 1}: {bounds}'
    reports.append({'verse': index + 1, 'pixelBounds': bounds})
report = {'verses': len(reports), 'fontSize': video.FONT_SIZE, 'actualComplexShapingRendered': True, 'allFitSafely': True, 'reports': reports}
(root / 'LARGE-FONT-FIT.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps({'verses': len(reports), 'fontSize': video.FONT_SIZE, 'actualRenderedPixelFitPassed': True}), flush=True)
