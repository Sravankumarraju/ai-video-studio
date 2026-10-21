from pathlib import Path
import json,math,shutil,zipfile,hashlib
from PIL import Image
ROOT=Path('output/sri-venkateswara-full-approved-2026-10-20')
OUT=ROOT/'youtube-package';OUT.mkdir(exist_ok=True)
timeline=json.loads((ROOT/'full-timeline.json').read_text(encoding='utf8'))
verification=json.loads((ROOT/'illustrated-video-verification.json').read_text(encoding='utf8'))
title='Sri Venkateswara Suprabhatham | శ్రీ వేంకటేశ్వర సుప్రభాతం | Telugu Lyrics'
tags=['Sri Venkateswara Suprabhatham','Venkateswara Suprabhatam','Suprabhatham Telugu Lyrics','శ్రీ వేంకటేశ్వర సుప్రభాతం','Telugu Suprabhatam','Tirumala Suprabhatam','Balaji Suprabhatam','Sanskrit Suprabhatam','Morning Devotional','Telugu Devotional Songs','Divine Wisdom Telugu','29 Slokas','Venkateswara','Suprabhatam with Lyrics']
hashtags=['#SriVenkateswaraSuprabhatham','#Suprabhatham','#DivineWisdomTelugu']
chapters=[]
for v in timeline['verses']:
 seconds=int(v['start']);label=' '.join(v['text'].splitlines()[0].split()[:3])
 chapters.append({'seconds':seconds,'text':f"{seconds//60:02}:{seconds%60:02} {label} | శ్లోకం {v['verse']}"})
assert chapters[0]['seconds']==0 and len(chapters)==29
assert all(b['seconds']-a['seconds']>=10 for a,b in zip(chapters,chapters[1:]))
assert verification['durationSeconds']-chapters[-1]['seconds']>=10
chapterText='\n'.join(c['text'] for c in chapters)
description='''శ్రీ వేంకటేశ్వర సుప్రభాతం 🙏 | Sri Venkateswara Suprabhatham with Telugu Lyrics

శ్రీ వేంకటేశ్వర సుప్రభాతంలోని 29 శ్లోకాలను తెలుగు లిపిలోని సాహిత్యంతో వినండి. మృదువైన భక్తి సంగీతం, ప్రశాంతమైన దివ్య చిత్రాలతో మీ ఉదయ ప్రార్థనకు తోడుగా ఈ వీడియోను అందిస్తున్నాం.

ఈ వీడియోలో సంస్కృత శ్లోకాలను తెలుగు లిపిలో చూపించాం.
ఓం నమో వేంకటేశాయ 🙏

Listen to all 29 verses of Sri Venkateswara Suprabhatham, with Sanskrit lyrics displayed in Telugu script, female devotional chanting, gentle instrumental music, and illustrated temple visuals.

Subscribe to Divine Wisdom Telugu for more devotional videos. Like, share, and tell us your favourite verse in the comments.

మీకు నచ్చిన శ్లోకాన్ని కామెంట్‌లో తెలియజేయండి. ఇలాంటి భక్తి వీడియోల కోసం Divine Wisdom Telugu ఛానల్‌ను సబ్‌స్క్రైబ్ చేయండి.

ఉచ్చారణలో లేదా సాహిత్యంలో ఏవైనా పొరపాట్లు ఉంటే దయచేసి క్షమించండి. మీ సవరణలు, సూచనలను కామెంట్లలో తెలియజేయండి.

Please forgive any inadvertent errors in pronunciation or lyrics. Your corrections and suggestions are welcome in the comments.

శ్లోకాల సమయాలు | CHAPTERS
'''+chapterText+'''

This video contains the 29-verse Suprabhatham section. The separate Stotram, Prapatti, and Mangalasasanam sections are not included.

An original AI-generated devotional rendition and illustrated visuals created for Divine Wisdom Telugu.
Traditional Sanskrit prayer. Text reference: https://stotranidhi.com/venkateshwara-suprabhatam-in-telugu/

'''+ ' '.join(hashtags)
comment='ఓం నమో వేంకటేశాయ 🙏 మీకు నచ్చిన శ్లోకాన్ని కామెంట్‌లో తెలియజేయండి. ఇలాంటి భక్తి వీడియోల కోసం Divine Wisdom Telugu ఛానల్‌ను సబ్‌స్క్రైబ్ చేయండి.'
settings={'channel':'Divine Wisdom Telugu','category':'Music','videoLanguage':'Sanskrit (chanting); lyrics displayed in Telugu script','titleDescriptionLanguages':'English and Telugu','audience':'No, not made for kids — intended for a general devotional audience','AIUse':'Yes — AI-generated devotional vocal/music and illustrated visuals','license':'Standard YouTube License','suggestedPlaylist':'Sri Venkateswara Suprabhatham & Devotional Songs','comments':'On; hold potentially inappropriate comments for review','initialVisibility':'Private while completing the existing pronunciation listening review; choose your publication time afterward','paidPromotion':'No, unless you have a sponsorship or other paid placement to disclose','subtitles':'Telugu-Script-Lyrics.srt contains Sanskrit lyrics in Telugu script, with verse-level timings','endScreen':'Optional subscribe element during the final six-second ending; avoid covering the deity and channel logo.'}
sources=[{'title':'YouTube thumbnail specifications','url':'https://support.google.com/youtube/answer/72431?hl=en'}, {'title':'YouTube video chapter requirements','url':'https://support.google.com/youtube/answer/9884579?hl=en'}, {'title':'YouTube AI disclosure guidance','url':'https://support.google.com/youtube/answer/14328491?hl=en'}]
assert len(title)<=100 and len(description)<=5000
# Tags include separators and an additional pair of quotes for each tag with spaces.
tagCount=sum(len(t)+(2 if ' ' in t else 0) for t in tags)+len(tags)-1
assert tagCount<=500
for name,text in [('title.txt',title),('description.txt',description),('tags.txt',', '.join(tags)),('hashtags.txt',' '.join(hashtags)),('chapters.txt',chapterText),('pinned-comment.txt',comment)]:
 (OUT/name).write_text(text+'\n',encoding='utf8')
