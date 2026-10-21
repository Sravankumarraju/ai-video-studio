from pathlib import Path
import json,re,shutil
base=Path('data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12');root=base/'video-03-bhavasaram';root.mkdir(exist_ok=True)
source=(base/'03-bhavasaram-te.txt').read_text(encoding='utf-8')
matches=list(re.finditer(r'\[(\d{2}) — ([^\]]+)\]\s*\n(.*?)(?=\n\[|\nSOURCE AND SCOPE NOTES)',source,re.S));assert len(matches)==13
images=['hero','lamp-manuscript','hero','lamp-manuscript','hero','hero','family-devotion','hero','lamp-manuscript','hero','hero','lamp-manuscript','hero']
sections=[{'index':i,'title':'శ్రీ లలితా సహస్రనామం భావసారం','text':m.group(3).strip(),'direction':m.group(2),'image':images[i]} for i,m in enumerate(matches)]
assert all(0<len(s['text'])<=2000 for s in sections)
config={'title':'శ్రీ లలితా సహస్రనామం భావసారం | సులభమైన తెలుగు వివరణ','language':'te','voiceId':'sJrRcQEpUbZehhGBdEbD','model':'eleven_v4','sections':sections,'maximumNarrationCalls':13,'sources':['https://sanskritdocuments.org/doc_devii/lalita.html','https://sanskritdocuments.org/doc_devii/lalita1000.html','https://www.svbfcanada.com/SVBF/LS.html'],'meaningScope':'Selected-name thematic overview; not a complete 1000-name commentary','voiceApprovedByUser':True,'userInstruction':'start creating pending items and voice approved'}
(root/'episode.json').write_text(json.dumps(config,ensure_ascii=False,indent=2),encoding='utf-8');(root/'assets').mkdir(exist_ok=True)
for name in ['hero','lamp-manuscript','family-devotion','hayagriva-agastya','logo']:
 target=root/'assets'/f'{name}.png'
 if not target.exists():shutil.copyfile(base/'video-01-background/assets'/f'{name}.png',target)
voice=Path('scripts/lalita-background-voice.ts').read_text(encoding='utf-8').replace('video-01-background','video-03-bhavasaram').replace('config.sections.length,11','config.sections.length,13').replace('config.maximumNarrationCalls,11','config.maximumNarrationCalls,13').replace('total:11','total:13').replace('All eleven narration sections','All thirteen narration sections').replace('User requested start video1 and approved audio.','User requested creating pending items and explicitly approved voice; this is the source-based Telugu bhavasaram script using the existing ElevenLabs account.')
Path('scripts/lalita-meaning-voice.ts').write_text(voice,encoding='utf-8')
(root/'authorization.json').write_text(json.dumps({'userInstruction':config['userInstruction'],'scope':'Produce the pending Telugu bhavasaram video with the established narrator and local assets','maximumNarrationCalls':13,'noOverage':True,'noAutomaticDuplicateCalls':True},indent=2),encoding='utf-8')
print(json.dumps({'sections':len(sections),'characters':sum(len(s['text']) for s in sections),'root':str(root)}))
