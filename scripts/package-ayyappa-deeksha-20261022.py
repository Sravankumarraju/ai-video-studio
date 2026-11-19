from pathlib import Path
import json,zipfile
from PIL import Image
ROOT=Path('data/productions/divine-wisdom/ayyappa-deeksha-2026-10-22')
DEST=ROOT/'youtube-package';DEST.mkdir(exist_ok=True)
t=json.loads((ROOT/'timeline.json').read_text(encoding='utf8'))
plan=json.loads((ROOT/'plan.json').read_text(encoding='utf8'))
title='అయ్యప్ప దీక్ష ఎందుకు? 41 రోజుల ఆచారం, అర్థం | Ayyappa Deeksha Telugu'
alternatives=['అయ్యప్ప మాల ఎందుకు ధరిస్తారు? 41 రోజుల దీక్ష అర్థం | Telugu Explainer','అయ్యప్ప దీక్ష: ఏది ఆచారం? ఏది ఆధ్యాత్మిక అర్థం? | 41 Days Vratham']
ids=['welcome','vow','forty-one','evidence','practices','restraint','variation','symbols','interpretation','irumudi','takeaway','closing']
def stamp(s):
 n=int(s);return f'{n//60:02}:{n%60:02}'
chapters=[{'timestamp':stamp(s['start']),'title':s['title'],'seconds':s['start']} for s in t['scenes'] if s['id'] in ids]
chaptertext='\n'.join(f'{c["timestamp"]} {c["title"]}' for c in chapters)
description=f'''అయ్యప్ప దీక్ష 41 రోజులు ఎందుకు? మాలధారణ, శాకాహారం, సంయమనం, ఇరుముడి ఆచారాల అర్థాన్ని తెలుగులో తెలుసుకుందాం.
శబరిమల సంప్రదాయం, ప్రాంతీయ ఆచార భేదాలు, ఆధ్యాత్మిక వ్యాఖ్యానాల మధ్య తేడాను స్పష్టంగా వివరించే వీడియో.

డివైన్ విజ్డమ్ తెలుగు ఛానల్‌కు స్వాగతం!

ఈ వీడియోలో:
• దీక్ష అంటే ఏమిటి? మాలధారణ దేనికి సూచిక?
• శబరిమల సంప్రదాయంలో 41 రోజుల మండల వ్రతం
• ప్రధాన ఆచరణలు, స్థానిక పద్ధతుల్లో భేదాలు
• వస్త్రాలు, మాల గురించి చెప్పుకునే ప్రతీకాత్మక అర్థాలు
• ఇరుముడి, యాత్ర, దీక్ష తరువాత కొనసాగించగల మంచి ఆచరణలు

వీడియో భాగాలు:
{chaptertext}

మీ కుటుంబం లేదా ప్రాంతంలో అయ్యప్ప దీక్షకు సంబంధించిన ప్రత్యేక పద్ధతి ఏమిటి? అది ఏ ప్రాంతపు సంప్రదాయమో కామెంట్‌లో చెప్పండి.
ఈ వీడియో ఉపయోగపడితే లైక్ చేయండి, మీ కుటుంబ సభ్యులు మరియు స్నేహితులతో షేర్ చేయండి. మరిన్ని తెలుగు భక్తి పాటలు, ఆచారాల వివరణల కోసం Divine Wisdom Telugu ఛానల్‌ను సబ్‌స్క్రైబ్ చేయండి.

ఆధారాలు:
శబరిమల అధికారిక ఆచార సమాచారం:
https://sabarimala.kerala.gov.in/index.php/node/541
కేరళ ప్రభుత్వ పర్యాటక శాఖ — శబరిమల ఆచారాలు:
https://www.keralatourism.org/sabarimala/rituals
అయ్యప్ప సమాజం — వ్రత ఆచరణలో ప్రాంతీయ భేదాల కోసం భక్త సంఘం మార్గదర్శకం:
https://ayyappasamaaj.org/vratam/

ఆధారాల సందర్భం: 41 రోజుల వ్యవధికి శబరిమల అధికారిక సమాచారాన్ని అనుసరించాం. భక్త సంఘం పేజీలో రోజుల లెక్కింపు భిన్నంగా ఉంది; దాన్ని వ్యవధికి ఆధారంగా ఉపయోగించలేదు. స్థానిక ఆచారాలు మారవచ్చు. మొదటిసారి దీక్ష తీసుకునేవారు తమ గురుస్వామి లేదా ఆలయ మార్గదర్శకత్వాన్ని తెలుసుకోవచ్చు.

వీడియోలో ఆధ్యాత్మిక వ్యాఖ్యానాలను వ్యాఖ్యానాలుగానే పరిచయం చేశాం. మెదడు మార్పులు, వ్యాధి నివారణ లేదా ఇతర నిర్దిష్ట ఆరోగ్య ఫలితాలను శాస్త్రీయంగా నిరూపితమైనవిగా ప్రకటించడం లేదు.

ఈ వీడియోలో తెలుగు వాయిస్ ఓవర్, ఐదు కళాచిత్రాలు AI సహాయంతో రూపొందించబడ్డాయి. ఇవి ఆచారాలను వివరించే కళాత్మక దృశ్యాలు; నిజ సంఘటనల చిత్రీకరణ లేదా శబరిమల నిర్మాణానికి ఖచ్చితమైన దృశ్య రికార్డు కాదు.

స్వామియే శరణం అయ్యప్ప!

#AyyappaDeeksha #AyyappaTelugu #DivineWisdomTelugu
'''
tags=['అయ్యప్ప దీక్ష','అయ్యప్ప మాల','41 రోజుల దీక్ష','అయ్యప్ప దీక్ష ఎందుకు','అయ్యప్ప స్వామి','శబరిమల','ఇరుముడి','Ayyappa Deeksha','Ayyappa Deeksha Telugu','41 days vratham','Mandala Vratham','Ayyappa Mala','Sabarimala Telugu','Ayyappa Telugu','Telugu Devotional','Divine Wisdom Telugu']
pinned='స్వామియే శరణం అయ్యప్ప! 🙏 మీ కుటుంబం లేదా ప్రాంతంలో దీక్షకు సంబంధించిన ప్రత్యేక ఆచారం ఏమిటి? అది ఏ ప్రాంతపు పద్ధతో చెప్పండి. దీక్ష తరువాత కూడా కొనసాగించాలని అనుకునే మంచి ఆచరణ ఏది? ఇతరుల సంప్రదాయాలను గౌరవిస్తూ కామెంట్ చేయండి. వివరణ ఉపయోగపడితే లైక్, షేర్ చేసి మన Divine Wisdom Telugu ఛానల్‌ను సబ్‌స్క్రైబ్ చేయండి.'
settings={'videoFile':'Ayyappa-Deeksha-41-Days-Telugu-1080p.mp4','thumbnailFile':'youtube-package/thumbnail-youtube.jpg','captionFile':'telugu-captions.srt','videoLanguage':'Telugu (te)','titleDescriptionLanguage':'Telugu (te)','category':'Education','categoryId':'27','suggestedPlaylist':'అయ్యప్ప పాటలు, ఆచారాల వివరణలు | Ayyappa Telugu','audience':'General audience; suggested Not made for kids because this is a general educational explainer, not specifically directed to children. Owner confirms intended audience.','visibility':'Private for owner review; no upload or publishing executed','aiUse':'AI narration and devotional illustrations disclosed in description. In Studio AI use attribute, disclose if visual realism meets current platform criteria. Conservative suggested selection: Yes, because several generated scenes depict realistic people performing rituals.','endScreen':{'start':stamp(t['seconds']-20),'end':stamp(t['seconds']),'elements':['Subscribe to Divine Wisdom Telugu','Related Ayyappa song selected from your existing channel library'],'note':'Add interactive elements in YouTube Studio after upload; video contains the spoken and visual request.'},'cards':{'suggestedTime':stamp(next(s['start'] for s in t['scenes'] if s['id']=='irumudi')),'target':'Existing Ayyappa song or playlist chosen by the owner; no invented URL.'},'references':{'chapters':'https://support.google.com/youtube/answer/9884579?hl=en','thumbnail':'https://support.google.com/youtube/answer/72431?hl=en','aiUse':'https://support.google.com/youtube/answer/14328491?hl=en'}}
if (ROOT/'VERIFICATION-v2.json').exists():
 settings['videoFile']='Ayyappa-Deeksha-41-Days-Telugu-1080p-v2.mp4'
 settings['opening']='Existing thumbnail shown from 00:00 to 00:07, with spoken and visible channel welcome. Narration, captions and chapter timing unchanged.'
