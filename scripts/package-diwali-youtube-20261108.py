from pathlib import Path
import json,zipfile
P=Path('data/productions/divine-wisdom/diwali-special-2026-11-08')
timeline=json.loads((P/'long-timeline.json').read_text(encoding='utf8'))
chapters='\n'.join(f'{int(0 if i==0 else s["start"])//60:02}:{int(0 if i==0 else s["start"])%60:02} {s["title"]}' for i,s in enumerate(timeline['scenes']))
long_description=f'''దీపావళి ఎందుకు జరుపుకుంటాం? దీపాలు వెలిగించడం, శ్రీరాముని అయోధ్య ఆగమన సంప్రదాయం, నరక చతుర్దశి, లక్ష్మీపూజ వెనుక ఉన్న భావాలను సరళమైన తెలుగులో తెలుసుకుందాం.

ఈ దీపావళి ప్రత్యేక వీడియోలో:
• దీపావళి అనే పేరుకు అర్థం
• ప్రాంతాల వారీగా వినిపించే పండుగ కథలు
• శ్రీకృష్ణుడు, సత్యభామతో అనుసంధానమైన నరకాసుర కథనం
• లక్ష్మీపూజ, ఇంటి అలంకరణ, ఆత్మీయులతో పండుగ
• ఇంట్లో దీపంతో పాటు మనసులో దయను వెలిగించే చిన్న మంచి సంకల్పాలు

భక్తి కథలు, పండుగల విశేషాల కోసం Divine Wisdom Telugu ఛానల్‌ను సబ్‌స్క్రైబ్ చేయండి. వీడియో నచ్చితే లైక్ చేసి మీ కుటుంబంతో షేర్ చేయండి. మీ ఇంటి దీపావళి సంప్రదాయాన్ని కామెంట్‌లో చెప్పండి.

వీడియో భాగాలు:
{chapters}

పరిశోధన ఆధారాలు:
Incredible India: https://www.incredibleindia.gov.in/en/festivals-and-events/diwali
Delhi Tourism: https://delhitourism.gov.in/dt/festivals/diwali.html
Smithsonian National Museum of Asian Art: https://asia.si.edu/whats-on/events/celebrations/diwali/

కథలు భక్తి, ప్రాంతీయ సంప్రదాయాలుగా వివరించబడ్డాయి. ఆచారాలు కుటుంబాన్ని, ప్రాంతాన్ని బట్టి మారవచ్చు. చిత్రాలు, తెలుగు వాయిస్ AI సహాయంతో రూపొందించబడ్డాయి.

#దీపావళి #DiwaliTelugu #DivineWisdomTelugu'''
short_description='''దీపావళిని ఎందుకు జరుపుకుంటాం? దీపాల సందేశం, ప్రాంతాల వారీ సంప్రదాయాలు, లక్ష్మీపూజ గురించి ఒక నిమిషంలో తెలుసుకుందాం. 🪔

ఇంట్లో దీపం… మనసులో దయ. మీ కుటుంబానికి దీపావళి శుభాకాంక్షలు!

భక్తి కథలు, పండుగల విశేషాల కోసం Divine Wisdom Telugu ఛానల్‌ను సబ్‌స్క్రైబ్ చేయండి. లైక్ చేసి, షేర్ చేయండి. మీ ఇంటి దీపావళి విశేషాన్ని కామెంట్‌లో చెప్పండి.

చిత్రాలు, తెలుగు వాయిస్ AI సహాయంతో రూపొందించబడ్డాయి.

#Shorts #DiwaliTelugu #దీపావళి'''
tags=['దీపావళి','దీపావళి ఎందుకు జరుపుకుంటాం','దీపావళి విశిష్టత','Diwali Telugu','Deepavali Telugu','why do we celebrate Diwali','Diwali story in Telugu','Lakshmi puja Telugu','Naraka Chaturdashi','Telugu festivals','Divine Wisdom Telugu']
package={
 'channel':'Divine Wisdom Telugu','status':'Prepared locally; not uploaded or published',
 'long':{'title':'దీపావళి ఎందుకు జరుపుకుంటాం? | కథలు, దీపాల ప్రాధాన్యం | Telugu','description':long_description,'tags':tags,'thumbnail':'diwali-youtube-thumbnail.jpg','video':'diwali-telugu-long-1080p.mp4','language':'te','categorySuggestion':'Education','chapters':chapters},
 'short':{'title':'దీపావళి ఎందుకు జరుపుకుంటాం? 🪔 | Telugu #Shorts','description':short_description,'tags':tags+['Telugu Shorts','Diwali Shorts'],'video':'diwali-telugu-short-1080p.mp4','language':'te'},
 'pinnedCommentDraft':'మీ ఇంట్లో దీపావళికి ఏ సంప్రదాయం ప్రత్యేకం? 🪔 కామెంట్‌లో చెప్పండి. ఈ వీడియో నచ్చితే లైక్ చేసి, కుటుంబంతో షేర్ చేయండి. మరిన్ని పండుగల విశేషాల కోసం Divine Wisdom Telugu ఛానల్‌ను సబ్‌స్క్రైబ్ చేయండి.',
 'titleScoring':'Editorial assessment only; no paid vidIQ title scoring or search-demand claims.'}
for k in ['short','long']:
 assert len(package[k]['title'])<=100
 assert len(package[k]['description'])<5000
 assert len(','.join(package[k]['tags']))<500
 (P/f'youtube-{k}-details-te.txt').write_text('TITLE\n'+package[k]['title']+'\n\nDESCRIPTION\n'+package[k]['description']+'\n\nTAGS\n'+', '.join(package[k]['tags'])+'\n\nPINNED COMMENT DRAFT\n'+package['pinnedCommentDraft']+'\n',encoding='utf8')
(P/'youtube-metadata.json').write_text(json.dumps(package,ensure_ascii=False,indent=2),encoding='utf8')
with zipfile.ZipFile(P/'diwali-youtube-package.zip','w',zipfile.ZIP_DEFLATED) as z:
 for n in ['youtube-long-details-te.txt','youtube-short-details-te.txt','youtube-metadata.json','diwali-youtube-thumbnail.jpg','diwali-youtube-thumbnail.png','short-captions.srt','long-captions.srt','short-script-te.txt','long-script-te.txt','research.md','branding-preset.json']:
  z.write(P/n,n)
print(json.dumps({'package':str(P/'diwali-youtube-package.zip'),'longTitleCharacters':len(package['long']['title']),'shortTitleCharacters':len(package['short']['title'])}))
