from pathlib import Path
import json,re,difflib,sys
R=Path('data/productions/divine-wisdom/lakshmi-original-prarthana-full-2026-10-30')
def translit(s):return ''.join(chr(ord(c)+0x300) if '\u0900'<=c<='\u0963' else c for c in s)
def canon(s):
 s=''.join(c for c in translit(s) if '\u0c00'<=c<='\u0c63').replace('ీ','ి').replace('ూ','ు').replace('మ్','ం').replace('ళ','ల')
 return re.sub(r'[నణఙఞమ]్(?=[కఖగఘచఛజఝటఠడఢతథదధపఫబభ])','ం',s)
def load(n):return json.loads((R/(n+'.json')).read_text(encoding='utf8'))
def inspect(name,units):
 if not (R/(name+'-transcription.json')).exists():return []
 md=load(name+'-metadata')['words_timestamps'];ts=load(name+'-transcription');asr=[w for w in ts['words'] if w['type']=='word'];cursor=0;found=[]
 for u in units:
  count=len(u['text'].split());words=md[cursor:cursor+count];cursor+=count
  assert canon(''.join(w['word'] for w in words))==canon(u['text'])
  linecount=len(u['text'].splitlines()[0].split());parts=[words[:linecount],words[linecount:]]
  for li,(text,g) in enumerate(zip(u['text'].splitlines(),parts)):
   a=g[0]['start_ms']/1000;z=g[-1]['end_ms']/1000
   rec=' '.join(w['text'] for w in asr if a-.12<=(w['start']+w['end'])/2<=z+.12)
   ratio=difflib.SequenceMatcher(None,canon(text),canon(rec),autojunk=False).ratio()
   key=text.split()[-2] if li==1 else ''
   found.append({'text':text,'canonicalText':canon(text),'invocation':u['number'],'line':li,'source':name,'start':a,'end':z,'words':g,'ratio':ratio,'keyOk':not key or canon(key) in canon(rec),'recognized':translit(rec),'asrWords':[w for w in asr if a-.12<=(w['start']+w['end'])/2<=z+.12]})
 return found
p=load('full-production-plan');allparts=[]
for b in p['batches']:allparts+=inspect(b['name'],b['units'])
if (R/'repair-plan.json').exists():
 for b in load('repair-plan')['batches']:allparts+=inspect(b['name'],b['units'])
allparts+=inspect('clarity-check',p['units'][2:6])
if (R/'final-phrases-plan.json').exists():
 allparts+=inspect('final-phrases',load('final-phrases-plan')['batches'][0]['units'])
library={}
for part in allparts:library.setdefault(part['canonicalText'],[]).append(part)
for v in library.values():v.sort(key=lambda x:(x['keyOk'],x['ratio']),reverse=True)
needed={canon(line):line for u in p['units'][2:] for line in u['text'].splitlines()}
missing=[]
for k,text in needed.items():
 candidates=library.get(k,[]);best=candidates[0] if candidates else None
 if not best or best['ratio']<.9 or not best['keyOk']:missing.append({'text':text,'best':best})
out={'sourceParts':len(allparts),'distinctNeededLines':len(needed),'linesWithStrongIndependentMatch':len(needed)-len(missing),'weakLines':missing,'library':library}
(R/'phrase-library-audit.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
sys.stdout.reconfigure(encoding='utf-8');print(json.dumps({k:v for k,v in out.items() if k not in ['weakLines','library']}))
for w in missing:print('CHECK',w['text'],round(w['best']['ratio'],3) if w['best'] else None,w['best']['recognized'] if w['best'] else '')
