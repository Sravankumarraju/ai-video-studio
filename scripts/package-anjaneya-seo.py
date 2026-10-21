"""Prepare upload-ready Telugu metadata for the corrected V2 music video."""
from pathlib import Path
import json,shutil,zipfile

SOURCE=Path('output/anjaneya-courage-youtube-v2')
OUT=Path('output/anjaneya-courage-seo')
OUT.mkdir(exist_ok=True)
title='అంజనేయా అడుగులో ధైర్యమా | Hanuman Telugu Song | Divine Wisdom Telugu'
titles=[title,'Hanuman Telugu Devotional Song | అంజనేయా — అడుగులో ధైర్యమా','అంజనేయా — అడుగులో ధైర్యమా | తెలుగు హనుమాన్ భక్తి గీతం']
chapters=(SOURCE/'youtube-chapters.txt').read_text(encoding='utf8').strip()
lyrics=(SOURCE/'lyrics-supplied.txt').read_text(encoding='utf8').strip()
hashtags='#HanumanTeluguSong #Anjaneya #TeluguDevotionalSongs'
description=f'''అంజనేయా — అడుగులో ధైర్యమా | Hanuman Telugu Song | తెలుగు హనుమాన్ భక్తి గీతం
హనుమంతుని ధైర్యం, వినయం, రామభక్తి, సేవా గుణాలను స్మరించుకునే తెలుగు భక్తి పాట. జై హనుమాన్! జై శ్రీరామ్!

Divine Wisdom Telugu ఛానల్‌కు స్వాగతం!

“అంజనేయా — అడుగులో ధైర్యమా” గీతం కష్టాల్లో ధైర్యంగా ముందడుగు వేయడం, బలహీనులకు తోడుగా నిలవడం, మాట నిలబెట్టుకోవడం, గర్వం లేకుండా సేవ చేయడం అనే సందేశాలను అందిస్తుంది. తెలుగు పాట పదాలను తెరపై అనుసరిస్తూ వినండి.

Listen to “Anjaneya — Adugulo Dhairyama,” a Telugu Hanuman devotional song celebrating courage, humility, devotion to Lord Rama, and selfless service. Includes on-screen Telugu lyrics.

పాట: అంజనేయా — అడుగులో ధైర్యమా
భాష: తెలుగు | ఛానల్: Divine Wisdom Telugu

వీడియో భాగాలు:
{chapters}

పాట పదాలు:
{lyrics}

మీకు నచ్చిన పంక్తి ఏది? కామెంట్‌లో పంచుకోండి. పాట నచ్చితే లైక్ చేయండి, కుటుంబ సభ్యులతో, స్నేహితులతో షేర్ చేయండి. మరిన్ని తెలుగు భక్తి గీతాల కోసం Divine Wisdom Telugu ఛానల్‌కు సబ్‌స్క్రైబ్ చేయండి.

Production note: Audio recording and lyrics supplied by the creator. Devotional illustrations, channel narration, video editing, and captions prepared with AI assistance. This song is a devotional composition, not a quotation from scripture.

{hashtags}

ఈ వీడియోలో పాట పదాలు, ఉచ్చారణ లేదా వివరణలో ఏదైనా పొరపాటు ఉంటే మనస్ఫూర్తిగా క్షమాపణలు కోరుతున్నాం. దయచేసి కామెంట్‌లో తెలియజేయండి; పరిశీలించి సరిచేస్తాం.
'''
tags=['Hanuman Telugu Song','Anjaneya Telugu Song','Telugu Devotional Songs','Adugulo Dhairyama','Anjaneya Adugulo Dhairyama','అంజనేయా','అడుగులో ధైర్యమా','హనుమాన్ పాటలు','హనుమాన్ భక్తి గీతం','తెలుగు భక్తి పాటలు','ఆంజనేయ స్వామి పాట','Jai Hanuman Telugu','Rama Dootha Hanuma','Vayuputra Hanuman','Hanuman Bhakti Song','Anjaneyaa','Divine Wisdom Telugu']
tag_text=', '.join(tags)
pinned='జై హనుమాన్! 🙏 “ధైర్యం, వినయం, సేవ” — ఈ గీతంలో మీ మనసుకు దగ్గరైన పంక్తి ఏది? కామెంట్‌లో చెప్పండి. మరిన్ని తెలుగు భక్తి గీతాల కోసం Divine Wisdom Telugu ఛానల్‌కు సబ్‌స్క్రైబ్ చేయండి. జై శ్రీరామ్!'
assert all(len(t)<=100 for t in titles)
assert len(description)<=5000
assert len(tag_text)<480
settings={'category':'Music','videoLanguage':'Telugu','titleAndDescriptionLanguage':'Telugu','subtitleFile':'captions-te.srt','suggestedPlaylistName':'హనుమాన్ భక్తి గీతాలు | Hanuman Telugu Songs','playlistStatus':'Suggested title; no playlist created','audienceRecommendation':'Not made for kids, if this remains a general-audience devotional song rather than content specifically directed at children. Confirm the actual intended audience.','endScreenRecommendation':'Use 03:04–03:20 for a Subscribe element and a relevant existing Hanuman song video or playlist. No end screen has been added.','visibility':'Choose in YouTube Studio; no upload or publication performed','recordingLocation':'Leave blank unless an actual recording location is known','credits':'Do not invent singer, composer, lyricist or licensing credits. Add verified names if desired.'}
seo={'primaryKeyword':'Hanuman Telugu Song','secondaryKeywords':['Anjaneya Telugu Song','Telugu Devotional Songs','అంజనేయా','హనుమాన్ భక్తి గీతం'],'keywordEvidence':'Chosen for relevance to the supplied song; search volumes and ranking scores have not been measured.','rationale':'The title pairs the exact Telugu song identity with an English discovery phrase. The opening description explains the same subject naturally. Tags cover relevant wording and transliteration variants.','sources':[{'title':'YouTube description guidance','url':'https://support.google.com/youtube/answer/12948449'},{'title':'YouTube tags guidance','url':'https://support.google.com/youtube/answer/146402'},{'title':'YouTube thumbnails guidance','url':'https://support.google.com/youtube/answer/72431'}]}
data={'title':title,'titles':titles,'description':description,'tags':tags,'hashtags':hashtags,'chapters':chapters,'pinnedCommentDraft':pinned,'thumbnail':'hanuman-telugu-song-thumbnail.jpg','videoFile':str((SOURCE/'Anjaneya-Adugulo-Dhairyama-No-Gap-V2-1080p.mp4').resolve()),'settings':settings,'seo':seo,'uploaded':False,'published':False}
(OUT/'youtube-metadata.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
for name,text in [('youtube-title',title),('youtube-title-alternatives','\n'.join(titles)),('youtube-description',description),('youtube-tags',tag_text),('youtube-hashtags',hashtags),('youtube-chapters',chapters),('youtube-pinned-comment',pinned),('youtube-settings','\n'.join(f'{k}: {v}' for k,v in settings.items())),('seo-notes',json.dumps(seo,ensure_ascii=False,indent=2))]:
    (OUT/f'{name}.txt').write_text(text+'\n',encoding='utf8')
for name in ['captions-te.srt','captions-te.vtt','lyrics-supplied.txt']:shutil.copyfile(SOURCE/name,OUT/name)
complete=f'''YOUTUBE UPLOAD DETAILS — CORRECTED V2 VIDEO

TITLE
{title}

DESCRIPTION
{description}

TAGS (paste into Tags, not the description)
{tag_text}

PINNED COMMENT
{pinned}

SETTINGS
'''+ '\n'.join(f'{k}: {v}' for k,v in settings.items())
(OUT/'COMPLETE-YOUTUBE-DETAILS.txt').write_text(complete,encoding='utf8')
print(json.dumps({'titleCharacters':len(title),'descriptionCharacters':len(description),'tagsCharacters':len(tag_text),'directory':str(OUT.resolve())}),flush=True)
