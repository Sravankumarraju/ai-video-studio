from pathlib import Path
import json,hashlib,zipfile

ROOT=Path('data/productions/divine-wisdom/venkateswara/suprabhatam-2026-10-19/full-male-shloka-2026-10-19')
BASE=ROOT.parent

def main():
 check=json.loads((ROOT/'VERIFICATION.json').read_text(encoding='utf8'));registration=json.loads((ROOT/'studio-registration.json').read_text(encoding='utf8'))
 assert check['fullDecodePassed'] and check['completeHeldVerses']==29 and check['silenceAtLeastPointEightSecondsDetected'] is False
 joins=json.loads((ROOT/'join-audit.json').read_text(encoding='utf8'))['internalVocalGaps'];assert max(j['seconds'] for j in joins)<.6
 report={'skill':'investigate','status':'DONE_WITH_CONCERNS','symptom':'Complete numbered shlokam must remain visible while the currently performed word turns gold in Studio and exports.',
  'rootCause':'Full-verse layout discarded word timestamps and marked the page untimed; the Studio preview explicitly excluded held pages from highlighting.',
  'fix':'Preserve source-word timestamps across authored full-verse lines, keep punctuation and numbers untimed, and highlight only during actual word spans. Honor an explicitly set bottom position for complete verses in both UI and ASS.',
  'files':['lib/caption-layout.ts','components/studio.tsx','worker/render.ts','tests/full-verse-highlight.test.ts'],
  'baselineEvidence':{'held':True,'timed':False,'wordTimingMissing':True},'regressionTests':'11 passed across full-verse-highlight and caption-layout.regression-1',
  'browserEvidence':{'projectId':registration['projectId'],'playheadSeconds':39,'completeVerse':3,'goldWord':'మధుకైటభారేః','screenshot':'review/studio-full-shlokam.png'},
  'typecheck':'No errors in changed caption files. Whole-project typecheck reports six existing errors in complete-video-status.ts, inspect-youtube-chapter-playlists.ts, recover-gita-nine-recording.ts and repair-gita-nine-alignment.ts; those scripts were not modified.',
  'gstackHelper':'Bash startup denied in this Windows session; workflow performed with available tools; no helper telemetry submitted.',
  'learning':{'type':'investigation','key':'held-verse-timings','insight':'Holding an entire verse and timing individual words are independent properties. Preserve timing through full-verse layout and emit neutral whole-verse frames before, between and after spoken words; never assign word timing to verse numbers.','confidence':9,'source':'observed'}}
 (ROOT/'UI-HIGHLIGHT-REPORT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
 readme=f'''# Sri Venkateswara Suprabhatam • Male voice • Complete shlokam edition

Complete 1080p MP4, 24 fps, duration 11:48.292. All 29 traditional Suprabhatam verses appear in order.

The rich male devotional direction follows the selected original sample and the broad 84 BPM Hanuman-production musical brief. The prayer master has a subtle +0.5-semitone formant-preserving pitch lift, modest warm bass and presence refinement. The adjustment applies to the whole prayer mix because an isolated vocal stem is unavailable. Tempo is unchanged. Channel welcome and closing retain their existing voice.

Each complete shlokam, including its verse number, stays visible throughout its performance. Only the currently performed word turns gold. Verse numbers and punctuation stay white and are not sung. Source line breaks are retained: two lines for the opening verses, four for the longer verses. Noto Sans Telugu is 72–82 px as needed to fit the complete verse, with a dark translucent panel clear of faces. Studio's editable variant uses 82 px and bottom placement.

Nine original devotional illustrations, including temple, mural, bronze and watercolor styles, are reused with the existing channel logo, welcome and closing subscribe/like/share/comment request. No upload or publication was performed.

## Files

- Sri-Venkateswara-Suprabhatam-Telugu-1080p.mp4: full video.
- finished-audio-master.wav: 48 kHz stereo 24-bit continuous finished master.
- finished-audio-master.mp3: 320 kbps listening copy.
- telugu-captions.ass / .srt / .vtt: numbered complete-shlokam captions; ASS includes active-word gold highlighting.
- thumbnail.jpg: original portrait, existing logo and separately typeset Telugu title.
- youtube-description.txt, youtube-metadata.json, chapters.txt: source, AI disclosure and actual finished timeline timestamps.
- portable-story-studio-project.json: editable native Studio import, with all referenced image, logo and MP3 media embedded.
- editable-studio-project.json: local registered project {registration['projectId']}.
- art/, fonts/, source/, records/, scripts/, review/: artwork, caption font and license, verified source, generation/alignment/audit records, reproducible scripts and review images.

## Verification

The complete MP4 decoded successfully. Resolution, 24 fps and final duration match the assembled timeline. Independent transcription follows the intended prayer sequence. All 427 prayer words have positive, non-collapsed timing spans. All 29 complete numbered verses remain visible and are highlighted by actual performance timings. Automated silence detection found no silence of 0.8 seconds or longer at -42 dB. Measured inter-verse vocal gaps range from {min(j['seconds'] for j in joins):.3f} to {max(j['seconds'] for j in joins):.3f} seconds after trimming non-vocal tails.

The actual Studio UI was checked on the first two-line verse and a four-line verse, including a visible gold active word. The focused caption regression suite passes all 11 tests. Whole-project typechecking still reports unrelated existing script errors, detailed in records/UI-HIGHLIGHT-REPORT.json.

Human listening review remains pending for exact Sanskrit pronunciation, musical/voice continuity at joins, subjective pitch quality and final audible word/caption synchronization. Independent transcription and forced alignment do not certify perfect singing.

Text source: https://vignanam.org/telugu/sri-venkateswara-suprabhatam.html
The original browser snapshot and cleaned Sanskrit-in-Telugu lyrics are included. The source's bracketed editorial alternatives and verse numbers are excluded from sung text; verse numbers are displayed separately.
'''
 (ROOT/'DELIVERY-README.md').write_text(readme,encoding='utf8')
 names=['Sri-Venkateswara-Suprabhatam-Telugu-1080p.mp4','finished-audio-master.wav','finished-audio-master.mp3','telugu-captions.ass','telugu-captions.srt','telugu-captions.vtt','thumbnail.jpg','youtube-description.txt','youtube-metadata.json','chapters.txt','portable-story-studio-project.json','editable-studio-project.json','DELIVERY-README.md']
 files=[(ROOT/n,n) for n in names]
 for folder in ['art','fonts','review']:files.extend((p,folder+'/'+p.name) for p in sorted((ROOT/folder).glob('*')) if p.is_file())
 records=['plan.json','timeline.json','caption-audit.json','acoustic-audit.json','join-audit.json','VERIFICATION.json','UI-HIGHLIGHT-REPORT.json','art-prompts.json','studio-registration.json','credits-fresh-music.json','fresh-batch-1-request.json','fresh-batch-2-request.json','fresh-batch-1-attempt.json','fresh-batch-2-attempt.json','fresh-batch-1-transcription.json','fresh-batch-2-transcription.json','bookends-plan.json','channel-voice-check.json','welcome-request.json','closing-request.json','silence-detection.txt']
 files.extend((ROOT/n,'records/'+n) for n in records)
 files.extend((p,'records/alignment/'+p.name) for p in sorted(ROOT.glob('fresh-verse-*-alignment.json')))
 files.extend((ROOT/n,'records/alignment/'+n) for n in ['approved-opening-alignment.json','welcome-alignment.json','closing-alignment.json'])
 files.extend((BASE/'opening-two-verses-original-male-v2'/n,'records/selected-sample/'+n) for n in ['request.json','generation.json','transcription.json','plan.json'])
 files.extend([(BASE/'source-browser.txt','source/source-browser.txt'),(ROOT/'complete-lyrics-telugu.txt','source/complete-lyrics-telugu.txt')])
 files.extend((Path('scripts')/n,'scripts/'+n) for n in ['venkateswara-full.ts','venkateswara-male-package.py','venkateswara-package.py','venkateswara-studio-project.ts','venkateswara-suprabhatam-sample.ts','venkateswara-male-delivery.py'])
 files.append((Path('tests/full-verse-highlight.test.ts'),'source-code/full-verse-highlight.test.ts'))
 for p,_ in files:assert p.is_file(),p
 manifest=[{'file':n,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p,n in files]
 (ROOT/'delivery-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
 output=ROOT/'Sri-Venkateswara-Suprabhatam-Male-Full-Shlokam-Delivery.zip'
 with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=1) as z:
  for p,n in files:z.write(p,n)
  z.write(ROOT/'delivery-manifest.json','delivery-manifest.json')
 with zipfile.ZipFile(output) as z:assert z.testzip() is None
 print(json.dumps({'archive':str(output.resolve()),'files':len(files)+1,'bytes':output.stat().st_size,'seconds':check['seconds']}))

if __name__=='__main__':main()
