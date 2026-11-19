from pathlib import Path
import json
R=Path('data/productions/divine-wisdom/mahishasura-mardini-2026-10-25')
v=json.loads((R/'VERIFICATION.json').read_text(encoding='utf-8'))
s=json.loads((R/'studio-registration.json').read_text(encoding='utf-8'))
assert v['fullDecodePassed'] and v['all21VersesInCaptionOrder'] and s.get('exportJobId')
p=json.loads((R/'plan.json').read_text(encoding='utf-8'))
p.update({'actualDurationSeconds':v['durationSeconds'],'mediaGenerated':True,'status':'rendered_draft_review_pending','published':False})
(R/'plan.json').write_text(json.dumps(p,ensure_ascii=False,indent=2),encoding='utf-8')
qroot=Path('data/productions/divine-wisdom/channel-plan-2026-10-25')
def visit(value):
    if isinstance(value,dict):
        if value.get('id')=='mahishasura-mardini':
            value.update({'status':'rendered_draft_review_pending','mediaGenerated':True,'publishReady':False,'actualDurationSeconds':v['durationSeconds'],'exportJobId':s['exportJobId'],'nextAction':'Listen to Sanskrit pronunciation and review the private draft before any upload.'})
        else:
            for x in value.values():visit(x)
    elif isinstance(value,list):
        for x in value:visit(x)
for name in ['production-queue.json','02-mahishasura-mardini.json']:
    path=qroot/name;data=json.loads(path.read_text(encoding='utf-8'));visit(data);path.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
text=f'''MAHISHASURA MARDINI / AIGIRI NANDINI — REVIEW DRAFT
Duration: 6:37. 1920x1080, 24fps. All 21 selected-edition verses.
Video: Mahishasura-Mardini-Telugu-1080p-DRAFT.mp4
Review package: Mahishasura-Mardini-Review-Package.zip
Editable project: http://localhost:3000/projects/{s['projectId']}
Export job: {s['exportJobId']}
Large Telugu captions, gold active words, Durga artwork, logo, thumbnail, source register, description and measured chapters included.
Technical decode, caption order, duration, and encoded audio peak checks passed.
Human pronunciation/listening review is pending. No YouTube upload or publication.
Recording authorized up to 10000 existing ElevenLabs credits. No topups or overage; no automatic generation retries.
'''
(R/'START-HERE.txt').write_text(text,encoding='utf-8')
print(json.dumps({'status':p['status'],'projectId':s['projectId'],'exportJobId':s['exportJobId'],'seconds':v['durationSeconds']}))
