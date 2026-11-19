from pathlib import Path
import json,zipfile,shutil
from PIL import Image

ROOT=Path('output/gayatri-mantra-108-original-2026-10-22/animated-v2')
OUT=ROOT/'youtube-package';OUT.mkdir(exist_ok=True)
verification=json.loads((ROOT/'full-verification.json').read_text(encoding='utf8'))
assert verification['fullDecodePassed'] and verification['seconds']==1323
title='Gayatri Mantra 108 Times | గాయత్రీ మంత్రం 108 సార్లు | Telugu Lyrics'
tags=['Gayatri Mantra','Gayatri Mantra 108 Times','Gayatri Mantra Telugu Lyrics','గాయత్రీ మంత్రం','గాయత్రీ మంత్రం 108 సార్లు','Om Bhur Bhuva Swaha','Om Bhur Bhuvah Swaha','Sanskrit Mantra','Female Gayatri Chant','Telugu Devotional','Morning Prayer','Gayatri Japa','Divine Wisdom Telugu']
hashtags=['#GayatriMantra','#GayatriMantra108Times','#DivineWisdomTelugu']
chapters=[]
for count,label in [(1,'ప్రారంభం | Repetitions 1–27'),(28,'జపం 28–54 | Repetitions 28–54'),(55,'జపం 55–81 | Repetitions 55–81'),(82,'జపం 82–99 | Repetitions 82–99'),(100,'జపం 100–107 | Repetitions 100–107'),(108,'108వ జపం | Final repetition')]:
 t=int((count-1)*12.25+.5);chapters.append({'repetition':count,'seconds':t,'label':label,'text':f'{t//60:02}:{t%60:02} {label}'})
assert chapters[0]['seconds']==0 and all(b['seconds']-a['seconds']>=10 for a,b in zip(chapters,chapters[1:]))
assert 1323-chapters[-1]['seconds']>=10
chaptertext='\n'.join(c['text'] for c in chapters)
description='''గాయత్రీ మంత్రం 108 సార్లు 🙏 | Gayatri Mantra 108 Times with Telugu Lyrics

తెలుగు సాహిత్యంతో గాయత్రీ మంత్రాన్ని 108 సార్లు ఆలకించండి. మధురమైన స్త్రీ స్వరంలో భక్తితో పాడిన ఈ మంత్రాన్ని ఉదయ ప్రార్థన, ధ్యానం లేదా మీ రోజువారీ జప సమయంలో వినవచ్చు.

ఈ వీడియోలో సంస్కృత మంత్రాన్ని తెలుగు లిపిలో చూపించాం. జపాల మధ్య పెద్ద విరామాలు లేకుండా, సున్నితమైన సంగీతం, తిరిగే స్వర్ణ చక్రం, ప్రశాంతమైన సూర్యోదయ దృశ్యంతో అందిస్తున్నాం.

గాయత్రీ మంత్రం:
ఓం భూర్భువః స్వః
తత్సవితుర్వరేణ్యం
భర్గో దేవస్య ధీమహి
ధియో యో నః ప్రచోదయాత్ ॥

Listen to the Gayatri Mantra repeated exactly 108 times in 22 minutes and 3 seconds, with melodic female chanting and Sanskrit lyrics displayed in Telugu script. This continuous devotional rendition includes gentle accompaniment and a slowly rotating golden chakra.

Mantra transliteration:
Om bhur bhuvah svah
Tat savitur varenyam
Bhargo devasya dhimahi
Dhiyo yo nah prachodayat.

మంత్రజపం సమయాలు | CHAPTERS
'''+chaptertext+'''

ఇలాంటి భక్తి వీడియోల కోసం Divine Wisdom Telugu ఛానల్‌ను సబ్‌స్క్రైబ్ చేయండి. వీడియో నచ్చితే లైక్ చేయండి, మీ కుటుంబ సభ్యులు, స్నేహితులతో షేర్ చేయండి. మీరు ఈ మంత్రాన్ని ఎప్పుడు వింటారో కామెంట్‌లో తెలియజేయండి.

Subscribe to Divine Wisdom Telugu for more devotional chants and Telugu lyric videos. Like, share, and tell us when you enjoy listening to this mantra.

Traditional Sanskrit mantra. This is an original AI-generated devotional vocal and music rendition with AI-generated artwork and animated graphics, created for Divine Wisdom Telugu.
Text reference: https://stotranidhi.com/gayatri-mantra-in-telugu

'''+ ' '.join(hashtags)
comment='ఓం భూర్భువః స్వః 🙏 మీరు గాయత్రీ మంత్రాన్ని ఉదయం వింటారా, సాయంత్రం వింటారా? కామెంట్‌లో తెలియజేయండి. మరిన్ని భక్తి వీడియోల కోసం Divine Wisdom Telugu ఛానల్‌ను సబ్‌స్క్రైబ్ చేయండి. వీడియో నచ్చితే లైక్ చేసి, మీ కుటుంబ సభ్యులు, స్నేహితులతో షేర్ చేయండి.'
assert len(title)<=100 and len(description)<=5000
tagchars=sum(len(t)+(2 if ' ' in t else 0) for t in tags)+len(tags)-1
assert tagchars<=500
settings={'channel':'Divine Wisdom Telugu','category':'Music','videoLanguage':'Sanskrit (audio)','captionLanguage':'Telugu (Sanskrit mantra written in Telugu script)','titleDescriptionLanguages':'English and Telugu','audience':'General devotional audience; not specifically made for children','alteredOrSyntheticContent':'Yes — original AI-generated singing and music','initialVisibility':'Private for the final listening check; choose publication time in YouTube Studio','license':'Standard YouTube License','suggestedPlaylist':'Gayatri Mantra & Devotional Chants — use an existing suitable playlist or create this if desired','comments':'On; choose your usual moderation settings','paidPromotion':'No, unless this upload has a sponsorship or paid placement','thumbnail':'Gayatri-Mantra-108-Thumbnail-4K.jpg (desktop); Gayatri-Mantra-108-Thumbnail-Mobile.jpg (mobile)','subtitles':'Telugu-Lyrics-108.srt — one complete mantra caption per repetition','chapterTiming':'Nearest whole-second markers derived from the 12.25-second chant cycle'}
sources=[{'title':'YouTube custom thumbnail specifications','url':'https://support.google.com/youtube/answer/72431?hl=en'},{'title':'YouTube synthetic content disclosure','url':'https://support.google.com/youtube/answer/14328491?hl=en'},{'title':'YouTube video chapters','url':'https://support.google.com/youtube/answer/9884579?hl=en'}]
for name,text in [('title.txt',title),('description.txt',description),('tags.txt',', '.join(tags)),('hashtags.txt',' '.join(hashtags)),('pinned-comment.txt',comment),('chapters.txt',chaptertext)]:
 (OUT/name).write_text(text+'\n',encoding='utf8')
