from pathlib import Path
import json,zipfile
from PIL import Image
ROOT=Path('data/productions/divine-wisdom/ayyappa-birth-story-three-part-2026-10-22')
title='అయ్యప్ప స్వామి జన్మకథ | హరిహరసుతుని అవతారం | Telugu Ayyappa Devotional Song'
alternatives=['అయ్యప్ప జన్మకథ పాటగా | మణికంఠుని అవతారం నుంచి శబరిమల వరకు','హరిహర సుతుడా శరణం అయ్యప్పా | అయ్యప్ప జన్మకథ | Telugu Bhakti Song']
chapters=[('00:00','దివ్య జననం — మణికంఠుని ఆగమనం'),('01:05','హరిహర సుతుడా — పల్లవి'),('01:32','బాల్యం — మహిషి సంహారం'),('02:45','హరిహర సుతుడా — పల్లవి'),('03:13','పందళానికి తిరుగు — శబరిమల')]
chaptertext='\n'.join(f'{t} {name}' for t,name in chapters)
description=f'''అయ్యప్ప స్వామి జన్మకథను తెలుగు భక్తి గీతంగా ఆలకించండి — హరిహరసుతుని అవతారం నుంచి శబరిమల దివ్య సంకల్పం వరకు.
మణికంఠుని జననం, రాజశేఖరుని ప్రేమ, మహిషి సంహారం, ధర్మశాస్తగా స్వామి దివ్య కార్యాన్ని మూడు కథాభాగాలు, ఒకే మధుర పల్లవితో ఈ గీతం వినిపిస్తుంది.

Divine Wisdom Telugu ఛానల్‌కు స్వాగతం!

పల్లవి:
హరిహర సుతుడా శరణం అయ్యప్పా
మణికంఠ స్వామీ శరణం అయ్యప్పా
ధర్మము నిలిపే దయగల దైవమా
మా హృదయ మందిరం నీదే అయ్యప్పా

వీడియోలోని భాగాలు:
{chaptertext}

ఈ గీతంలో మీకు హృదయానికి హత్తుకున్న ఘట్టం ఏది? కామెంట్‌లో చెప్పండి. గీతం నచ్చితే లైక్ చేయండి, మీ కుటుంబ సభ్యులు మరియు స్నేహితులతో షేర్ చేయండి. మరిన్ని తెలుగు భక్తి గీతాల కోసం Divine Wisdom Telugu ఛానల్‌కు సబ్‌స్క్రైబ్ చేయండి.

కథా నేపథ్యం:
ఈ గీతం అయ్యప్ప స్వామి గురించి భక్తి సంప్రదాయంలో ప్రసిద్ధమైన కథనం ఆధారంగా రూపొందించిన కళాత్మక కథాగీతం. కేరళ పర్యాటక శాఖ వివరించిన సంప్రదాయ కథనాన్ని ఆధారంగా తీసుకున్నాం. ప్రాంతీయ సంప్రదాయాల్లో కొన్ని వివరాలు మారవచ్చు.
మూలాలు:
https://www.keralatourism.org/sabarimala/mythology
https://www.keralatourism.org/sabarimala/history

ఈ వీడియో కోసం కొత్తగా రూపొందించిన తెలుగు సాహిత్యం. సంగీతం, గానం, భక్తి కళాచిత్రాలు AI సహాయంతో రూపొందించబడ్డాయి. తెరపై తెలుగు పాట సాహిత్యాన్ని అనుసరించవచ్చు.

కథనం లేదా ఉచ్చారణలో సవరణ సూచించాలనుకుంటే, సంబంధిత మూలంతో కామెంట్ చేయండి.

శరణం అయ్యప్పా!

#AyyappaTeluguSongs #AyyappaJanmaKatha #DivineWisdomTelugu'''
tags=['అయ్యప్ప స్వామి జన్మకథ','అయ్యప్ప పాటలు','అయ్యప్ప భక్తి గీతం','హరిహరసుతుని అవతారం','మణికంఠుడు','శరణం అయ్యప్పా','Ayyappa Janma Katha','Ayyappa Telugu Songs','Ayyappa Devotional Song','Ayyappa Birth Story','Harihara Suthan','Manikanta Telugu Song','Manikandan','Swamiye Saranam Ayyappa','Sabarimala Ayyappa','Pandalam Ayyappa','Telugu Bhakti Songs','Divine Wisdom Telugu']
pinned='శరణం అయ్యప్పా! 🙏 మణికంఠుని జననం, మహిషి సంహారం, శబరిమల ఘట్టం — ఈ గీతంలో మీకు హృదయానికి హత్తుకున్న భాగం ఏది? కామెంట్‌లో చెప్పండి. గీతం నచ్చితే లైక్ చేయండి, షేర్ చేయండి. మరిన్ని తెలుగు భక్తి గీతాల కోసం Divine Wisdom Telugu ఛానల్‌కు సబ్‌స్క్రైబ్ చేయండి.'
settings={'videoFile':'Ayyappa-Hariharasutuni-Avataram-Final-4m23s-1080p.mp4','thumbnailFile':'youtube-thumbnail.jpg','captionFile':'captions-final-te.srt','videoLanguage':'Telugu (te)','titleAndDescriptionLanguage':'Telugu (te)','category':'Music','suggestedPlaylist':'అయ్యప్ప భక్తి గీతాలు | Ayyappa Telugu Songs','aiUseDisclosure':'Yes — AI-generated music is the focus of this video. Use the applicable AI use / altered content setting shown in Studio.','audienceGuidance':'General-audience devotional music; use Not made for kids if this matches your intended audience. A child deity in the artwork alone does not decide the audience.','visibility':'Owner choice; no upload or publishing performed','beforePublishing':'Final Telugu listening review remains pending from production. Review the final video and confirm pronunciation before publishing.','disclosureReference':'https://support.google.com/youtube/answer/14328491?hl=en'}
assert len(title)<=100 and all(len(t)<=100 for t in alternatives)
assert len(description)<=5000
assert len(', '.join(tags))<=500
for i,(timestamp,_) in enumerate(chapters):
 m,s=map(int,timestamp.split(':'));start=m*60+s
 end=(int(chapters[i+1][0].split(':')[0])*60+int(chapters[i+1][0].split(':')[1])) if i+1<len(chapters) else 263.0
 assert end-start>=10