shutil.copyfile(ROOT/'full-telugu-captions.srt',OUT/'Telugu-Script-Lyrics.srt')
details={'title':title,'description':description,'tags':tags,'hashtags':hashtags,'pinnedComment':comment,'settings':settings,'video':verification['file'],'durationSeconds':verification['durationSeconds'],'thumbnails':{'desktop':'Sri-Venkateswara-Suprabhatham-Thumbnail-4K.jpg','mobile':'Sri-Venkateswara-Suprabhatham-Thumbnail-Mobile.jpg'},'sources':sources,'published':False}
(OUT/'youtube-details.json').write_text(json.dumps(details,ensure_ascii=False,indent=2),encoding='utf8')
allText=f'''YOUTUBE UPLOAD DETAILS — DIVINE WISDOM TELUGU

TITLE
{title}

DESCRIPTION — paste this entire section into YouTube Studio
{description}

TAGS — paste into the Tags field
{', '.join(tags)}

PINNED COMMENT — post and pin after publishing
{comment}

UPLOAD SETTINGS
'''+ '\n'.join(f'{k}: {v}' for k,v in settings.items())+f'''

FILES
Video: {verification['file']}
Desktop thumbnail: Sri-Venkateswara-Suprabhatham-Thumbnail-4K.jpg
Mobile thumbnail: Sri-Venkateswara-Suprabhatham-Thumbnail-Mobile.jpg
Captions: Telugu-Script-Lyrics.srt
Duration: {verification['durationSeconds']:.2f} seconds (approximately 10 minutes)

CREATOR NOTES (not part of the public description)
The generated voice is not credited to or represented as a recording by any real singer.
Pronunciation listening review is still pending; see the existing pronunciation review report before public release.
The six-second ending is included within the final chapter so every chapter is at least ten seconds long.
The 4K thumbnail is a resized export of the generated artwork, not native 4K detail. Use the mobile JPG for the mobile 2 MB limit.
No upload, publication, playlist change, or comment posting has been performed.

PLATFORM REFERENCES
'''+ '\n'.join(f"{s['title']}: {s['url']}" for s in sources)
(OUT/'YouTube-Upload-Details.txt').write_text(allText+'\n',encoding='utf8')
checks={'titleCharacters':len(title),'descriptionCharacters':len(description),'tagsCharactersConservative':tagCount,'chapters':len(chapters),'allChapterLengthsAtLeast10Seconds':True,'videoMatchesRenderedFile':(ROOT/verification['file']).exists(),'publicCopyHasNoApprovalLabels':'approved' not in (title+description+comment).lower(),'thumbnailImages':[]}
for name,size in [('Sri-Venkateswara-Suprabhatham-Thumbnail-4K.jpg',(3840,2160)),('Sri-Venkateswara-Suprabhatham-Thumbnail-Mobile.jpg',(1280,720))]:
 path=OUT/name
 with Image.open(path) as im:assert im.size==size;im.verify()
 limit=(2 if 'Mobile' in name else 50)*1024*1024
 assert path.stat().st_size<limit
 checks['thumbnailImages'].append({'file':name,'dimensions':size,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
(OUT/'package-validation.json').write_text(json.dumps(checks,indent=2),encoding='utf8')
archive=OUT/'Sri-Venkateswara-Suprabhatham-YouTube-Package.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for path in OUT.iterdir():
  if path.is_file() and path.suffix in ['.txt','.json','.jpg','.srt']:z.write(path,path.name)
print(json.dumps(checks))