assert len(title)<=100 and all(len(s)<=100 for s in alternatives)
assert len(description)<=5000 and len(', '.join(tags))<=500
assert chapters[0]['timestamp']=='00:00' and len(chapters)>=3
for i,c in enumerate(chapters):assert (chapters[i+1]['seconds'] if i+1<len(chapters) else t['seconds'])-c['seconds']>=10
metadata={'channel':'Divine Wisdom Telugu','title':title,'alternativeTitles':alternatives,'description':description,'chapters':chapters,'tags':tags,'hashtags':['#AyyappaDeeksha','#AyyappaTelugu','#DivineWisdomTelugu'],'pinnedComment':pinned,'uploadSettings':settings,'durationSeconds':t['seconds'],'published':False}
(DEST/'youtube-metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf8')
for name,text in [('title',title),('description',description),('tags',', '.join(tags)),('chapters',chaptertext),('pinned-comment',pinned)]:
 (DEST/f'{name}.txt').write_text(text+'\n',encoding='utf8')
details=f'''CHANNEL: Divine Wisdom Telugu
TITLE: {title}

ALTERNATIVE TITLES:
'''+ '\n'.join(alternatives)+f'''\n\nDESCRIPTION:\n{description}\nTAGS:\n{', '.join(tags)}\n\nPINNED COMMENT:\n{pinned}\n\nUPLOAD SETTINGS:\n'''+json.dumps(settings,ensure_ascii=False,indent=2)
(DEST/'youtube-details.txt').write_text(details,encoding='utf8')
(ROOT/'final-script-telugu.txt').write_text('\n\n'.join(s['title']+'\n'+s['text'] for s in t['scenes'])+'\n',encoding='utf8')
if (ROOT/'thumbnail-generated.png').exists():
 with Image.open(ROOT/'thumbnail-generated.png') as im:
  # Export size/format conversion only; artwork and text are from built-in ImageGen.
  im.convert('RGB').resize((3840,2160),Image.Resampling.LANCZOS).save(DEST/'thumbnail-youtube-4k.jpg',quality=94)
  im.convert('RGB').resize((1280,720),Image.Resampling.LANCZOS).save(DEST/'thumbnail-youtube.jpg',quality=94)
 assert (DEST/'thumbnail-youtube.jpg').stat().st_size<2_000_000
else:raise RuntimeError('Generated thumbnail missing')
with zipfile.ZipFile(ROOT/'Ayyappa-Deeksha-YouTube-Package.zip','w',compression=zipfile.ZIP_DEFLATED) as z:
 for f in sorted(DEST.iterdir()):
  if f.is_file():z.write(f,'youtube-package/'+f.name)
 for name in ['telugu-captions.srt','telugu-captions.vtt','final-script-telugu.txt','VERIFICATION.json','art-prompts.json','thumbnail-prompt.json']:z.write(ROOT/name,name)
print(json.dumps({'titleCharacters':len(title),'descriptionCharacters':len(description),'tagCharacters':len(', '.join(tags)),'chapters':len(chapters),'durationSeconds':t['seconds'],'thumbnail':'youtube-package/thumbnail-youtube.jpg','published':False}))
