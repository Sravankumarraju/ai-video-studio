from pathlib import Path
import json
P=Path('data/productions/divine-wisdom/mahishasura-mardini-2026-10-25');R=P/'female-full-v3'
v=json.loads((R/'VERIFICATION.json').read_text(encoding='utf-8'));s=json.loads((R/'studio-registration.json').read_text(encoding='utf-8'))
assert v['fullDecodePassed'] and v['completeShlokaAlwaysVisible'] and s.get('exportJobId')
f=R/'full-production-plan.json';plan=json.loads(f.read_text(encoding='utf-8'));plan.update({'status':'female_full_chant_rendered_review_pending','actualDurationSeconds':v['durationSeconds'],'exportJobId':s['exportJobId'],'projectId':s['projectId'],'published':False});f.write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8')
f=P/'plan.json';parent=json.loads(f.read_text(encoding='utf-8'));parent.update({'status':plan['status'],'actualDurationSeconds':v['durationSeconds'],'latestRevision':'female-full-v3','mediaGenerated':True,'publishReady':False,'published':False});f.write_text(json.dumps(parent,ensure_ascii=False,indent=2),encoding='utf-8')
def visit(value):
 if isinstance(value,dict):
  if value.get('id')=='mahishasura-mardini':value.update({'status':plan['status'],'productionPath':R.as_posix(),'actualDurationSeconds':v['durationSeconds'],'projectId':s['projectId'],'exportJobId':s['exportJobId'],'mediaGenerated':True,'publishReady':False,'nextAction':'Listen to the complete female chant draft and review pronunciation before publication.'})
  else:
   for x in value.values():visit(x)
 elif isinstance(value,list):
  for x in value:visit(x)
q=Path('data/productions/divine-wisdom/channel-plan-2026-10-25')
for name in ['02-mahishasura-mardini.json','production-queue.json']:
 f=q/name;data=json.loads(f.read_text(encoding='utf-8'));visit(data);f.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
start=f'''LATEST VERSION: FEMALE FULL CHANT — FULL SHLOKAS
File: Aigiri-Nandini-Female-Chant-Full-Shlokas-1080p.mp4
Duration: 10:52. 1920x1080 at 24fps. Complete 21 selected-edition shlokas.
The full shloka stays visible; the currently chanted word is gold.
Original AI-assisted female devotional chant; prominent vocal and quieter background music.
Local separation/remix: accompaniment gain 0.2 (-14dB), vocal gain 1.3 (+2.3dB), followed by peak safety and mastering. No speed or pitch changes.
Telugu female welcome and subscribe/like/share/comment closing, with the full transparent channel logo.
Editable Studio: http://localhost:3000/projects/{s['projectId']}
Export job: {s['exportJobId']}
Review package: Aigiri-Nandini-Female-Full-Review-Package.zip
Video decode, duration, source-text caption sequence, layouts and encoded audio peak checks passed.
Full Sanskrit pronunciation and musical continuity need listening review. Not uploaded or published.
User-approved credit ceiling: 13000 existing ElevenLabs credits in total, including prior versions and samples; no topups or overage.
Earlier spoken draft is retained separately in the parent folder.
'''
(R/'START-HERE.txt').write_text(start,encoding='utf-8');(P/'START-HERE.txt').write_text('LATEST APPROVED DIRECTION: female chant with quieter music.\nOpen female-full-v3/START-HERE.txt and the full video in that folder.\nThe earlier spoken draft is superseded and retained for history.\n',encoding='utf-8')
print(json.dumps({'completed':True,'seconds':v['durationSeconds'],'exportJobId':s['exportJobId'],'published':False}))
