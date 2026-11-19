from pathlib import Path
from bs4 import BeautifulSoup
import json,re

ROOT=Path('data/productions/divine-wisdom/lalitha-ashtottara-2026-10-25')
ROOT.mkdir(exist_ok=True)
soup=BeautifulSoup((ROOT/'source-stotranidhi.html').read_text(encoding='utf-8'),'html.parser')
entry=soup.select_one('.entry-content').get_text('\n',strip=True)
lines=[re.sub(r'\s*\|.*$','',x).strip() for x in entry.splitlines() if re.search(r'నమో\s*నమః',x) and not re.match(r'^\d+\.',x)]
assert len(lines)==108 and len(set(lines))==108
assert lines[0].startswith('రజతాచల') and lines[-1].startswith('మహాదేవరతౌత్సుక్య')
names=[{'number':i+1,'text':t+' ।','displayText':t+' ।'} for i,t in enumerate(lines)]
intro='డివైన్ విజ్డమ్ తెలుగు. శ్రీ లలితా అష్టోత్తర శతనామావళి. తెలుగు లిపిని అనుసరిస్తూ భక్తితో వినండి.'
closing='శ్రీ లలితాంబికాయై నమః. మరిన్ని పారాయణాల కోసం డివైన్ విజ్డమ్ తెలుగు ఛానల్‌కు సబ్‌స్క్రైబ్ చేయండి.'
batches=[]
def add(units,prayer=False):
    prefix='[rhythmic devotional chanting] [reverent]\n' if prayer else ''
    text=prefix; out=[]
    for u in units:
        if out:text+='\n\n'
        start=len(text);text+=u['text'];out.append({**u,'startCharacter':start,'endCharacter':len(text)})
    assert len(text)<=1000
    batches.append({'index':len(batches),'text':text,'units':out,'prayer':prayer})
add([{'number':None,'kind':'welcome','text':intro,'displayText':intro}])
for n in range(0,108,9):
    units=names[n:n+9]
    if n==0:units=[{'number':0,'kind':'invocation','text':'ఓం ఐం హ్రీం శ్రీం ।','displayText':'ఓం ఐం హ్రీం శ్రీం ।'}]+units
    add(units,True)
add([{'number':None,'kind':'closing','text':closing,'displayText':closing}])
plan={'title':'శ్రీ లలితా అష్టోత్తర శతనామావళి | 108 నామాలు | తెలుగు లిపితో','preparedOn':'2026-10-25',
 'source':'https://stotranidhi.com/sri-lalitha-ashtottara-satanamavali-in-telugu/',
 'editionScope':'108-name Rajatachala-shringagra edition; initial Om Aim Hrim Shrim once, all 108 names, original Telugu bookends. No additional dhyana, nyasa or phalashruti.',
 'reuseBasis':'Ancient traditional Sanskrit prayer only; no modern Telugu translations or commentary copied.',
 'names':names,'batches':batches,'voiceId':'EohubqvAiTiSkWCp1vu7','model':'eleven_v4','language':'te',
 'delivery':'Rhythmic priest-style recitation with Srirama V, a mature Telugu male library voice; old God Voice Tone Male is no longer available. New voice requires listening review; no added music.',
 'creditCap':15000,'maximumGenerationCalls':len(batches),'characters':sum(len(b['text']) for b in batches),
 'authorization':'Owner explicitly approved up to 15000 existing ElevenLabs credits in this chat; no topups or overage.',
 'format':{'width':1920,'height':1080,'fps':24,'aspect':'16:9','font':'Noto Sans Telugu','fontSize':88,'activeColor':'#FFD54A','inactiveColor':'#FFFFFF','oneCompleteNameVisible':True},
 'art':'data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12/lalita-hero-third-eye.png',
 'logo':'data/branding/divine-wisdom/youtube-avatar/divine-wisdom-telugu-circle-safe.png',
 'verifiedTextCount':108,'expertPronunciationReviewed':False,'published':False}
assert plan['characters']*2<15000
(ROOT/'plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'recitation-telugu-script.txt').write_text('ఓం ఐం హ్రీం శ్రీం ।\n\n'+'\n'.join(x['text'] for x in names)+'\n',encoding='utf-8')
(ROOT/'source-audit.json').write_text(json.dumps({'selectedEdition':plan['source'],'nameCount':108,'uniqueLines':108,'translationCopied':False,'expertApprovalClaimed':False,'otherEditionsMerged':False},indent=2),encoding='utf-8')
print(json.dumps({'names':108,'batches':len(batches),'characters':plan['characters'],'maximumConservativeCredits':plan['characters']*2}))
