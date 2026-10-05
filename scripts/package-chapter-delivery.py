from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json
import sys
folder = Path(sys.argv[1] if len(sys.argv) > 1 else 'data/productions/divine-wisdom/gita-chapter-1/meaning-v1')
config = json.loads((folder / 'episode.json').read_text(encoding='utf8'))
stem = config.get('fileStem', 'gita-chapter-1')
names = ['README.md', 'script-te.md', 'description-te.md', 'CHAPTERS.txt', 'publishing.json', 'image-prompts.json', 'coverage.json', 'THUMBNAIL-PROMPT.md', 'youtube-description-te.txt', 'youtube-metadata.json', 'thumbnail-upload.jpg', f'{stem}-full.srt', f'{stem}-full.vtt', 'verification-full.json', 'browser-full-verification.json']
for name in ['visual-plan.json', 'visual-reuse-verification.json', 'existing-art-contact-sheet.jpg', 'app-publishing-verification.json', 'FINAL_DELIVERY.json', 'FINAL_DELIVERY.md', 'final-export-verification.json', 'streaming-verification.json', 'YOUTUBE_UPLOAD.json', 'MUSIC-PROVENANCE.json', 'RESEARCH-AND-EDITORIAL.md']:
    if (folder / name).exists():
        names.append(name)
target = folder / 'publishing-package.zip'
with ZipFile(target, 'w', ZIP_DEFLATED) as archive:
    for name in names:
        archive.writestr(name, (folder / name).read_bytes())
with ZipFile(target) as archive:
    assert archive.testzip() is None
    assert set(archive.namelist()) == set(names)
    verification = json.loads(archive.read('verification-full.json'))
    assert verification.get('allVerseMeaningsCovered') or verification.get('all47VerseMeaningsCovered')
print(json.dumps({'files': len(names), 'bytes': target.stat().st_size, 'verified': True}))
