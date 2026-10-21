from pathlib import Path
import json
import subprocess

BASE = Path('data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12')
SOURCE = BASE / 'sung-76bpm-sample-v4-2026-10-15/Lalita-Sahasranamam-New-Melody-Sample.mp4'
ROOT = BASE / 'sung-faster-sample-v5-2026-10-15'
SPEED = 1.10


def probe(path):
    return json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(path)
    ]))


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    target = ROOT / 'Lalita-Sahasranamam-Faster-Sample.mp4'
    if not target.exists():
        subprocess.run([
            'ffmpeg', '-v', 'error', '-nostdin', '-n', '-i', str(SOURCE),
            '-filter_complex',
            f'[0:v]setpts=(PTS-STARTPTS)/{SPEED},fps=24[video];'
            f'[0:a]asetpts=PTS-STARTPTS,rubberband=tempo={SPEED}:pitch=1[audio]',
            '-map', '[video]', '-map', '[audio]', '-c:v', 'libx264',
            '-preset', 'veryfast', '-crf', '18', '-threads', '2',
            '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', str(target)
        ], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-i', str(target), '-f', 'null', '-'], check=True)
    source_info = probe(SOURCE)
    output_info = probe(target)
    source_seconds = float(source_info['format']['duration'])
    seconds = float(output_info['format']['duration'])
    assert abs(seconds - source_seconds / SPEED) < .15
    video = next(stream for stream in output_info['streams'] if stream['codec_type'] == 'video')
    audio = next(stream for stream in output_info['streams'] if stream['codec_type'] == 'audio')
    assert (video['width'], video['height']) == (1920, 1080)
    assert abs(float(video['duration']) - float(audio['duration'])) < .15
    frame = ROOT / 'review.png'
    if not frame.exists():
        subprocess.run([
            'ffmpeg', '-v', 'error', '-nostdin', '-n', '-ss', '12', '-i', str(target),
            '-frames:v', '1', str(frame)
        ], check=True)
    report = {
        'sampleFile': str(target.resolve()), 'source': str(SOURCE.resolve()),
        'speedFactor': SPEED, 'sourceSeconds': source_seconds, 'seconds': seconds,
        'pitchPreserved': True, 'voiceAndMusicSpedTogether': True,
        'bakedCaptionTimingSpedWithVideo': True, 'fullDecodePassed': True,
        'newAudioGenerationCalls': 0, 'fullVersionStarted': False,
        'userListeningApprovalPending': True
    }
    (ROOT / 'VERIFICATION.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report), flush=True)


if __name__ == '__main__':
    main()
