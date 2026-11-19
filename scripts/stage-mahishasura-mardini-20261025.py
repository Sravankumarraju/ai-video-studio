from pathlib import Path
import json, importlib.util
ROOT=Path('data/productions/divine-wisdom/mahishasura-mardini-2026-10-25')
plan=json.loads((ROOT/'plan.json').read_text(encoding='utf-8'))
project='3244d863-6717-43a8-91a6-b6a6ccf743b0'
(ROOT/'studio-registration.json').write_text(json.dumps({'projectId':project,'assets':{},'assembled':False,'stage':'recording_authorized'},indent=2),encoding='utf-8')
spec=importlib.util.spec_from_file_location('caps',Path(__file__).with_name('mahishasura-line-captions.py'))
caps=importlib.util.module_from_spec(spec);spec.loader.exec_module(caps)
reports=[]
for verse in plan['verses']:
    for index,line in enumerate(verse['lines']):
        target=ROOT/'caption-layout-sample.ass'
        result=caps.write_full_shloka(target,line,line,[],5,verse['number'],font_size=88,max_width=1720,margin=100)
        reports.append({'verse':verse['number'],'line':index+1,'fontSize':result['fontSize']})
# Select a representative first line for a static, untimed layout sample.
caps.write_full_shloka(ROOT/'caption-layout-sample.ass',plan['verses'][0]['lines'][0],plan['verses'][0]['lines'][0],[],5,1,font_size=88,max_width=1720,margin=100)
(ROOT/'caption-layout-check.json').write_text(json.dumps({'linesChecked':len(reports),'minimumFontSize':min(x['fontSize'] for x in reports),'timingVerified':False,'reports':reports},indent=2),encoding='utf-8')
qroot=Path('data/productions/divine-wisdom/channel-plan-2026-10-25')
def update(item):
    item.update({'status':'recording_authorized','projectId':project,'productionPath':ROOT.as_posix(),'mediaGenerated':False,'publishReady':False,'nextAction':'Record within the approved 10000 existing-credit cap, align, render and review.'})
    item['text']={'status':'selected_and_count_checked','verifiedCount':21,'edition':plan['source'],'notes':plan['editionScope']}
single=qroot/'02-mahishasura-mardini.json'
item=json.loads(single.read_text(encoding='utf-8'));update(item);single.write_text(json.dumps(item,ensure_ascii=False,indent=2),encoding='utf-8')
queue=qroot/'production-queue.json'
data=json.loads(queue.read_text(encoding='utf-8'))
def visit(value):
    if isinstance(value,dict):
        if value.get('id')=='mahishasura-mardini':update(value)
        else:
            for v in value.values():visit(v)
    elif isinstance(value,list):
        for v in value:visit(v)
visit(data);queue.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'projectId':project,'captionLinesChecked':len(reports),'minimumFontSize':min(x['fontSize'] for x in reports),'paidGenerationStarted':False}))
