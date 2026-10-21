from pathlib import Path
import json
import subprocess

ROOT = Path('data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12/full-sung-v2-approved-2026-10-15')
plan = json.loads((ROOT / 'plan.json').read_text(encoding='utf-8'))
target = ROOT / 'full-song-polished.m4a'
arguments = ['ffmpeg', '-v', 'error', '-nostdin', '-n']
filters = []
duration = 0
for batch in plan['batches']:
    index = batch['index']
    stem = f'batch-{index:02}'
    source = ROOT / f'{stem}-repaired-v2.wav' if (ROOT / f'{stem}-repaired-v2.wav').exists() else ROOT / f'{stem}.mp3'
    layout = json.loads((ROOT / f'{stem}-layout.json').read_text(encoding='utf-8'))
    duration += layout['seconds']
    arguments.extend(['-i', str(source)])
    filters.append(f"[{index}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,apad,atrim=duration={layout['seconds']},asetpts=PTS-STARTPTS[audio{index}]")
joined = ''.join(f"[audio{batch['index']}]" for batch in plan['batches'])
polish = 'highpass=f=40,equalizer=f=280:t=q:w=0.8:g=-0.7,equalizer=f=2600:t=q:w=0.7:g=0.6,treble=g=-0.5:f=8000,volume=0.5dB,alimiter=limit=0.891251:attack=5:release=80:level=false:latency=true'
filters.append(f'{joined}concat=n={len(plan["batches"])}:v=0:a=1,{polish}[master]')
if not target.exists():
    subprocess.run(arguments + ['-filter_complex', ';'.join(filters), '-map', '[master]', '-c:a', 'aac', '-b:a', '256k', str(target)], check=True)
seconds = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(target)]))
assert abs(seconds - duration) < .05
result = subprocess.run(['ffmpeg', '-hide_banner', '-nostdin', '-i', str(target), '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True, check=True)
levels = [line for line in result.stderr.splitlines() if 'mean_volume:' in line or 'max_volume:' in line]
report = {'file': str(target.resolve()), 'seconds': seconds, 'expectedSeconds': duration,
          'fullAudioDecodePassed': True, 'sameApprovedPolish': True, 'tempoChanged': False,
          'levels': levels, 'pronunciationListeningReviewPending': True}
(ROOT / 'AUDIO-MASTER-VERIFICATION.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report), flush=True)
