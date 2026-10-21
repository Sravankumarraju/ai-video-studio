"""Copy only verified deliverables into the channel's delivery directory."""
from pathlib import Path
import json, shutil, hashlib

source = Path('data/productions/divine-wisdom/kondanta-durgamma-2026-10-15')
destination = Path('output/divine-wisdom-telugu/kondanta-durgamma')
report = json.loads((source/'verification.json').read_text(encoding='utf8'))
assert report['fullDecodePassed'] and report['originalAudioPacketsUnchanged']
destination.mkdir(parents=True, exist_ok=True)
(destination/'images').mkdir(exist_ok=True)
files = ['Kondanta-Andave-Durgamma-1080p.mp4', 'youtube-thumbnail.jpg', 'captions-te.srt',
         'youtube-title.txt', 'youtube-description.txt', 'youtube-tags.txt', 'verification.json',
         'arrangement-notes.json', 'image-prompts.json', 'review-contact-sheet.jpg']
for name in files:
    shutil.copy2(source/name, destination/name)
for name in ['durga-lion.png', 'durga-home.png', 'durga-comfort.png', 'durga-power.png']:
    shutil.copy2(source/name, destination/'images'/name)
manifest = {
    'title': (source/'youtube-title.txt').read_text(encoding='utf8').strip(),
    'channel': 'Divine Wisdom Telugu',
    'video': str((destination/files[0]).resolve()),
    'thumbnail': str((destination/'youtube-thumbnail.jpg').resolve()),
    'durationSeconds': report['duration'], 'resolution': '1920x1080', 'fps': 24,
    'artGeneration': 'Built-in image_gen; four new cinematic illustrations and one thumbnail',
    'referenceStyle': 'Creator-owned Shiva song: large Telugu word highlights, channel opening and closing, black-gold thumbnail',
    'originalAudioUnchanged': True, 'fullDecodePassed': True,
    'manualListeningVerified': False,
    'recordedArrangement': 'Chorus, verse 1, chorus, bridge, verse 2, final chorus. Written verse 3 and peaceful ending are absent from supplied recording.',
    'published': False,
    'videoSha256': hashlib.file_digest((destination/files[0]).open('rb'), 'sha256').hexdigest(),
}
(destination/'delivery-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
(source/'production-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'delivery':str(destination.resolve()),'videoBytes':(destination/files[0]).stat().st_size},indent=2))
