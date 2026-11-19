"""Prepare the complete traditional text and the channel's existing production format."""
from pathlib import Path
import json,re,shutil

ROOT=Path('data/productions/divine-wisdom/vishnu-sahasranamam-2026-10-22')
def save(name,value): (ROOT/f'{name}.json').write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf8')
raw=(ROOT/'source-text.txt').read_text(encoding='utf8')
raw=raw[raw.index('ఓం శుక్లాంబరధరం'):raw.index('Quick Links')]
headings={'పూర్వ పీఠికా':'opening','పూర్వన్యాసః':'nyasa','కరన్యాసః':'karanyasa','అంగన్యాసః':'anganyasa','ధ్యానం':'dhyanam','పంచపూజ':'panchapuja','స్తోత్రం':'stotram','ఉత్తర పీఠికా':'phalashruti','ఫలశ్రుతిః':'phalashruti'}
units=[];section='opening';pending=[]
def flush():
 if not pending:return
 display='\n'.join(pending).strip();pending.clear()
 numbers=re.findall(r'[॥।]\s*(\d+)\s*॥',display)
 verse=int(numbers[-1]) if numbers else None
 spoken=re.sub(r'[॥।]\s*\d+\s*॥',' ॥',display)
 spoken=re.sub(r'\[[^\]]*\]','',spoken)
 spoken=re.sub(r'[\u200b\u200c\u200d\ufeff]','',spoken)
 spoken=re.sub(r'[॥।!]+',' ',spoken).replace('-','')
 spoken=re.sub(r'\s+',' ',spoken).strip()
 if not spoken:return
 syllables=len(re.findall(r'[\u0c05-\u0c39\u0c58-\u0c61]',spoken))
 seconds=max(4,round(syllables/5.7+0.7))
 units.append({'index':len(units),'id':f'prayer-{len(units):03}','section':section,'verse':verse,'displayText':display,'text':spoken,'seconds':seconds})

for line in raw.splitlines():
 line=line.strip()
 if not line:continue
 if line in headings:
  flush();section=headings[line];continue
 if section in ['nyasa','karanyasa','anganyasa','panchapuja']:
  flush();pending.append(line);flush();continue
 if re.search(r'ఉవాచ$|వానువాచ$|త్యువాచ$|బ్రహ్మోవాచ$',line):
  flush();pending.append(line);continue
 pending.append(line)
 if re.search(r'[॥।]\s*\d+\s*॥',line) or (len(pending)==1 and ('ఓం నమ' in line or line.startswith(('ఓం నమో','శ్రీ సర్వప్రహరణ','శ్రీ వాసుదేవో','స్తుత ఏవ','న తే యాంతి','శ్రీ సహస్రకోటీ','శ్రీరామ నామ','శ్రీవాసుదేవ')))):
  flush()
flush()
core=[u['verse'] for u in units if u['section']=='stotram' and u['verse'] is not None]
assert core==list(range(1,109)),core
assert [u['verse'] for u in units if u['section']=='opening' and u['verse'] is not None]==list(range(1,23))
assert [u['verse'] for u in units if u['section']=='phalashruti' and u['verse'] is not None]==list(range(1,34))
assert all(not re.search(r'\d',u['text']) for u in units)
batches=[];group=[]
for u in units:
 if group and (sum(x['seconds'] for x in group)+u['seconds']>420 or group[-1]['section']!=u['section']):
  batches.append({'index':len(batches),'units':group,'seconds':sum(x['seconds'] for x in group)});group=[]
 group.append(u)
if group:batches.append({'index':len(batches),'units':group,'seconds':sum(x['seconds'] for x in group)})
# Merge short adjacent ceremonial sections while preserving every unit and its order.
merged=[]
for b in batches:
 if merged and merged[-1]['seconds']+b['seconds']<=420:
  merged[-1]['units']+=b['units'];merged[-1]['seconds']+=b['seconds']
 else:merged.append({'index':len(merged),**{k:v for k,v in b.items() if k!='index'}})
