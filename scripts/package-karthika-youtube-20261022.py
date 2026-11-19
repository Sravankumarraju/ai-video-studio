from pathlib import Path
import json,zipfile,math
ROOT=Path('data/productions/divine-wisdom/karthika-deepam-2026-10-22')
def load(n):return json.loads((ROOT/f'{n}.json').read_text(encoding='utf8'))
def text(n,v):(ROOT/n).write_text(v+'\n',encoding='utf8')
def timestamp(s):return f'{int(s)//60:02}:{int(s)%60:02}'
plan=load('plan');timeline=load('timeline');captions=load('captions')
title='దీపం దీపం కార్తీక దీపం | శివకేశవుల స్మరణ | Karthika Masam Telugu Devotional Song'
alternatives=['కార్తీక దీపం | శివ శివ శంభో కేశవ మాధవ | Original Telugu Bhakti Song','ఇంటింటా కార్తీక దీపం | శివకేశవుల భక్తి గీతం | Divine Wisdom Telugu']
selected=[('opening','ఆరంభం — హరిహర నామం'),('chorus-1','దీపం దీపం కార్తీక దీపం — పల్లవి'),('verse-1a','వేకువ పూజ — శివుని స్మరణ'),('verse-1c','శివకేశవుల కరుణ'),('chorus-2','కార్తీక దీపం — పల్లవి'),('verse-2a','ఇంటింటా సంధ్యదీపం'),('verse-2b','ప్రేమనే పూజ'),('bridge','వెలుగును పంచుదాం'),('chorus-final','చివరి పల్లవి'),('prayer','ముగింపు ప్రార్థన')]
chapters=[]
for key,name in selected:
 starts=[c['start'] for c in captions if c['section']==key]
 if starts:chapters.append({'timestamp':'00:00' if not chapters else timestamp(min(starts)),'title':name})
chaptertext='\n'.join(f'{c["timestamp"]} {c["title"]}' for c in chapters)
description=f'''కార్తీక మాసపు దీపాల వెలుగులో శివకేశవులను స్మరిస్తూ ఆలకించండి — “దీపం దీపం కార్తీక దీపం”, ఒక ఒరిజినల్ తెలుగు భక్తి గీతం.
బిల్వదళం, తులసీదళం, వేకువ పూజ, ఇంటింటా సంధ్యదీపం, దయను పంచే భక్తి — ఈ గీతంలోని ప్రధాన భావాలు.

Divine Wisdom Telugu ఛానల్‌కు స్వాగతం!

పల్లవి:
దీపం దీపం కార్తీక దీపం
ఇంటింట వెలిగే భక్తికి రూపం
శివ శివ శంభో కేశవ మాధవ
మా మది గుడిలో కొలువై నిలవ

వీడియో భాగాలు:
{chaptertext}

మీ ఇంట్లో కార్తీక దీపం వెలిగించే వేళ మీకు గుర్తొచ్చే మధురమైన జ్ఞాపకం ఏమిటి? కామెంట్‌లో పంచుకోండి.
ఈ గీతం నచ్చితే లైక్ చేయండి, కుటుంబ సభ్యులు మరియు స్నేహితులతో షేర్ చేయండి. మరిన్ని తెలుగు భక్తి గీతాల కోసం Divine Wisdom Telugu ఛానల్‌కు సబ్‌స్క్రైబ్ చేయండి.

ఈ వీడియో కోసం కొత్తగా రాసిన తెలుగు సాహిత్యం. సంగీతం, గానం, ఐదు భక్తి కళాచిత్రాలు AI సహాయంతో రూపొందించబడ్డాయి. కళాచిత్రాలు ప్రతీకాత్మకమైనవి; నిజమైన ఆలయ కార్యక్రమపు దృశ్యాలు కావు. తెలుగు పాట క్యాప్షన్లు అందుబాటులో ఉన్నాయి.

Om Namah Shivaya. Namo Narayanaya.
A Telugu devotional song for Karthika Masam, remembering Shiva and Keshava through the light of devotional lamps and compassion.

#KarthikaMasam #ShivaKeshava #DivineWisdomTelugu'''
tags=['కార్తీక మాసం పాటలు','కార్తీక దీపం','శివకేశవుల స్మరణ','శివ పాటలు','తెలుగు భక్తి గీతాలు','Karthika Masam Songs','Karthika Deepam Song','Karthika Masam Telugu','Shiva Keshava Song','Telugu Shiva Songs','Harihara Telugu Song','Om Namah Shivaya','Namo Narayanaya','Telugu Devotional Songs','Original Telugu Bhakti Song','Divine Wisdom Telugu']
pinned='ఓం నమః శివాయ! నమో నారాయణాయ! 🙏 మీ ఇంటి కార్తీక దీపారాధనలో మీకు ఇష్టమైన జ్ఞాపకం ఏమిటి? కామెంట్‌లో పంచుకోండి. గీతం నచ్చితే లైక్ చేయండి, షేర్ చేయండి. మరిన్ని తెలుగు భక్తి గీతాల కోసం Divine Wisdom Telugu ఛానల్‌కు సబ్‌స్క్రైబ్ చేయండి.'
settings={'videoFile':'Karthika-Deepam-Shiva-Keshava-Final-1080p.mp4','thumbnailFile':'youtube-thumbnail.jpg','captionsFile':'captions-te.srt','category':'Music (10)','videoLanguage':'Telugu (te)','titleAndDescriptionLanguage':'Telugu (te)','suggestedPlaylist':'కార్తీక మాసం భక్తి గీతాలు | Karthika Masam Telugu Songs','audience':'General devotional audience; select Not made for kids if that matches the channel audience.','aiUse':'Yes — generated music is the main focus. Select the applicable AI use / altered content setting in Studio.','aiDisclosureReference':'https://support.google.com/youtube/answer/14328491?hl=en','visibility':'Not uploaded; owner chooses visibility and publication date.','license':'Standard YouTube License, subject to the account music license and owner review.','comments':'Suggested: enabled with normal channel moderation.','endScreen':'The final six seconds contain the logo and four actions. Add a clickable channel subscribe element in Studio during this window if desired.','publishTiming':'Prepare release ahead of Karthika Masam after confirming the intended regional observance; no unverified calendar date is assigned.','finalReview':'Watch and listen to the final Telugu video before publication; automated speech recognition cannot certify exact pronunciation.'}
assert len(title)<=100 and all(len(t)<=100 for t in alternatives)
assert len(description)<=5000 and len(description.encode('utf8'))<5000
assert len(', '.join(tags))<=500
for i,c in enumerate(chapters):
 m,s=map(int,c['timestamp'].split(':'));start=m*60+s
 if i+1<len(chapters):m,s=map(int,chapters[i+1]['timestamp'].split(':'));end=m*60+s
 else:end=timeline['seconds']
 assert end-start>=10,(c,end-start)
