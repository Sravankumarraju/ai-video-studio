from pathlib import Path
import json, hashlib, shutil, zipfile

ROOT=Path('data/productions/divine-wisdom/venkateswara/suprabhatam-2026-10-19/full-approved-natural-v3')
BASE=ROOT.parent

def main():
 verification=json.loads((ROOT/'VERIFICATION.json').read_text(encoding='utf8'))
 assert verification['fullDecodePassed']
 prompts=[
  ('01-tirumala-sunrise','Tirumala lush rounded forested seven hills at sunrise, luminous gold temple gopuram nestled among misty South Indian hills, distant pilgrim lamps and warm sunrise rays. Landscape only, no deity portrait, no Himalayan snow peaks. Deep indigo and warm gold, lower third dark uncluttered for Telugu lyrics.'),
  ('02-venkateswara-portrait','Original highly detailed dignified dark polished stone Venkateswara murti, broad white U-shaped Vaishnava namam with red central line, ornate gold kirita crown, jewelry, white jasmine red rose and green tulasi garlands. Upper hands conch and discus, lower right varada gesture, lower left near hip. Deep indigo temple background and warm gold lamps, face in upper half and lower third dark for captions.'),
  ('03-crown-garlands','Reframe the primary Venkateswara murti in a dignified devotional view emphasizing the complete tall gold crown, clear namam, ornate gold jewelry and white red flower garlands. Keep entire crown inside frame with breathing room above. Face near upper third, lower third dark stone foreground.'),
  ('04-lamps-temple','Wide temple-inspired setting with the same Venkateswara murti in an ornate gold shrine, rows of softly glowing brass oil lamps on either side, dark carved stone pillars, blue morning light, sacred radiance and clear dark lower foreground.'),
  ('05-lakshmi','Dignified serene Goddess Lakshmi seated on a pink lotus with four graceful arms, upper hands holding pink lotuses, gold crown, red silk sari and warm gold jewelry. Same Venkateswara murti in a background shrine. Sacred faces in upper half, indigo and warm gold temple setting, lower third dark clear.'),
  ('06-serene-closing','Serene closing portrait of the same Venkateswara murti, consistent crown namam face and garlands, quiet golden shrine, soft dawn halo, gently glowing oil lamps and reverent peaceful stillness. Face safely above captions and dark lower foreground.'),
  ('07-traditional-mural','Traditional South Indian temple mural painting, hand-painted mineral pigments, vermilion ochre deep indigo and antique gold, decorative arches, stylized lotus borders, fine linework, dignified frontal sacred murti, aged plaster texture and harmonious flat forms with gold accents. Iconography reference only; distinct painted medium.'),
  ('08-bronze-shrine','Cinematic sacred bronze-and-stone shrine still life, Venkateswara as antique dark bronze murti with subtle gold highlights in carved stone sanctum. Warm brass oil lamps, realistic metal textures, gentle incense haze, amber chiaroscuro, deep black and gold palette. Consistent iconography; distinct medium.'),
  ('09-watercolor-dawn','Luminous watercolor and fine ink devotional painting on textured paper. Venkateswara in upper left, delicate gold crown namam and garlands, transparent indigo washes, rose-gold dawn over rounded forested Tirumala hills at right, soft atmospheric brushwork, graceful gold accents and deep indigo lower third.')]
 prompt_record={'tool':'Built-in ImageGen','generationMode':'One primary original illustration, then eight original variants using the primary or crown portrait as an iconography reference',
  'sharedConstraints':'16:9 landscape composition; original artwork, no text logos or watermark; sacred faces above the lower caption panel; consistent Venkateswara iconography; warm gold and deep indigo. Telugu text and existing channel logo rendered separately.',
  'images':[{'file':f'art/{name}.png','promptBrief':p,'sha256':hashlib.sha256((ROOT/'art'/f'{name}.png').read_bytes()).hexdigest()} for name,p in prompts]}
 (ROOT/'art-prompts.json').write_text(json.dumps(prompt_record,ensure_ascii=False,indent=2),encoding='utf8')
 review='''# Sri Venkateswara Suprabhatam • Divine Wisdom Telugu

Prepared package: 1920×1080 H.264/AAC MP4, 24 fps, approximately 12:41.

The opening is the user-approved, naturally sung V3 sample. It has no speed or pitch processing. The final continuation uses the fresh original generations, not the rejected reference-conditioned recordings. All 29 traditional verses appear in order. Welcome and promotional closing remain separate from the prayer.

Nine original illustrations include cinematic temple art, a traditional mural, a bronze shrine and watercolor dawn. The existing channel logo appears throughout. Large Noto Sans Telugu captions use white text on a dark translucent panel with gold current-word highlighting. ASS uses 104 px; the editable Studio variant uses the schema cap of 100 px.

Source: https://vignanam.org/telugu/sri-venkateswara-suprabhatam.html
The complete browser snapshot and cleaned Sanskrit-in-Telugu script are included. Verse numbers and bracketed editorial variants are excluded from the sung text.

## Files

- Sri-Venkateswara-Suprabhatam-Telugu-1080p.mp4: complete video.
- finished-audio-master.wav: 48 kHz stereo 24-bit finished continuous audio master.
- finished-audio-master.mp3: convenient 320 kbps listening copy.
- telugu-captions.ass and telugu-captions.srt: timed Telugu captions.
- thumbnail.jpg: 1280×720, original portrait, separately typeset Telugu title and existing logo.
- youtube-metadata.json, youtube-description.txt and chapters.txt: title, AI disclosure, source and actual chapter timestamps.
- portable-story-studio-project.json: native Studio import file with all referenced images, logo and continuous MP3 audio embedded. Approximately 77 MB, within the default 100 MB upload limit.
- editable-studio-project.json and timeline.json: registered local project and detailed editable timeline.
- art/: original illustrations; fonts/: caption font and license.
- records/: prompts, generation attempts, alignment, independent transcription and technical validation records.
- source/: full verified source snapshot and cleaned prayer text.
- scripts/: reproducible preparation, rendering and Studio registration scripts. These expect the existing project runtime and secure credentials; no credentials are included.

## Verification and listening review

The entire finished export decoded successfully. Resolution, frame rate and audio/video duration were checked. All 427 prayer caption words have positive timing spans; no zero-duration or unusually compressed prayer words remain. Independent transcription of the selected continuation follows the intended verses 3–29, and representative frames were inspected for caption clarity and visual placement.

Human listening review remains pending for Sanskrit pronunciation, singer and melody continuity at section joins, and precise audible word/caption synchronization. The transcription of verse 25 appears to render Venkatachalapate where the source reads Venkatapate; listen to determine whether this is an ASR recognition error or extra sung syllables. Verse 27 consonant clusters also merit listening review. Alignment alone does not certify accurate singing. Do not treat this package as pronunciation-approved.

The earlier reference-conditioned batches reused opening lyrics and were excluded after independent transcription caught the problem. They are retained in the working production folder for audit, not included as delivery audio.

No upload or publication was performed or authorized. The editable project is registered locally as c9913990-3caf-4be1-81f5-6ae94594d5b3.
'''
 (ROOT/'DELIVERY-README.md').write_text(review,encoding='utf8')
 # A clean distributable excludes intermediates and rejected audio.
 files=[(ROOT/name,name) for name in ['Sri-Venkateswara-Suprabhatam-Telugu-1080p.mp4','finished-audio-master.wav','finished-audio-master.mp3','telugu-captions.ass','telugu-captions.srt','thumbnail.jpg','youtube-metadata.json','youtube-description.txt','chapters.txt','portable-story-studio-project.json','editable-studio-project.json','timeline.json','DELIVERY-README.md']]
 files += [(p,'art/'+p.name) for p in sorted((ROOT/'art').glob('*.png'))]
 files += [(p,'fonts/'+p.name) for p in sorted((ROOT/'fonts').glob('*'))]
 files += [(ROOT/p,'records/'+p) for p in ['VERIFICATION.json','caption-audit.json','source-selection.json','plan.json','art-prompts.json','fresh-batch-1-request.json','fresh-batch-2-request.json','fresh-batch-1-attempt.json','fresh-batch-2-attempt.json','fresh-batch-1-transcription.json','fresh-batch-2-transcription.json','welcome-request.json','closing-request.json','welcome-attempt.json','closing-attempt.json','channel-voice-check.json','bookends-plan.json','credits-fresh-music.json','studio-registration.json']]
 files += [(p,'records/alignment/'+p.name) for p in sorted(ROOT.glob('fresh-verse-*-alignment.json'))]
 files += [(ROOT/p,'records/alignment/'+p) for p in ['approved-opening-alignment.json','welcome-alignment.json','closing-alignment.json']]
 files += [(BASE/'opening-two-verses-natural-v3'/p,'records/approved-opening/'+p) for p in ['request.json','generation.json','plan.json']]
 files += [(BASE/'source-browser.txt','source/source-browser.txt'),(ROOT/'complete-lyrics-telugu.txt','source/complete-lyrics-telugu.txt')]
 files += [(Path('scripts')/p,'scripts/'+p) for p in ['venkateswara-full.ts','venkateswara-package.py','venkateswara-studio-project.ts','venkateswara-suprabhatam-sample.ts','venkateswara-delivery.py']]
 files += [(p,'review/'+p.name) for p in sorted((ROOT/'review').glob('*.png'))]
 for p,_ in files:assert p.exists(),p
 manifest=[{'file':name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p,name in files]
 (ROOT/'delivery-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
 archive=ROOT/'Sri-Venkateswara-Suprabhatam-Delivery.zip'
 with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=1) as z:
  for p,name in files:z.write(p,name)
  z.write(ROOT/'delivery-manifest.json','delivery-manifest.json')
 with zipfile.ZipFile(archive) as z:assert z.testzip() is None
 print(json.dumps({'archive':str(archive.resolve()),'files':len(files)+1,'bytes':archive.stat().st_size}))

if __name__=='__main__':main()
