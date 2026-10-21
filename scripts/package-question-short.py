import sys, json, zipfile
from pathlib import Path
d = Path(sys.argv[1])
config = json.loads((d/'episode.json').read_text(encoding='utf-8'))
stem = config['fileStem']
files = ['README.md','episode.json','script-te.md','publishing.json','authorization.json','FINAL_DELIVERY.json','verification-full.json','browser-full-verification.json','review-frames.json','thumbnail.png',stem+'-full.srt',stem+'-full.vtt']
with zipfile.ZipFile(d/'publishing-package.zip','w',zipfile.ZIP_DEFLATED) as z:
    for name in files:
        z.write(d/name, name)
