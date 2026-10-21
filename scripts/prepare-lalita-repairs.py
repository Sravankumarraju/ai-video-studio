from pathlib import Path
import json,unicodedata
ROOT=Path('data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12/video-02-recitation')
def norm(s):return ''.join(c for c in s if unicodedata.category(c)[0] in 'LM')
plan=json.loads((ROOT/'plan.json').read_text(encoding='utf-8'));units=[];repairs=[]
for batch in plan['batches']:
 a=json.loads((ROOT/f'batch-{batch["index"]:02}-alignment.json').read_text(encoding='utf-8'))
 chars=[x for x in a['characters'] if norm(x['text'])];assert ''.join(norm(x['text']) for x in chars)==norm('\n'.join(c['text'] for c in batch['chunks']))
 offset=0
 for chunk in batch['chunks']:
  if chunk.get('verses') and chunk['verses']!=[183]:
   parts=[s.strip()+' ॥' for s in chunk['text'].split('॥') if s.strip()];assert len(parts)==len(chunk['verses'])
   items=[(f'stotram-{n:03}',t,n) for n,t in zip(chunk['verses'],parts)]
  else:items=[(chunk['name'],chunk['text'],183 if chunk.get('verses')==[183] else None)]
  for name,text,verse in items:
   n=len(norm(text));matched=chars[offset:offset+n];assert ''.join(norm(x['text']) for x in matched)==norm(text)
   pos=0;words=[]
   for token in text.split():
    plain=norm(token)
    if not plain:continue
    selected=matched[pos:pos+len(plain)];assert ''.join(norm(x['text']) for x in selected)==plain
    words.append({'text':token,'start':min(x['start'] for x in selected),'end':max(x['end'] for x in selected)});pos+=len(plain)
   assert pos==n
   issues=[w for w in words if w['end']-w['start']<.025]
   item={'index':len(units),'name':name,'verse':verse,'text':text,'batch':batch['index'],'words':words,'sourceStart':words[0]['start'],'sourceEnd':words[-1]['end'],'issues':issues}
   units.append(item)
   if issues:repairs.append({'unitIndex':item['index'],'verse':verse,'name':name,'text':text,'seconds':40,'issues':issues})
   offset+=n
 assert offset==len(chars)
assert [u['verse'] for u in units if u['verse'] is not None]==list(range(1,184))
(ROOT/'units-original.json').write_text(json.dumps(units,ensure_ascii=False,indent=2),encoding='utf-8')
repairplan={'reference':'reference.json','batches':[{'index':i//10,'units':repairs[i:i+10]} for i in range(0,len(repairs),10)],'units':repairs,'maximumGenerationCalls':(len(repairs)+9)//10,'reason':'Regenerate only complete verses with collapsed lexical acoustic timing; retain all unaffected audio.'}
(ROOT/'repair-plan.json').write_text(json.dumps(repairplan,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'units':len(units),'repairVerses':[r['verse'] for r in repairs],'repairCalls':repairplan['maximumGenerationCalls'],'repairSeconds':len(repairs)*40}))
