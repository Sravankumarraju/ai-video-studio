from pathlib import Path
from html.parser import HTMLParser
import json,re,shutil

ROOT=Path('data/productions/divine-wisdom/govinda-namalu-full-2026-10-20')
PREVIOUS=Path('data/productions/divine-wisdom/venkateswara/suprabhatam-2026-10-19/full-approved-natural-v3')
class Paragraphs(HTMLParser):
 def __init__(self):super().__init__();self.on=False;self.parts=[];self.cur=''
 def handle_starttag(self,t,a):
  if t=='p':self.on=True;self.cur=''
  if t=='br' and self.on:self.cur+='\n'
 def handle_endtag(self,t):
  if t=='p' and self.on:self.parts.append(self.cur);self.on=False
 def handle_data(self,d):
  if self.on:self.cur+=d

parser=Paragraphs();parser.feed((ROOT/'source.html').read_text(encoding='utf8'))
start=next(i for i,x in enumerate(parser.parts) if x.strip().startswith('గోవిందా హరి గోవిందా'))
end=next(i for i in range(start+1,len(parser.parts)) if parser.parts[i].strip().startswith('గోవిందా హరి గోవిందా'))
text='\n'.join(parser.parts[start:end+1]);text=re.sub(r'\[[^\]]*\]','',text)
lines=[re.sub(r'[|౦-౯0-9]+','',x).strip() for x in text.splitlines()]
lines=[x for x in lines if x]
assert len(lines)==112,(len(lines),'Expected refrain + 108 names + refrain')
assert all(x.endswith('గోవిందా') for x in lines)
units=[{'verse':0,'text':'\n'.join(lines[:2]),'seconds':6,'kind':'refrain'}]
units += [{'verse':i+1,'text':'\n'.join(lines[2+i*4:6+i*4]),'seconds':12,'kind':'prayer'} for i in range(27)]
units += [{'verse':28,'text':'\n'.join(lines[-2:]),'seconds':6,'kind':'refrain'}]
sample=json.loads(Path('data/productions/divine-wisdom/govinda-namalu-female-sample-2026-10-20/request.json').read_text(encoding='utf8'))
styles=sample['composition_plan']['chunks'][0]['positive_styles']
styles += ['Maintain the same female singer, melodic motif and 90 BPM rhythm across every chunk of this single continuous namavali. Each new namam immediately follows the previous name with a short natural breath; there are no musical interludes between stanzas.',
 'Sing each supplied line exactly once in order, including all 108 names and the two supplied refrains. Complete every syllable. The supplied text changes in every chunk; do not repeat earlier names unless they appear in the current lyrics.']
plan={'source':'https://stotranidhi.com/sri-govinda-namalu/','sourceTitle':'Sri Govinda Namalu – Stotra Nidhi',
 'namamCount':108,'stanzaCount':27,'totalLyricLines':112,'units':units,'seconds':sum(u['seconds'] for u in units),
 'positiveStyles':styles,'negativeStyles':sample['composition_plan']['chunks'][0]['negative_styles'],
 'voiceDirection':'Single female, flowing 90 BPM, short natural breaths; approved sample style',
 'welcomeAndClosing':[
 {'name':'welcome','text':'డివైన్ విజ్డమ్ తెలుగు ఛానల్‌కు స్వాగతం. ఇప్పుడు శ్రీ గోవింద నామాలను మధురమైన భక్తి సంగీతంతో ఆలకిద్దాం.'},
 {'name':'closing','text':'శ్రీ గోవింద నామాలు మీకు నచ్చితే, మా డివైన్ విజ్డమ్ తెలుగు ఛానల్‌ను సబ్‌స్క్రైబ్ చేయండి. ఈ వీడియోను లైక్ చేయండి, షేర్ చేయండి. కామెంట్‌లో గోవిందా గోవిందా అని రాయండి. శ్రీ వేంకటేశ్వర స్వామి అనుగ్రహం మీ అందరికీ కలగాలి.'}],
 'voiceId':json.loads((PREVIOUS/'plan.json').read_text(encoding='utf8'))['voiceId'],
 'verseNumbersExcludedFromAudio':True,'bracketedEditorialVariantsExcluded':True,'sourceSequenceVerified':True,
 'artReusedFrom':str(PREVIOUS/'art'),'existingChannelLogo':True,'published':False,
 'userAuthorization':'Create complete Govinda Namalu video using existing channel production pattern, approved single female direction, short gaps and soft music.'}
(ROOT/'plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf8')
(ROOT/'complete-lyrics-telugu.txt').write_text('\n\n'.join(u['text'] for u in units)+'\n',encoding='utf8')
(ROOT/'art').mkdir(exist_ok=True);(ROOT/'fonts').mkdir(exist_ok=True)
for p in (PREVIOUS/'art').glob('*.png'):shutil.copyfile(p,ROOT/'art'/p.name)
for p in ['NotoSansTelugu.ttf','OFL.txt']:
 shutil.copyfile(Path('public/fonts')/p,ROOT/'fonts'/p)
shutil.copyfile('data/branding/divine-wisdom/youtube-avatar/divine-wisdom-telugu-circle-safe.png',ROOT/'channel-logo.png')
print(json.dumps({'namams':108,'stanzas':27,'lines':len(lines),'prayerSeconds':plan['seconds'],'artReused':len(list((ROOT/'art').glob('*.png')))}))
