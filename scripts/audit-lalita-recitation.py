from pathlib import Path
import json,unicodedata
p=Path('data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12/video-02-recitation')
plan=json.loads((p/'plan.json').read_text(encoding='utf-8'))
def norm(s):return ''.join(c for c in s if unicodedata.category(c)[0] in 'LM')
reports=[]
for b in plan['batches']:
 m=json.loads((p/f'batch-{b["index"]:02}-metadata.json').read_text(encoding='utf-8'))
 words=[w for w in m['words_timestamps'] if norm(w['word'])]
 expected=norm('\n'.join(c['text'] for c in b['chunks']));actual=norm(''.join(w['word'] for w in words))
 collapsed=[w for w in words if w['end_ms']-w['start_ms']<20]
 reports.append({'batch':b['index'],'exactLexicalTextMatches':expected==actual,'lexicalWords':len(words),'collapsed':collapsed})
(p/'TIMING-AUDIT.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps([{**r,'collapsed':len(r['collapsed']),'examples':r['collapsed'][:3]} for r in reports],ensure_ascii=False))
