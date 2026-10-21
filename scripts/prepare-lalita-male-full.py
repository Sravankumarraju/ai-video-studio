from pathlib import Path
import json,re
base=Path('data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12')
old=base/'video-02-recitation'
root=old/'male-voice-v2';root.mkdir(exist_ok=True)
units=json.loads((old/'units-selected.json').read_text(encoding='utf-8'))
def telugu(s):
    out=''
    for c in s:
        n=ord(c)
        if n==0x950:out+='ఓం'
        elif 0x966<=n<=0x96f:out+=str(n-0x966)
        elif 0x901<=n<=0x963:out+=chr(n+0x300)
        else:out+=c
    return out
for u in units:
    u['spokenText']=telugu(u['text']).replace('-',' ').replace('॥','.').replace('।',',')
    u['spokenText']=re.sub(r'\n\s*\n','\n',u['spokenText']).strip()
sample=json.loads((old/'male-voice-sample-2026-10-14/request.json').read_text(encoding='utf-8'))
sample_units=[u for u in units if u['verse'] is not None and 1<=u['verse']<=6]
assert '\n'.join(u['spokenText'] for u in sample_units)==sample['inputs'][0]['text']
batches=[]
def add(rows,reference=False):
    text='';entries=[]
    for u in rows:
        if text:text+='\n'
        start=len(text);text+=u['spokenText']
        entries.append({'index':u['index'],'name':u['name'],'verse':u['verse'],'text':u['spokenText'],'startCharacter':start,'endCharacter':len(text)})
    batches.append({'index':len(batches),'text':text,'units':entries,'reuseApprovedSample':reference})
pending=[]
for u in units:
    if u['verse']==1:
        if pending:add(pending);pending=[]
        add(sample_units,True)
    if u in sample_units:continue
    if pending and len('\n'.join(x['spokenText'] for x in pending+[u]))>1000:
        add(pending);pending=[]
    pending.append(u)
if pending:add(pending)
plan={'voiceId':sample['inputs'][0]['voice_id'],'model':'eleven_v4','language':'te','captionLanguage':'Sanskrit in Telugu script','batches':batches,'maximumNewCalls':sum(not b['reuseApprovedSample'] for b in batches),'newCharacters':sum(len(b['text']) for b in batches if not b['reuseApprovedSample']),'userApproval':'Good create full video caption highlight the speaking words like bhagavthi gita sytle','sampleApproved':True,'billing':'Included credits only; no overage','preserveOldVideo':True}
assert [u['verse'] for b in batches for u in b['units'] if u['verse'] is not None]==list(range(1,184))
(root/'plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:plan[k] for k in ['maximumNewCalls','newCharacters','voiceId']}))
