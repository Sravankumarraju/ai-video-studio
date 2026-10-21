from pathlib import Path
import json
old=Path('data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12/video-02-recitation')
root=old/'priest-chant-full-v4';root.mkdir(exist_ok=True)
source=json.loads((old/'vignanam-v3/plan.json').read_text(encoding='utf-8'))
units=[u for b in source['batches'] for u in b['units']]
sample=json.loads((old/'priest-chant-sample-2026-10-14/plan.json').read_text(encoding='utf-8'))
request=json.loads((old/'priest-chant-sample-2026-10-14/request.json').read_text(encoding='utf-8'))
intro=units[0]
batches=[{'index':0,'text':intro['text'],'units':[intro],'reuseAudio':str(old/'vignanam-v3/batch-00.mp3'),'reuseAlignment':str(old/'vignanam-v3/batch-00-alignment.json'),'reuseApprovedSample':False}]
sample_units=[]
for u in sample['units']:
    original=next(x for x in units if x['verse']==u['verse'])
    sample_units.append({**original,**u})
batches.append({'index':1,'text':request['inputs'][0]['text'],'units':sample_units,'reuseAudio':str(old/'priest-chant-sample-2026-10-14/sample.mp3'),'reuseAlignment':str(old/'priest-chant-sample-2026-10-14/alignment.json'),'reuseApprovedSample':False})
direction='[rhythmic devotional chanting] [reverent]\n'
pending=[]
def add(rows):
    text=direction;entries=[]
    for u in rows:
        if entries:text+='\n\n'
        body=u['text'].replace(' , ',',\n')
        if body.endswith(' .'):body=body[:-2]+'.'
        start=len(text);text+=body
        entries.append({**u,'text':body,'startCharacter':start,'endCharacter':len(text)})
    batches.append({'index':len(batches),'text':text,'units':entries,'reuseApprovedSample':False})
for u in units[5:]:
    body=u['text'].replace(' , ',',\n')
    if body.endswith(' .'):body=body[:-2]+'.'
    if pending and len(direction)+sum(len(x['text'])+2 for x in pending)+len(body)>970:add(pending);pending=[]
    pending.append(u)
if pending:add(pending)
assert all(len(b['text'])<=1000 for b in batches)
assert [u['verse'] for b in batches for u in b['units'] if u['verse'] is not None]==list(range(1,184))
plan={**source,'batches':batches,'maximumNewCalls':sum('reuseAudio' not in b for b in batches),'newCharacters':sum(len(b['text']) for b in batches if 'reuseAudio' not in b),'sampleApproved':True,'userApproval':'User replied Good to the priest-style chanting sample and requested increase little fontsize; earlier instruction is full video after sample approval.','delivery':'Approved rhythmic devotional chanting in existing God Voice Tone Male voice','captions':'Complete shloka held on screen, speaking word gold, remaining words white','fontChange':'Slight increase: target font 88 instead of 82, wider safe caption area','preserveApprovedSampleAudio':True,'serverMustRemainStopped':True}
(root/'plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'newCalls':plan['maximumNewCalls'],'newCharacters':plan['newCharacters'],'reusedBatches':2,'sourceUnits':183}))
