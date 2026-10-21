from pathlib import Path
import json,re,unicodedata,difflib
from rapidfuzz.fuzz import ratio
ROOT=Path('output/sri-venkateswara-full-approved-2026-10-20')
def dev(s):
 s=''.join(chr(ord(c)-0x300) if '\u0c00'<=c<='\u0c7f' else c for c in s)
 return unicodedata.normalize('NFC',s)
def norm(s):
 s=dev(s).replace('ळ','ल').replace('ङ्','ं').replace('ञ्','ं').replace('म्','ं')
 return ''.join(c for c in s if '\u0900'<=c<='\u0963')
plan=json.loads((ROOT/'full-production-plan.json').read_text(encoding='utf8'))
groups=[('verse-03-probe',plan['batches'][0]['units'][:4])]+[(f"continuation-{b['index']}",b['units'][4:] if b['index']==1 else b['units']) for b in plan['batches']]
groups += [(f'verse-{v:02}',[u for b in plan['batches'] for u in b['units'] if u['verse']==v]) for v in range(4,30)]
groups += [(f'verse-{v:02}-clear',[u for b in plan['batches'] for u in b['units'] if u['verse']==v]) for v in range(4,30)]
groups += [(f'verse-{v:02}-reviewed',[u for b in plan['batches'] for u in b['units'] if u['verse']==v]) for v in range(4,30)]
groups += [(f'verse-{v:02}-final',[u for b in plan['batches'] for u in b['units'] if u['verse']==v]) for v in range(4,30)]
groups += [(f'verse-{v:02}-spliced',[u for b in plan['batches'] for u in b['units'] if u['verse']==v]) for v in range(4,30)]
report=[]
for name,units in groups:
 p=ROOT/f'{name}-transcription.json'
 if not p.exists():continue
 a=json.loads(p.read_text(encoding='utf8'))
 if not a.get('text','').strip() and (ROOT/f'{name}-transcription-hindi.json').exists():
  a=json.loads((ROOT/f'{name}-transcription-hindi.json').read_text(encoding='utf8'))
 wanted='\n'.join(u['text'] for u in units)
 meta=json.loads((ROOT/f'{name}-metadata.json').read_text(encoding='utf8'))
 timed=[w for w in meta.get('words_timestamps',[]) if norm(w['word'])]
 lyricEnd=max((w['end_ms']/1000 for w in timed),default=0)
 heard=[w for w in a.get('words',[]) if w['type']=='word' and (not lyricEnd or w['start']<=lyricEnd+.15)]
 actualText=' '.join(w['text'] for w in heard)
 score=ratio(norm(wanted),norm(actualText))
 expected=norm(wanted);actual=norm(actualText);sm=difflib.SequenceMatcher(None,expected,actual,autojunk=False)
 changes=[{'kind':tag,'expected':expected[i:j],'recognized':actual[k:l]} for tag,i,j,k,l in sm.get_opcodes() if tag!='equal']
 report.append({'file':name,'verses':[units[0]['verse'],units[-1]['verse']],'characterSimilarity':round(score,2),'expectedText':wanted,'independentTranscript':a['text'],'lyricTranscript':actualText,'lyricEndSeconds':lyricEnd,'tailWordsToExclude':[w for w in a.get('words',[]) if w['type']=='word' and lyricEnd and w['start']>lyricEnd+.15],'differences':changes,'pronunciationListeningReviewRequired':True})
(ROOT/'independent-lyric-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps([{'file':r['file'],'characterSimilarity':r['characterSimilarity'],'verses':r['verses']} for r in report]))
