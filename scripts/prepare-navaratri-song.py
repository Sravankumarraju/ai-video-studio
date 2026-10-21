"""Prepare user song source and inspect acoustic transcription anchors."""
from pathlib import Path
import json
import subprocess

ROOT = Path('data/productions/divine-wisdom/navaratri-song-2026-10-15')
info = json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-of','json',str(ROOT/'song-original.m4a')]))
(ROOT/'lyrics-supplied.txt').write_text(info['format']['tags']['lyrics'],encoding='utf8')
words = [w for w in json.loads((ROOT/'transcribe.json').read_text(encoding='utf8'))['words'] if w['text'].strip()]
for k in range(0,len(words),10):
    print(str(k)+': '+' '.join(str(round(w['start'],2))+':'+w['text'] for w in words[k:k+10]))
