from pathlib import Path
import json,re,difflib,sys,unicodedata
sys.stdout.reconfigure(encoding='utf-8')
R=Path('data/productions/divine-wisdom/lakshmi-original-prarthana-full-2026-10-30')
def translit(s):return ''.join(chr(ord(c)+0x300) if '\u0900'<=c<='\u0963' else c for c in s)
def canon(s):
 s=''.join(c for c in translit(s) if '\u0c00'<=c<='\u0c63')
 s=s.replace('ీ','ి').replace('ూ','ు').replace('మ్','ం')
 s=re.sub(r'[నణఙఞమ]్(?=[కఖగఘచఛజఝటఠడఢతథదధపఫబభ])','ం',s)
 return s
p=json.loads((R/'full-production-plan.json').read_text(encoding='utf8'));checks=[]
for b in p['batches']:
 m=json.loads((R/(b['name']+'-metadata.json')).read_text(encoding='utf8'))['words_timestamps'];t=json.loads((R/(b['name']+'-transcription.json')).read_text(encoding='utf8'));w=[x for x in t['words'] if x['type']=='word'];cursor=0
 for u in b['units']:
  n=len(u['text'].split());g=m[cursor:cursor+n];cursor+=n;a=g[0]['start_ms']/1000;z=g[-1]['end_ms']/1000
  rec=' '.join(v['text'] for v in w if a-.15<=(v['start']+v['end'])/2<=z+.15)
  ratio=difflib.SequenceMatcher(None,canon(u['text']),canon(rec),autojunk=False).ratio();key=u['text'].split()[-2];keyok=canon(key) in canon(rec)
  checks.append({'number':u['number'],'batch':b['name'],'ratio':ratio,'keyOk':keyok,'sourceStart':a,'sourceEnd':z,'recognized':translit(rec),'expected':u['text'],'repair':ratio<.90 or not keyok})
(R/'initial-word-audit.json').write_text(json.dumps({'checks':checks,'repairCount':sum(c['repair'] for c in checks)},ensure_ascii=False,indent=2),encoding='utf8')
print('Repair candidates',sum(c['repair'] for c in checks),'of',len(checks))
for c in sorted(checks,key=lambda c:c['ratio'])[:12]:print(c['number'],round(c['ratio'],3),c['keyOk'],'Expected:',c['expected'].replace('\n',' / '),'Recognized:',c['recognized'])
