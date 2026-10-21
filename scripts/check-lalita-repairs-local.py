from pathlib import Path
import json,unicodedata
ROOT=Path('data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12/video-02-recitation')
def norm(s):return ''.join(c for c in s if unicodedata.category(c)[0] in 'LM')
plan=json.loads((ROOT/'repair-plan.json').read_text(encoding='utf-8'));selected=json.loads((ROOT/'units-original.json').read_text(encoding='utf-8'));reports=[]
for batch in plan['batches']:
 meta=json.loads((ROOT/f'repair-{batch["index"]:02}-metadata.json').read_text(encoding='utf-8'))
 words=[w for w in meta['words_timestamps'] if norm(w['word'])]
 assert norm(''.join(w['word'] for w in words))==norm('\n'.join(u['text'] for u in batch['units'])),'Repair metadata text differs'
 chars=[]
 for w in words:
  chars.extend({'text':c,'start':w['start_ms']/1000,'end':w['end_ms']/1000} for c in norm(w['word']))
 offset=0;issues=[]
 for u in batch['units']:
  length=len(norm(u['text']));matched=chars[offset:offset+length];assert ''.join(c['text'] for c in matched)==norm(u['text'])
  pos=0;tokens=[]
  for token in u['text'].split():
   s=norm(token)
   if not s:continue
   hit=matched[pos:pos+len(s)];tokens.append({'text':token,'start':min(c['start'] for c in hit),'end':max(c['end'] for c in hit)});pos+=len(s)
  bad=[w for w in tokens if w['end']-w['start']<.025];issues+=bad
  replacement={**selected[u['unitIndex']],'sourceFile':f'repair-{batch["index"]:02}.mp3','words':tokens,'sourceStart':tokens[0]['start'],'sourceEnd':tokens[-1]['end'],'issues':bad,'repairUsed':True,'timingSource':'existing provider word timestamps; extra acoustic upload not approved'}
  selected[u['unitIndex']]=replacement;offset+=length
 reports.append({'batch':batch['index'],'exactMetadataText':True,'collapsedTokens':len(issues),'examples':issues[:3]})
for u in selected:
 if not u.get('repairUsed'):u['sourceFile']=f'batch-{u["batch"]:02}.mp3';u['timingSource']='saved acoustic alignment'
assert [u['verse'] for u in selected if u['verse'] is not None]==list(range(1,184))
(ROOT/'REPAIR-LOCAL-CHECK.json').write_text(json.dumps({'reports':reports,'extraAcousticUploadPerformed':False,'pronunciationApprovalClaimed':False},ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'units-selected.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(reports,ensure_ascii=False))
assert not any(u['issues'] for u in selected),'Unresolved collapsed tokens remain; do not render as complete'