shutil.copyfile(ROOT/'Gayatri-Mantra-108-Telugu.srt',OUT/'Telugu-Lyrics-108.srt')
details={'title':title,'description':description,'tags':tags,'hashtags':hashtags,'pinnedComment':comment,'settings':settings,'video':verification['file'],'durationSeconds':1323,'repetitions':108,'chapters':chapters,'sources':sources,'published':False,'titleCharacters':len(title),'descriptionCharacters':len(description),'tagCharacters':tagchars}
(OUT/'youtube-details.json').write_text(json.dumps(details,ensure_ascii=False,indent=2),encoding='utf8')
alltext='YOUTUBE UPLOAD DETAILS — DIVINE WISDOM TELUGU\n\nTITLE\n'+title+'\n\nDESCRIPTION\n'+description+'\n\nTAGS\n'+', '.join(tags)+'\n\nPINNED COMMENT\n'+comment+'\n\nUPLOAD SETTINGS\n'+'\n'.join(f'{k}: {v}' for k,v in settings.items())+'\n\nVIDEO\n'+verification['file']+'\nDuration: 22:03 | 108 repetitions | 1920 x 1080\n\nTHUMBNAILS\nThe 4K JPG is an upscale of the generated thumbnail, not native 4K detail. The mobile JPG is below 2 MB.\n\nPLATFORM REFERENCES\n'+'\n'.join(f"{s['title']}: {s['url']}" for s in sources)+'\n\nNo video upload, publication, playlist creation or comment posting has been performed.\n'
(OUT/'YouTube-Upload-Details.txt').write_text(alltext,encoding='utf8')
thumb=OUT/'thumbnail-generated.png'
if thumb.exists():
 im=Image.open(thumb).convert('RGB')
 assert abs(im.width/im.height-16/9)<.03
 # Fit to exact 16:9 by a centered crop before exporting upload-ready JPGs.
 from PIL import ImageOps
 for name,size in [('Gayatri-Mantra-108-Thumbnail-4K.jpg',(3840,2160)),('Gayatri-Mantra-108-Thumbnail-Mobile.jpg',(1280,720)),('Thumbnail-Feed-Preview.jpg',(320,180))]:
  target=OUT/name;ImageOps.fit(im,size,method=Image.Resampling.LANCZOS).save(target,quality=94,optimize=True)
  if size==(1280,720):assert target.stat().st_size<2000000
 package=OUT/'Gayatri-Mantra-108-YouTube-Package.zip'
 with zipfile.ZipFile(package,'w',zipfile.ZIP_DEFLATED) as z:
  for p in OUT.iterdir():
   if p.is_file() and p.suffix.lower() in ['.txt','.json','.jpg','.srt']:z.write(p,p.name)
 save={'thumbnailSourcePixels':im.size,'desktopPixels':[3840,2160],'mobilePixels':[1280,720],'mobileBytes':(OUT/'Gayatri-Mantra-108-Thumbnail-Mobile.jpg').stat().st_size,'desktopBytes':(OUT/'Gayatri-Mantra-108-Thumbnail-4K.jpg').stat().st_size,'titleCharacters':len(title),'descriptionCharacters':len(description),'tagCharacters':tagchars,'chapterCount':len(chapters),'uploadPerformed':False}
 (OUT/'package-verification.json').write_text(json.dumps(save,indent=2),encoding='utf8')
print(json.dumps({'directory':str(OUT.resolve()),'titleCharacters':len(title),'descriptionCharacters':len(description),'tagCharacters':tagchars,'thumbnailAvailable':thumb.exists()}))
