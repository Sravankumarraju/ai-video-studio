from pathlib import Path
import json,shutil,hashlib
ROOT=Path('data/branding/divine-wisdom/production-presets/suprabhatam-female-chant-approved-2026-10-20')
ROOT.mkdir(parents=True,exist_ok=True)
VOICE=Path('output/sri-venkateswara-female-chant-v3-2026-10-20')
DESIGN=Path('output/sri-venkateswara-telugu-shaping-fixed-2026-10-20')
FULL=Path('output/sri-venkateswara-full-approved-2026-10-20')
files={
 'voice-reference.mp3':VOICE/'song.mp3',
 'voice-generation-request.json':VOICE/'request.json',
 'voice-generation-record.json':VOICE/'song-attempt.json',
 'voice-music-metadata.json':VOICE/'song-metadata.json',
 'voice-independent-transcript.json':VOICE/'independent-transcription.json',
 'voice-pacing-audit.json':VOICE/'pacing-audit.json',
 'channel-logo-transparent.png':FULL/'channel-logo-transparent.png',
 'logo-background-removal.txt':FULL/'logo-background-removal.txt',
 'approved-preview.mp4':FULL/'Approved-Sample-Transparent-Logo-1080p.mp4',
 'prayer-background.jpg':DESIGN/'prayer-background.jpg',
 'ending-background.jpg':DESIGN/'ending-background.jpg',
 'telugu-captions.ass':DESIGN/'telugu-captions.ass',
 'telugu-captions.srt':DESIGN/'telugu-captions.srt',
 'ending-telugu.ass':DESIGN/'ending-telugu.ass',
 'design-verification.json':DESIGN/'verification.json',
 'caption-audit.json':Path('output/sri-venkateswara-approved-corrected-2026-10-20/verification.json'),
 'opening-lyrics-telugu.txt':Path('output/sri-venkateswara-approved-corrected-2026-10-20/corrected-lyrics-telugu.txt'),
 'fonts/NotoSansTelugu.ttf':Path('public/fonts/NotoSansTelugu.ttf'),
 'fonts/NotoSans.ttf':Path('public/fonts/NotoSans.ttf'),
 'fonts/OFL-NotoSans.txt':Path('public/fonts/OFL-NotoSans.txt'),
 'fonts/OFL-Telugu.txt':Path('public/fonts/OFL.txt'),
 'scripts/render-design.py':Path('scripts/suprabhatam-telugu-shaping-fixed-20261020.py'),
 'scripts/prepare-full.mjs':Path('scripts/prepare-suprabhatam-full-approved-20261020.mjs'),
 'scripts/generate-approved-chant.mjs':Path('scripts/suprabhatam-female-chant-v3-20261020.mjs')
}
manifest=[]
for dest,source in files.items():
 assert source.exists(),source
 target=ROOT/dest;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,target)
 manifest.append({'file':dest,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
name='Divine Wisdom Telugu — Approved Female Suprabhatam Chant'
request=json.loads((ROOT/'voice-generation-request.json').read_text(encoding='utf8'))
reuse=json.loads(json.dumps(request));reuse['composition_plan']['chunks'][0]['text']=reuse['composition_plan']['chunks'][0]['text'].replace('పూర్వాసంధ్యా','పూర్వా సంధ్యా')
(ROOT/'reusable-chant-request.json').write_text(json.dumps(reuse,ensure_ascii=False,indent=2),encoding='utf8')
preset={
 'id':ROOT.name,'name':name,'approvalDate':'2026-10-20','approval':'User approved the transparent logo sample and asked to save the voice and design pattern.',
 'channelName':'Divine Wisdom Telugu','videoTitleEnglish':'Sri Venkateswara Suprabhatham','videoTitleTelugu':'శ్రీ వేంకటేశ్వర సుప్రభాతం',
 'voice':{'provider':'ElevenLabs Music','model':'music_v2_5','storedSongId':'3SlOHdwOU0C9QeBO5Loe',
 'referenceAudio':'voice-reference.mp3','referenceRangeMs':{'start':100,'end':21240},'conditioningStrength':'high',
 'identityType':'Original generated female chant preserved as audio and Music conditioning reference; no separate saved TTS singer voice ID.',
 'delivery':'Rhythmic Sanskrit stotra chanting in a clear feminine middle register, connected syllables, compact pitch range, brief line-end breaths, quiet tanpura drone.',
 'openingDurationSeconds':22.104,'tempoOrPitchProcessing':False,'prompt':'reusable-chant-request.json',
 'avoid':'The earlier spoken TTS sample and slow 40-second sung sample were rejected; do not reuse them as the approved voice.',
 'continuityNote':'Use the stored original song reference for continuation; generated singer consistency and pronunciation need listening review.'},
 'design':{'resolution':[1920,1080],'fps':24,'palette':{'olivePanel':'#2b3918','gold':'#f5df9b','lyricWhite':'#f1f6f6'},
 'background':'prayer-background.jpg','layout':'English title at top left; shaped Telugu title and stanza on the left; Venkateswara art on the right.',
 'englishHeader':{'text':'Sri Venkateswara Suprabhatham','position':[74,65],'font':'Noto Sans','sizePx':38},
 'teluguTitle':{'text':'శ్రీ వేంకటేశ్వర సుప్రభాతం','position':[74,205],'font':'Noto Sans Telugu','assFontSize':56},
 'captions':{'font':'Noto Sans Telugu','assFontSize':70,'position':[76,410],'alignment':'top-left','display':'Full stanza with natural phrase breaks; highlight only the word currently heard.',
 'timing':'Actual acoustic word timing; independent transcription checked against source text.',
 'renderer':'libass with complex HarfBuzz shaping','forbiddenRenderer':'Pillow text for Telugu: this runtime lacks RAQM/HarfBuzz; it breaks vowel signs and conjuncts.'},
 'logo':{'file':'channel-logo-transparent.png','alpha':'preserve','widthPx':220,'heightPx':220,'anchor':'bottom-right','rightMarginPx':28,'bottomMarginPx':28,'opaqueBackground':False},
 'ending':{'durationSeconds':6,'background':'ending-background.jpg','teluguOverlay':'ending-telugu.ass',
 'englishTitle':'Sri Venkateswara Suprabhatham','teluguTitle':'శ్రీ వేంకటేశ్వర సుప్రభాతం',
 'ctaEnglish':['SUBSCRIBE','LIKE','SHARE','COMMENT'],
 'ctaTelugu':['మా ఛానల్‌కు సబ్‌స్క్రైబ్ చేయండి','వీడియోను లైక్ చేయండి, షేర్ చేయండి','మీ అభిప్రాయాన్ని కామెంట్‌లో తెలియజేయండి'],
 'audio':'Quiet instrumental tail with fade; keep the prayer intact.'}},
 'approvedPreview':'approved-preview.mp4','manifest':'manifest.json',
 'fullVideoStatus':'Not generated; continuation is waiting for additional ElevenLabs credits.',
 'credentialsIncluded':False,'publishingAuthorized':False}
(ROOT/'preset.json').write_text(json.dumps(preset,ensure_ascii=False,indent=2),encoding='utf8')
(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
index=ROOT.parent/'index.json';saved=json.loads(index.read_text(encoding='utf8')) if index.exists() else {'presets':[]}
saved['presets']=[p for p in saved['presets'] if p.get('id')!=ROOT.name]+[{'id':ROOT.name,'name':name,'path':f'{ROOT.name}/preset.json','approved':True}]
saved['approvedSuprabhatamPreset']=ROOT.name
index.write_text(json.dumps(saved,ensure_ascii=False,indent=2),encoding='utf8')
planpath=FULL/'full-production-plan.json';plan=json.loads(planpath.read_text(encoding='utf8'))
plan['approvedPreset']=str(ROOT/'preset.json');plan['logo']=str(ROOT/'channel-logo-transparent.png');plan['approvedOpening']=str(ROOT/'voice-reference.mp3')
plan['voiceAndDesignApproved']=True
planpath.write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf8')
assert all(hashlib.sha256((ROOT/x['file']).read_bytes()).hexdigest()==x['sha256'] for x in manifest)
print(json.dumps({'savedPreset':str((ROOT/'preset.json').resolve()),'preservedFiles':len(manifest),'checksumsVerified':True,'savedVoiceSongId':preset['voice']['storedSongId']}))
