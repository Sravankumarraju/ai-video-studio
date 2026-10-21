from pathlib import Path
import json, re, shutil

base=Path('data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12')
root=base/'video-01-background'
root.mkdir(exist_ok=True)
text=(base/'01-background-te.txt').read_text(encoding='utf-8')
matches=list(re.finditer(r'\[(\d{2}) — ([^\]]+)\]\s*\n(.*?)(?=\n\[|\nEDITORIAL SOURCES)',text,re.S))
assert len(matches)==11
titles=['శ్రీ లలితా సహస్రనామం పరిచయం','మూడు వీడియోల శ్రేణి','సహస్రనామం అంటే ఏమిటి?','పురాణ సంప్రదాయం','గ్రంథ సంబంధం, రచన కాలం','నామాలలోని ప్రధాన భావాలు','సంప్రదాయం, అనుబంధం','భక్తి, మంచి సంకల్పాలు','ఈ పారాయణంలో చేర్చే భాగాలు','సంస్కృతం — తెలుగు లిపిలో','మళ్లీ పారాయణంతో కలుద్దాం']
images=['lamp-manuscript','hero','hero','hayagriva-agastya','lamp-manuscript','hero','family-devotion','family-devotion','lamp-manuscript','hero','hero']
sections=[{'index':i,'title':titles[i],'text':m.group(3).strip(),'direction':m.group(2),'image':images[i]} for i,m in enumerate(matches)]
assert all(0<len(s['text'])<=2000 for s in sections)
config={'title':'శ్రీ లలితా సహస్రనామం పరిచయం | మూలం, సంప్రదాయం, విశిష్టత','language':'te','voiceId':'sJrRcQEpUbZehhGBdEbD','model':'eleven_v4','sections':sections,'maximumNarrationCalls':11,'sources':['https://www.sringeri.net/events/jagadguru-namanam-sri-lalita-sahasranama','https://www.svbfcanada.com/SVBF/LS.html','https://sanskritdocuments.org/doc_devii/lalita.html'],'publishingAuthorized':False}
(root/'episode.json').write_text(json.dumps(config,ensure_ascii=False,indent=2),encoding='utf-8')
(root/'authorization.json').write_text(json.dumps({'userInstruction':'start video1, audio appoved','scope':'Produce Video 1 background film; user approves existing chant sample. Full chant video and publishing are not requested in this turn.','userSampleApprovalReceived':True,'competentSanskritReviewCompleted':False,'maximumNarrationCalls':11,'noAutomaticDuplicateCalls':True,'providerBudgetPolicy':'existing included credits only; no overage or budget changes'},indent=2),encoding='utf-8')
f=base/'SAMPLE-VERIFICATION.json'
record=json.loads(f.read_text(encoding='utf-8'));record['userSampleApprovalReceived']=True;record['userApprovalText']='start video1, audio appoved';f.write_text(json.dumps(record,indent=2),encoding='utf-8')
(root/'assets').mkdir(exist_ok=True)
if not (root/'assets/hero.png').exists():shutil.copyfile(base/'lalita-hero-third-eye.png',root/'assets/hero.png')
print(json.dumps({'sections':len(sections),'characters':sum(len(s['text']) for s in sections),'root':str(root)}))
