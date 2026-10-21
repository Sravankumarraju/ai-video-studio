from pathlib import Path
import json,unicodedata
p=Path('data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12/video-02-recitation')
plan=json.loads((p/'plan.json').read_text(encoding='utf-8'))
def norm(s):return ''.join(c for c in s if unicodedata.category(c)[0] in 'LM')
report=[]
for b in plan['batches']:
 a=json.loads((p/f'batch-{b["index"]:02}-alignment.json').read_text(encoding='utf-8'))
 ws=[w for w in a['words'] if norm(w['text'])]
 issues=[w for w in ws if w['end']-w['start']<.025]
 report.append({'batch':b['index'],'exactText':norm('\n'.join(c['text'] for c in b['chunks']))==norm(''.join(w['text'] for w in ws)),'lexicalWords':len(ws),'loss':a.get('loss'),'collapsed':issues})
(p/'ACOUSTIC-AUDIT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
