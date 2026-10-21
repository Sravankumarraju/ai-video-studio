from pathlib import Path
from bs4 import BeautifulSoup
import json,re,difflib
base=Path('data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12')
reference=base/'vignanam-reference'
root=base/'video-02-recitation/vignanam-v3';root.mkdir(exist_ok=True)
soup=BeautifulSoup((reference/'source.html').read_text(encoding='utf-8'),'html.parser')
text=soup.select_one('#stext').get_text('\n',strip=True)
main=text[text.index('శ్రీ మాతా'):]
intro='డివైన్ విజ్డమ్ తెలుగు ఛానల్‌కు స్వాగతం. ఇప్పుడు శ్రీ లలితా సహస్రనామ స్తోత్రాన్ని వినబోతున్నారు. లలితా అమ్మవారిని వెయ్యి నామాలతో స్తుతించే పవిత్ర స్తోత్రం ఇది. తెరపై తెలుగు పాఠాన్ని అనుసరిస్తూ, శ్రద్ధగా వినండి. శ్రీ మాతా నామంతో పారాయణాన్ని ప్రారంభిద్దాం.'
units=[{'index':0,'name':'channel-welcome','verse':None,'text':intro,'displayText':intro}]
start=0
for m in re.finditer(r'॥\s*(\d+)\s*॥',main):
    n=int(m.group(1));assert n==len(units)
    raw=main[start:m.start()].strip()+' ॥';start=m.end()
    display=re.sub(r'\s+',' ',raw).replace('\u200b','')
    spoken=display.replace('-',' ').replace('॥','.').replace('।',',')
    name=f'stotram-{n:03}' if n<183 else 'stotram-183-half-and-closing'
    units.append({'index':n,'name':name,'verse':n,'text':spoken,'displayText':display})
    if n==183:break
assert len(units)==184
(reference/'selected-core-telugu.txt').write_text('\n\n'.join(u['displayText'] for u in units[1:]),encoding='utf-8')
batches=[]
def add(rows):
    text='';entries=[]
    for u in rows:
        if text:text+='\n'
        offset=len(text);text+=u['text']
        entries.append({**u,'startCharacter':offset,'endCharacter':len(text)})
    batches.append({'index':len(batches),'text':text,'units':entries,'reuseApprovedSample':False})
add(units[:1]);pending=[]
for u in units[1:]:
    if pending and len('\n'.join(x['text'] for x in pending+[u]))>1000:add(pending);pending=[]
    pending.append(u)
if pending:add(pending)
plan={'voiceId':'sJrRcQEpUbZehhGBdEbD','model':'eleven_v4','language':'te','captionLanguage':'Sanskrit in Telugu script','batches':batches,'maximumNewCalls':len(batches),'newCharacters':sum(len(b['text']) for b in batches),'sampleApproved':True,'billing':'Included credits only; no overage','source':'https://vignanam.org/telugu/sree-lalita-sahasra-nama-stotram.html','userApproval':'User selected this Vignanam source, requested a channel welcome and title introduction, and confirmed Start directly with శ్రీ మాతా; previously approved male voice and full generation.','openingPrayersIncluded':False,'fullPhalashrutiIncluded':False,'sequence':'Short Telugu channel welcome and introduction, then Sri Mata through Lalitambika in source order; existing approved CTA after prayer.'}
(root/'plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8')
(root/'intro.txt').write_text(intro,encoding='utf-8')
old=json.loads((base/'video-02-recitation/male-voice-v2/plan.json').read_text(encoding='utf-8'))
old_units={u['verse']:u['text'] for b in old['batches'] for u in b['units'] if u['verse'] is not None}
changed=[u['verse'] for u in units[1:] if re.sub(r'\W','',old_units[u['verse']])!=re.sub(r'\W','',u['text'])]
(root/'SOURCE-CHECK.json').write_text(json.dumps({'reference':plan['source'],'numberedUnits':183,'allUnitsInOrder':True,'captionTextFromSelectedPage':True,'differingVerseTextOrOrthography':changed,'introIsOriginalTelugu':True,'modernWebsiteCommentaryCopied':False,'openingPrayersExcludedAtUserRequest':True},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'calls':plan['maximumNewCalls'],'characters':plan['newCharacters'],'numberedUnits':183,'differentTextOrOrthography':len(changed)}))