data={'title':title,'alternativeTitles':alternatives,'description':description,'tags':tags,'hashtags':['#AyyappaTeluguSongs','#AyyappaJanmaKatha','#DivineWisdomTelugu'],'chapters':[{'timestamp':t,'title':n} for t,n in chapters],'pinnedComment':pinned,'uploadSettings':settings,'thumbnailText':['అయ్యప్ప','జన్మకథ','హరిహరసుతుని అవతారం'],'channel':'Divine Wisdom Telugu','durationSeconds':263.0,'storyEndsSeconds':257.0,'closingCardSeconds':6.0,'published':False}
def txt(n,s):(ROOT/n).write_text(s+'\n',encoding='utf8')
txt('youtube-title.txt',title);txt('youtube-description.txt',description);txt('youtube-tags.txt',', '.join(tags));txt('youtube-chapters.txt',chaptertext);txt('youtube-pinned-comment.txt',pinned)
(ROOT/'youtube-upload-package.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
details='TITLE\n'+title+'\n\nDESCRIPTION\n'+description+'\n\nTAGS (comma-separated)\n'+', '.join(tags)+'\n\nPINNED COMMENT\n'+pinned+'\n\nUPLOAD SETTINGS\n'+'\n'.join(f'{k}: {v}' for k,v in settings.items())+'\n\nALTERNATIVE TITLES\n'+'\n'.join(alternatives)
txt('youtube-upload-details.txt',details)
master=ROOT/'youtube-thumbnail-master.png'
if master.exists():
 with Image.open(master) as im:
  im.convert('RGB').resize((1280,720),Image.Resampling.LANCZOS).save(ROOT/'youtube-thumbnail.jpg',quality=95,optimize=True)
 assert (ROOT/'youtube-thumbnail.jpg').stat().st_size<2_000_000
 files=['youtube-thumbnail.jpg','youtube-title.txt','youtube-description.txt','youtube-tags.txt','youtube-chapters.txt','youtube-pinned-comment.txt','youtube-upload-package.json','youtube-upload-details.txt','captions-final-te.srt','lyrics-final-telugu.txt','production-notes.json','youtube-thumbnail-prompt.txt']
 with zipfile.ZipFile(ROOT/'Ayyappa-YouTube-Details-and-Thumbnail.zip','w',zipfile.ZIP_DEFLATED) as z:
  for name in files:z.write(ROOT/name,arcname=name)
print(json.dumps({'titleCharacters':len(title),'descriptionCharacters':len(description),'tagsCharacters':len(', '.join(tags)),'chapters':len(chapters),'thumbnailReady':master.exists()}),flush=True)