old=json.loads(Path('data/productions/divine-wisdom/govinda-namalu-full-2026-10-20/plan.json').read_text(encoding='utf8'))
plan={'title':'శ్రీ విష్ణు సహస్రనామ స్తోత్రం','source':'https://www.ohtccwa.org/pooja_library/vishnu_sahasranamam_te','reference':'https://www.youtube.com/watch?v=zKC17254flc','units':units,'batches':merged,'seconds':sum(u['seconds'] for u in units),'mainNumberedVerses':108,'openingNumberedVerses':22,'closingNumberedVerses':33,'completeSourceIncluded':True,'voiceId':old['voiceId'],'voiceDirection':'Original solo female South Indian Sanskrit melodic chant, steady and clear, soft tanpura and gentle flute, bells and strings. Broad reference style; no voice cloning or reference recording reuse.','positiveStyles':['Traditional Sanskrit Sri Vishnu Sahasranamam prayer written in Telugu script, original South Indian devotional melodic chanting','One warm mature female solo lead, medium register, steady moderate stotra cadence, restrained ornamentation','Precise native Sanskrit diction, preserve long vowels, consonant clusters, anusvara and visarga; sing every supplied word exactly once in order','Continuous quiet tanpura drone with very soft veena flute strings and sparse temple bells; centered clear voice well above accompaniment','Natural short breaths between full verses, same singer key melody and rhythm throughout, no instrumental interludes','Keep the final syllable complete; no invented or substituted words'], 'negativeStyles':['male voice','choir','duet','pop beat','loud percussion','English lyrics','translated lyrics','repeated phrases','omitted words','long instrumental intro','dramatic vocal runs'], 'welcomeAndClosing':[{'name':'welcome','text':'డివైన్ విజ్డమ్ తెలుగు ఛానల్‌కు స్వాగతం. ఇప్పుడు శ్రీ విష్ణు సహస్రనామ స్తోత్రాన్ని, పూర్వపీఠిక, ధ్యానం, సంపూర్ణ సహస్రనామాలు మరియు ఫలశ్రుతితో ఆలకిద్దాం. తెరపై తెలుగు సాహిత్యాన్ని అనుసరిస్తూ భక్తితో వినండి.'},{'name':'closing','text':'శ్రీమన్నారాయణుని అనుగ్రహం మీ అందరికీ కలగాలి. డివైన్ విజ్డమ్ తెలుగు ఛానల్‌ను సబ్‌స్క్రైబ్ చేయండి. ఈ వీడియోను లైక్ చేసి, మీ కుటుంబ సభ్యులకు షేర్ చేయండి. కామెంట్‌లో ఓం నమో నారాయణాయ అని రాయండి. ఓం నమో నారాయణాయ.'}], 'artCount':7,'captionFormat':'Existing Govinda Namalu format: complete shloka held on screen, white Telugu text, current word gold; original source verse numbers visual only','userAuthorization':'Create complete Vishnu Sahasranamam based on supplied YouTube reference audio style, 6 or 7 visuals, complete namam/shloka captions with speaking words highlighted, existing Govinda Namalu design, channel name opening and subscribe like share comments ending.','billing':'Included credits only; no overage; no automatic retry of unknown generation attempts','published':False,'humanPronunciationReviewPending':True}
save('plan',plan)
save('SOURCE-CHECK',{'numberedMainVerseSequence':core,'all108PresentInOrder':True,'thousandNameRegisterIndependentlyCounted':False,'openingNumberedVerses':22,'closingNumberedVerses':33,'allTraditionalSourceSectionsIncluded':True,'bracketedEditorialVariantsExcluded':True,'numbersExcludedFromAudio':True,'modernWebsiteCommentaryCopied':False,'sourceEditionProofreadingPending':True})
(ROOT/'complete-lyrics-telugu.txt').write_text('\n\n'.join(u['displayText'] for u in units)+'\n',encoding='utf8')
(ROOT/'art').mkdir(exist_ok=True);(ROOT/'fonts').mkdir(exist_ok=True)
for n in ['NotoSansTelugu.ttf','OFL.txt']:shutil.copyfile(Path('public/fonts')/n,ROOT/'fonts'/n)
shutil.copyfile('data/branding/divine-wisdom/youtube-avatar/divine-wisdom-telugu-circle-safe.png',ROOT/'channel-logo.png')
print(json.dumps({'units':len(units),'batches':len(merged),'seconds':plan['seconds'],'mainVerses':len(core),'batchSeconds':[b['seconds'] for b in merged]}))