data={'title':title,'alternativeTitles':alternatives,'description':description,'tags':tags,'hashtags':['#KarthikaMasam','#ShivaKeshava','#DivineWisdomTelugu'],'chapters':chapters,'pinnedComment':pinned,'uploadSettings':settings,'thumbnailText':['కార్తీక','దీపం','శివకేశవుల స్మరణ'],'channel':'Divine Wisdom Telugu','durationSeconds':timeline['seconds'],'published':False}
for name,value in [('youtube-title.txt',title),('youtube-description.txt',description),('youtube-tags.txt',', '.join(tags)),('youtube-chapters.txt',chaptertext),('youtube-pinned-comment.txt',pinned)]:text(name,value)
(ROOT/'youtube-upload-package.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
details='TITLE\n'+title+'\n\nDESCRIPTION\n'+description+'\n\nTAGS\n'+', '.join(tags)+'\n\nPINNED COMMENT\n'+pinned+'\n\nUPLOAD SETTINGS\n'+'\n'.join(f'{k}: {v}' for k,v in settings.items())+'\n\nALTERNATIVE TITLES\n'+'\n'.join(alternatives)
text('youtube-upload-details.txt',details)
text('lyrics-performed-captioned-te.txt','\n'.join(c['text'] for c in captions)+'\n\nOnly confidently matched lines are shown; see caption-audit.json for omitted or uncertain lines. The written source lyrics are in lyrics-telugu.txt.')
notes={'channel':'Divine Wisdom Telugu','fiveOriginalImages':[x.name for x in (ROOT/'artwork').glob('*.png')],'imageTool':'Built-in imagegen; prompts and original source paths recorded in image-prompts.json','logoSource':'data/branding/divine-wisdom/youtube-avatar/divine-wisdom-telugu-circle-safe.png','songProvider':'ElevenLabs music_v2_5','originalSongSeconds':timeline['songSeconds'],'welcome':'On-screen channel name and Telugu welcome during first 5.8 seconds, vocals start immediately','closing':'6 seconds after complete song, logo and subscribe/like/share/comment in Telugu and English','audioSpedUp':False,'captionAudit':load('caption-audit'),'musicGenerationAttempts':2,'firstAttempt':'HTTP 200 multipart connection failed before a usable audio file arrived; saved song ID retained. Official API music history recovery unavailable.','secondAttempt':'Raw MP3 saved incrementally and completed. No further music generation.','manualListeningVerified':False,'published':False,'references':['https://elevenlabs.io/docs/api-reference/history/list','https://support.google.com/youtube/answer/14328491?hl=en','https://support.google.com/youtube/answer/57407?hl=en']}
(ROOT/'production-notes.json').write_text(json.dumps(notes,ensure_ascii=False,indent=2),encoding='utf8')
files=['youtube-thumbnail.jpg','youtube-title.txt','youtube-description.txt','youtube-tags.txt','youtube-chapters.txt','youtube-pinned-comment.txt','youtube-upload-package.json','youtube-upload-details.txt','captions-te.srt','lyrics-telugu.txt','lyrics-performed-captioned-te.txt','production-notes.json','caption-audit.json','image-prompts.json']
if (ROOT/'verification.json').exists():files+=['verification.json','review-contact-sheet.jpg']
with zipfile.ZipFile(ROOT/'Karthika-Deepam-YouTube-Package.zip','w',zipfile.ZIP_DEFLATED) as z:
 for name in files:z.write(ROOT/name,arcname=name)
 for path in (ROOT/'artwork').glob('*.png'):z.write(path,arcname='artwork/'+path.name)
print(json.dumps({'titleCharacters':len(title),'descriptionCharacters':len(description),'descriptionBytes':len(description.encode('utf8')),'tagsCharacters':len(', '.join(tags)),'chapters':len(chapters),'zip':str((ROOT/'Karthika-Deepam-YouTube-Package.zip').resolve())}),flush=True)
