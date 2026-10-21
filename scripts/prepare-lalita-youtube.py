from pathlib import Path
import json
base=Path('data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12')
root=base/'video-01-background/word-highlight-v2'
t=json.loads((root.parent/'timeline.json').read_text(encoding='utf-8'))
chapters='\n'.join(f'{int(s["start"])//60:02}:{int(s["start"])%60:02} {s["title"]}' for s in t['scenes'])
assert chapters.startswith('00:00')
assert all(b['start']-a['start']>=10 for a,b in zip(t['scenes'],t['scenes'][1:]))
metadata={'title':'శ్రీ లలితా సహస్రనామం పరిచయం | మూలం, సంప్రదాయం | Divine Wisdom Telugu','description':'శ్రీ లలితా సహస్రనామం గురించి సులభమైన తెలుగు పరిచయం. పురాణ సంప్రదాయంలోని మూలం, గ్రంథ సంబంధం, నామాలలోని ప్రధాన భావాలు, పారాయణాన్ని తెలుగు లిపిలో అనుసరించే విధానం.\n\nఇది నేపథ్య వివరణ; పూర్తి పారాయణం లేదా వెయ్యి నామాల పూర్తి వ్యాఖ్యానం కాదు.\n\nఅధ్యాయాలు:\n'+chapters+'\n\nఆధారాలు:\nhttps://www.sringeri.net/events/jagadguru-namanam-sri-lalita-sahasranama\nhttps://www.svbfcanada.com/SVBF/LS.html\nhttps://sanskritdocuments.org/doc_devii/lalita.html\n\nAI-assisted Telugu narration, devotional artwork and original synthesized instrumental background.\n\nఉపయోగపడితే లైక్ చేయండి, షేర్ చేయండి, సబ్‌స్క్రైబ్ చేయండి. మీరు తెలుసుకోవాలనుకునే నామాన్ని కామెంట్‌లో చెప్పండి.\n\n#LalitaSahasranamam #Telugu #DivineWisdomTelugu','tags':['Lalita Sahasranamam','Sri Lalita Sahasranama','Telugu','Divine Wisdom Telugu','Lalita introduction']}
assert len(metadata['title'])<=100 and len(metadata['description'].encode())<5000
(root/'youtube-metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
(root/'chapters.txt').write_text(chapters+'\n',encoding='utf-8')
(root/'timeline.json').write_text(json.dumps(t,ensure_ascii=False,indent=2),encoding='utf-8')
v=json.loads((root/'VERIFICATION.json').read_text(encoding='utf-8'));(root/'verification.json').write_text(json.dumps(v,indent=2),encoding='utf-8')
source=Path('scripts/upload-hanuman-pair.ts').read_text(encoding='utf-8')
start=source.index('const base=');end=source.index('const load=',start)
source=source[:start]+"const base='data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12';\nconst entries=[{kind:'explanation',root:base+'/video-01-background/word-highlight-v2',file:'Lalita-Video-01-Word-Highlighted-V2.mp4',thumbnail:'../../thumbnails/01-background.jpg'}];\n"+source[end:]
start=source.index("  const title=entry.kind");end=source.index("  await save(entry.root,'youtube-metadata'",start)
source=source[:start]+"  const metadata=uploadMetadata.parse(await load(entry.root,'youtube-metadata'));\n"+source[end:]
source=source.replace('Owner explicitly requested push both YouTube','User explicitly requested create playlist and upload on YouTube with timestamps and thumbnails.')
source=source.replace('Original full song and complete Telugu explanation only','Approved corrected Lalita Video 1 with word highlighting and no top-left text')
Path('scripts/upload-lalita-background.ts').write_text(source,encoding='utf-8')
print(json.dumps({'chapters':len(t['scenes']),'descriptionBytes':len(metadata['description'].encode()),'uploadFile':'scripts/upload-lalita-background.ts'}))
