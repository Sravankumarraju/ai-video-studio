from pathlib import Path
import json,sys

root = Path('data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12/video-02-recitation')
if len(sys.argv)>1:
    assert sys.argv[1]=='male-voice-v2'
    root=root/sys.argv[1]
    if len(sys.argv)>2:
        assert sys.argv[2]=='final'
        root=root/'final'
timeline = json.loads((root / 'timeline.json').read_text(encoding='utf-8'))
labels = [('nyasa', 'న్యాసం'), ('dhyana-1', 'ధ్యాన శ్లోకాలు'), ('stotram-001', 'వెయ్యి నామాల స్తోత్రం')]
labels += [(f'stotram-{i:03}', f'శ్లోకం {i}') for i in [25, 50, 75, 100, 125, 150, 175]]
labels += [('stotram-183-half-and-closing', 'ముగింపు ప్రార్థన'), ('closing-cta', 'ముగింపు సందేశం')]
chapters = []
for key, label in labels:
    seconds = int(next(s for s in timeline['scenes'] if s['name'] == key)['start'])
    chapters.append(f'{seconds // 60:02}:{seconds % 60:02} {label}')
chapter_text = '\n'.join(chapters)
(root / 'chapters.txt').write_text(chapter_text + '\n', encoding='utf-8')
metadata = {
    'title': 'శ్రీ లలితా సహస్రనామం | సంపూర్ణ నామ స్తోత్రం | తెలుగు లిపిలో | Divine Wisdom Telugu',
    'description': 'శ్రీ లలితా సహస్రనామ స్తోత్రం — సంస్కృత పారాయణం, తెలుగు లిపిలో తెరపై పాఠం.\n\n'
    'చేర్చిన భాగాలు: న్యాసం, నాలుగు ధ్యాన శ్లోకాలు, 182 పూర్తి శ్లోకాలు, చివరి అర్ధ శ్లోకం, ముగింపు వాక్యం. '
    'ప్రత్యేక పూర్వపీఠిక, ఫలశ్రుతి అధ్యాయం ఇందులో చేర్చలేదు.\n\n'
    'అధ్యాయాలు:\n' + chapter_text + '\n\n'
    'పాఠం ఆధారం: https://sanskritdocuments.org/doc_devii/lalita.html\n\n'
    'AI-generated devotional singing and artwork. Sanskrit pronunciation should be reviewed by a competent reciter.\n\n'
    'ఉపయోగపడితే లైక్ చేయండి, షేర్ చేయండి, సబ్‌స్క్రైబ్ చేయండి. మీ అభిప్రాయాన్ని కామెంట్‌లో చెప్పండి.\n\n'
    '#LalitaSahasranamam #Telugu #DivineWisdomTelugu',
    'tags': ['Sri Lalita Sahasranamam', 'Lalita Sahasranama Stotram', 'Telugu script', 'Sanskrit', 'Divine Wisdom Telugu']
}
assert len(metadata['title']) <= 100
if 'male-voice-v2' in root.parts:
    metadata['description']=metadata['description'].replace('AI-generated devotional singing and artwork.','AI-generated male-voice recitation and devotional artwork.')
assert len(metadata['description'].encode('utf-8')) < 5000
(root / 'youtube-metadata.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'seconds': timeline['seconds'], 'chapters': len(chapters), 'metadataPrepared': True}))
