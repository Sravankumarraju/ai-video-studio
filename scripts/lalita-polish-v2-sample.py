from pathlib import Path
import hashlib
import json
import subprocess

BASE = Path('data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12')
SOURCE_ROOT = BASE / 'sung-album-sample-v2-2026-10-15'
SOURCE = SOURCE_ROOT / 'Lalita-Sahasranamam-New-Melody-Sample.mp4'
ROOT = BASE / 'sung-album-v2-polished-2026-10-15'


def probe(path):
    return json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(path)
    ]))


def video_hash(path):
    return subprocess.check_output([
        'ffmpeg', '-v', 'error', '-nostdin', '-i', str(path), '-map', '0:v:0',
        '-c:v', 'copy', '-f', 'hash', '-hash', 'sha256', '-'
    ]).decode().strip()


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    source_hash = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    target = ROOT / 'Lalita-Sahasranamam-V2-Gentle-Polish.mp4'
    filters = (
        'highpass=f=40,'
        'equalizer=f=280:t=q:w=0.8:g=-0.7,'
        'equalizer=f=2600:t=q:w=0.7:g=0.6,'
        'treble=g=-0.5:f=8000,'
        'volume=0.5dB,'
        'alimiter=limit=0.891251:attack=5:release=80:level=false:latency=true'
    )
    if not target.exists():
        subprocess.run([
            'ffmpeg', '-v', 'error', '-nostdin', '-n', '-i', str(SOURCE),
            '-i', str(SOURCE_ROOT / 'sample.mp3'), '-map', '0:v:0', '-map', '1:a:0',
            '-c:v', 'copy', '-af', filters, '-c:a', 'aac', '-b:a', '256k',
            '-movflags', '+faststart', str(target)
        ], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-i', str(target), '-f', 'null', '-'], check=True)
    original_info = probe(SOURCE)
    output_info = probe(target)
    assert abs(float(original_info['format']['duration']) - float(output_info['format']['duration'])) < .1
    assert video_hash(SOURCE) == video_hash(target), 'Video or caption stream changed'
    assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == source_hash, 'Original changed'
    report = {
        'sampleFile': str(target.resolve()), 'preferredOriginal': str(SOURCE.resolve()),
        'originalFileUnchanged': True, 'identicalVideoAndCaptionStream': True,
        'seconds': float(output_info['format']['duration']), 'tempoChanged': False,
        'newMelodyOrVoiceGenerated': False, 'newPaidCalls': 0,
        'changes': 'Gentle whole-mix EQ: reduce low-mid thickness, slight presence lift, soften high treble, modest gain with peak control',
        'audioFilters': filters, 'fullDecodePassed': True,
        'subjectiveImprovementUserReviewPending': True, 'fullVersionStarted': False
    }
    (ROOT / 'VERIFICATION.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report), flush=True)


if __name__ == '__main__':
    main()
