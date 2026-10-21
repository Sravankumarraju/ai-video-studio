"""Select the performed arrangement from the supplied lyrics, preserving both."""
from pathlib import Path
import json,re
ROOT=Path('data/productions/divine-wisdom/shiva-tandavam-2026-10-15')
source=(ROOT/'lyrics-supplied.txt').read_text(encoding='utf8').splitlines()
sections=[]
for line in source[1:]:
 if line.startswith('['):sections.append({'section':line.strip('[]'),'lines':[]})
 elif line.strip():sections[-1]['lines'].append(line.strip())
performed=[]
def take(section,indices=None):
 s=sections[section]
 for i in (range(len(s['lines'])) if indices is None else indices):performed.append({'section':s['section'],'text':s['lines'][i]})
take(0);take(1);take(2);take(3,range(6));take(5);take(7,[0,1,2])
performed.append({'section':'చివరి పల్లవి','text':'శంభో శంకర!'});take(7,[5,6,7]);take(8)
(ROOT/'lyrics-performed.txt').write_text('\n'.join(x['text'] for x in performed)+'\n',encoding='utf8')
(ROOT/'performed-lines.json').write_text(json.dumps(performed,ensure_ascii=False,indent=2),encoding='utf8')
(ROOT/'arrangement-notes.json').write_text(json.dumps({'source':'User supplied audio and lyrics','audioSeconds':180.245,'performedSections':['prayer','chorus','verse 1','short chorus','bridge','short final chorus','closing'],'omittedFromRecording':['verse 2','verse 3','last two lines of second chorus','Shiva line and first half of first Hara Hara line in final chorus'],'transcriptCorrections':'Supplied lyric spelling retained where recognition is noisy. No bracketed performance instructions become captions.','fullHumanListeningReview':False},ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'lines':len(performed),'performedWords':len(' '.join(x['text'] for x in performed).split())}))
