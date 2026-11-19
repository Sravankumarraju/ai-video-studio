"""Build the existing Vishnu-style sample with a newly generated Sanskrit chant."""
from pathlib import Path
import difflib
import importlib.util
import json
import re
import shutil
import subprocess

ROOT = Path('output/venkateswara-vishnu-style-voice-v2-2026-10-22')


def norm(text):
    return ''.join(c for c in text if '\u0900' <= c <= '\u0963')


def telugu(text):
    return ''.join(chr(ord(c) + 0x300) if '\u0900' <= c <= '\u0963' else c for c in text)


plan = json.loads((ROOT / 'voice-plan.json').read_text(encoding='utf8'))
metadata = json.loads((ROOT / 'song-metadata.json').read_text(encoding='utf8'))
transcript_path = ROOT / 'independent-transcription.json'
transcript = json.loads(transcript_path.read_text(encoding='utf8')) if transcript_path.exists() else {}
words = [w for w in metadata['words_timestamps'] if norm(w['word'])]
expected = [token for verse in plan['verses'] for token in verse['text'].split() if norm(token)]
assert [norm(w['word']) for w in words] == [norm(token) for token in expected]
assert all(w['end_ms'] > w['start_ms'] for w in words)
verses = []
cursor = 0
for verse in plan['verses']:
    tokens = [token for token in verse['text'].split() if norm(token)]
    selected = words[cursor:cursor + len(tokens)]
    cursor += len(tokens)
    verses.append({'verse': verse['verse'], 'text': telugu(verse['text']), 'start': 0 if verse['verse'] == 1 else selected[0]['start_ms'] / 1000, 'end': selected[-1]['end_ms'] / 1000, 'words': [{'text': telugu(norm(w['word'])), 'start': w['start_ms'] / 1000, 'end': w['end_ms'] / 1000} for w in selected]})
for a, b in zip(verses, verses[1:]):
    a['end'] = b['start']
verses[-1]['end'] += .35
(ROOT / 'full-timeline.json').write_text(json.dumps({'verses': verses}, ensure_ascii=False, indent=2), encoding='utf8')
target = ROOT / 'chant-with-light-music.wav'
if not target.exists():
    subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-i', str(ROOT / 'song.mp3'), '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s24le', str(target)], check=True)
heard = transcript.get('text', '')
source = '\n\n'.join(v['text'] for v in plan['verses'])
review = {'scope': 'Independent ASR screening of fresh chant; not a pronunciation certificate', 'independentTranscriptionAvailable': bool(transcript), 'expectedSanskrit': source, 'independentTranscript': heard, 'sourceWordSequenceMatchesProviderTimestamps': True, 'positiveTimedPrayerWords': len(words), 'sourceTextCharacterSimilarity': round(difflib.SequenceMatcher(None, norm(source), norm(heard), autojunk=False).ratio() * 100, 2) if heard else None, 'source': plan['source'], 'humanListeningApproval': False, 'limitations': 'ASR can misrecognize Sanskrit, and supplied-text timestamps cannot establish correct pronunciation.'}
(ROOT / 'pronunciation-screening.json').write_text(json.dumps(review, ensure_ascii=False, indent=2), encoding='utf8')
spec = importlib.util.spec_from_file_location('sample', Path(__file__).with_name('render-suprabhatam-vishnu-style-sample.py'))
sample = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sample)
sample.ROOT = ROOT
sample.CHANT = ROOT
sample.OUTPUT = ROOT / 'Venkateswara-Suprabhatam-New-Voice-Sample-1080p.mp4'
sample.style.ROOT = ROOT
sample.style.OUTPUT = sample.OUTPUT
sample.main()
notes = {'request': 'Recreate voice because previous sample pronunciation was poor', 'voice': 'Fresh original female Sanskrit chant; Devanagari source input, clear syllabic delivery, quiet tanpura, no previous chant reused', 'lyricsOnScreen': 'Telugu transliteration of regenerated Sanskrit text', 'visualStyle': 'Vishnu Sahasranamam full-screen illustrations and gold word highlighting', 'scope': 'Four-verse sample, existing channel introduction and closing retained', 'independentASRScreening': 'pronunciation-screening.json', 'humanPronunciationAndSyncReviewPending': True, 'published': False}
(ROOT / 'production-notes.json').write_text(json.dumps(notes, ensure_ascii=False, indent=2), encoding='utf8')
verification = json.loads((ROOT / 'VERIFICATION.json').read_text(encoding='utf8'))
verification['existingChantReused'] = False
verification['newChantGenerated'] = True
verification['independentTranscriptAvailable'] = bool(transcript)
(ROOT / 'VERIFICATION.json').write_text(json.dumps(verification, ensure_ascii=False, indent=2), encoding='utf8')
