from pathlib import Path
from bs4 import BeautifulSoup
import re,json,shutil
R=Path('data/productions/divine-wisdom/dakshinamurthy-2026-10-23')
s=BeautifulSoup((R/'source.html').read_text(encoding='utf8'),'html.parser').get_text()
s=s[s.index('विश्वं'):]
lines=[x.strip() for x in s.splitlines() if re.match(r'^\s*[\u0900-\u097f]',x)]
units=[];current=[]
for line in lines:
 line=re.sub(r'\s+var.*','',line)
 current.append(line)
 if re.search(r'॥\s*[१-९१०]+\s*॥',line):
  n=len(units)+1
  clean=[re.sub(r'[।॥०-९\u200d]','',x).strip() for x in current]
  assert len(clean)==4,(n,len(clean))
  if n<10:clean.append(clean[-1])
  dev='\n'.join(clean)
  te=''.join('ఓం' if c=='ॐ' else chr(ord(c)+0x300) if '\u0900'<=c<='\u0963' else c for c in dev)
  units.append({'index':n-1,'verse':n,'text':te,'sanskrit':dev,'seconds':36 if n<10 else 30})
  current=[]
  if n==10:break
assert len(units)==10
prior=json.loads(Path('data/productions/divine-wisdom/vishnu-sahasranamam-2026-10-22/plan.json').read_text(encoding='utf8'))
p={'title':'శ్రీ దక్షిణామూర్తి స్తోత్రం','source':'https://sanskritdocuments.org/doc_shiva/dakshina.html','reference':'https://www.youtube.com/watch?v=cwyeiAVyJGk','units':units,'seconds':sum(u['seconds'] for u in units),'batches':[{'index':0,'units':units,'seconds':sum(u['seconds'] for u in units)}],
 'positiveStyles':['Original South Indian devotional Sanskrit stotram in Telugu script. Solo female singer, warm clear natural voice, serene moderately slow melodic chanting, simple original raga-inspired tune.','Prioritize pristine syllable articulation, correct long and short vowels, aspirated consonants and consonant clusters. Complete every supplied syllable exactly once in order; repeat the refrain only where written. Natural short breaths between lines.','Quiet tanpura drone, subtle veena, occasional soft temple bell; voice forward, minimal reverb. Keep one consistent singer and tune throughout. Begin the supplied verse promptly and maintain an unhurried flowing pulse.'],
 'negativeStyles':['No rap, no pop beat, no drums dominating voice, no chorus, no vocal doubles, no humming, no added words, no invented Sanskrit, no omitted lines, no spoken numbers, no long instrumental interludes.'],
 'voiceId':prior['voiceId'],'welcomeAndClosing':[{'name':'welcome','text':'డివైన్ విజ్డమ్ తెలుగు ఛానల్‌కు స్వాగతం. శ్రీ దక్షిణామూర్తి స్తోత్రాన్ని భక్తితో ఆలకిద్దాం.'},{'name':'closing','text':'ఈ స్తోత్రం మీకు నచ్చితే, డివైన్ విజ్డమ్ తెలుగు ఛానల్‌ను సబ్‌స్క్రైబ్ చేయండి. వీడియోను లైక్ చేయండి, షేర్ చేయండి. కామెంట్‌లో ఓం నమః శివాయ అని రాయండి.'}],
 'userAuthorization':'User requested Sri Dakshinamurthy Stotram, same traditional text and similar devotional style, existing channel format with images, name, logo, subscribe like share comment; explicitly approved use of credits. Included account credits only; no subscription changes or overage.',
 'manualListeningVerified':False,'published':False,'referenceAnalysis':'10 verses from Vishvam darpana through Sarvatmatvam; melodic female vocal, quiet drone and bells; repeat the refrain in verses 1–9 as supplied. Original tune and voice, no cloning.'}
(R/'plan.json').write_text(json.dumps(p,ensure_ascii=False,indent=2),encoding='utf8')
(R/'lyrics-telugu.txt').write_text('\n\n'.join(u['text'] for u in units),encoding='utf8')
(R/'art').mkdir(exist_ok=True)
shutil.copyfile('data/branding/divine-wisdom/youtube-avatar/divine-wisdom-telugu-circle-safe.png',R/'channel-logo.png')
print(json.dumps({'verses':len(units),'seconds':p['seconds'],'characters':sum(len(u['text']) for u in units)}))
