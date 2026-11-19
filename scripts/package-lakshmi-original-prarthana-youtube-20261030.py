from pathlib import Path
import json
R=Path('data/productions/divine-wisdom/lakshmi-original-prarthana-full-2026-10-30')
title='శ్రీ లక్ష్మీ కరుణా ప్రార్థనా మాలిక | 108 ప్రార్థనలు | Lakshmi Prayer Telugu'
chapters=(R/'chapters.txt').read_text(encoding='utf8').strip()
description='''శ్రీ లక్ష్మీ కరుణా ప్రార్థనా మాలిక — స్త్రీ స్వరంలో 108 చిన్న ప్రార్థనలు, తెలుగు సాహిత్యంతో. 🙏🪔
భక్తి, శాంతి, కరుణ, ధైర్యం వంటి భావాలతో రూపొందించిన ఈ ప్రార్థనా మాలికను ఆలకించండి. ప్రతి పూర్తి ప్రార్థన తెలుగు లిపిలో తెరపై కనిపిస్తుంది; పాడుతున్న పదాలు హైలైట్ అవుతాయి.

ఈ వీడియోలో:
• 108 కొత్త ప్రార్థనలు — 12 భావపూర్వక భాగాలు
• మృదువైన స్త్రీ స్వరం, సున్నితమైన నేపథ్య సంగీతం
• తెలుగు లిపిలో పూర్తి సాహిత్యం, పదాల హైలైటింగ్
• ఆరు అసలైన లక్ష్మీదేవి చిత్రాలు
• మొత్తం నిడివి: 15 నిమిషాలు 28 సెకన్లు

🪔 వీడియో భాగాలు:
'''+chapters+'''

ఈ వీడియో కోసం కొత్తగా రూపొందించిన సంస్కృత శైలి ప్రార్థనా రచనను తెలుగు లిపిలో అందిస్తున్నాము. ఇది పదాల తెలుగు అర్థ వివరణ కాదు.

ఈ ప్రార్థనా మాలిక నచ్చితే లైక్ చేయండి, మీ కుటుంబ సభ్యులకు షేర్ చేయండి. మరిన్ని భక్తి గీతాలు, ప్రార్థనల కోసం Divine Wisdom Telugu ఛానల్‌కు సబ్‌స్క్రైబ్ చేయండి. మీకు నచ్చిన భాగాన్ని టైమ్‌స్టాంప్‌తో కామెంట్‌లో తెలియజేయండి.

About this video:
An original Lakshmi devotional prayer collection: 108 short invocations arranged in 12 themed chapters, sung in a female devotional voice with Telugu-script lyrics. Newly authored prayer text; AI-generated vocals and music using ElevenLabs Music, with original AI-created devotional illustrations. Recurring prayer phrases are arranged from selected recordings for the full collection.

#LakshmiPrayer #TeluguDevotional #DivineWisdomTelugu
'''
tags=['Lakshmi prayer Telugu','Lakshmi devotional prayers','108 Lakshmi prayers','female devotional chanting','Lakshmi Karuna Prarthana Malika','Telugu lyrics','Telugu bhakti','శ్రీ లక్ష్మీ ప్రార్థన','లక్ష్మీ కరుణా ప్రార్థనా మాలిక','స్త్రీ స్వరంలో ప్రార్థన','Divine Wisdom Telugu','original devotional prayer','Telugu devotional music']
pinned='శ్రీ లక్ష్మీదేవ్యై నమః 🙏 ఈ ప్రార్థనా మాలికలో మీకు నచ్చిన భాగం ఏది? టైమ్‌స్టాంప్‌తో కామెంట్ చేయండి. మరిన్ని భక్తి గీతాల కోసం Divine Wisdom Telugu ఛానల్‌కు సబ్‌స్క్రైబ్ చేయండి. 🪔'
assert len(title)<=100 and len(description)<=5000
assert sum(len(t)+3 for t in tags)<=500
metadata={'title':title,'description':description,'tags':tags,'hashtags':['#LakshmiPrayer','#TeluguDevotional','#DivineWisdomTelugu'],'defaultLanguage':'te','audioLanguage':'Sanskrit-style prayer; Telugu spoken welcome and closing','category':'Music','durationSeconds':928.208333,'chaptersFile':'chapters.txt','pinnedComment':pinned,'thumbnail':'thumbnail-lakshmi-108-prarthanalu.jpg','uploadSettings':{'visibility':'private for review','audience':'Not made for kids; general devotional audience','alteredOrSyntheticContent':'Yes — generated singing and music','comments':'On'},'syntheticContentDisclosureReference':'https://support.google.com/youtube/answer/14328491?hl=en','published':False,'claims':'108 newly authored short prayers; not 108 names or a traditional scriptural edition; no promised financial or supernatural outcome.'}
(R/'youtube-title.txt').write_text(title+'\n',encoding='utf8');(R/'youtube-description.txt').write_text(description,encoding='utf8');(R/'youtube-tags.txt').write_text(', '.join(tags)+'\n',encoding='utf8');(R/'youtube-pinned-comment.txt').write_text(pinned+'\n',encoding='utf8');(R/'youtube-metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf8')
ready='TITLE\n'+title+'\n\nDESCRIPTION\n'+description+'\n\nTAGS\n'+', '.join(tags)+'\n\nPINNED COMMENT\n'+pinned+'\n\nUPLOAD SETTINGS\nCategory: Music\nVideo language: Telugu (Telugu script and channel bookends; main prayer in Sanskrit style)\nAudience: Not made for kids / general audience\nAltered or synthetic content: Yes — AI-generated music and singing\nVisibility: Private for review\nComments: On\n'
(R/'youtube-ready-to-paste.txt').write_text(ready,encoding='utf8')
print(json.dumps({'titleCharacters':len(title),'descriptionCharacters':len(description),'tagCharactersIncludingQuoteAllowance':sum(len(t)+3 for t in tags),'chapters':len(chapters.splitlines()),'metadataPrepared':True,'published':False}))
