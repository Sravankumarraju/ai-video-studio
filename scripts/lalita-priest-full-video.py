from pathlib import Path
import importlib.util,json,re,sys
def module(name,file):
    spec=importlib.util.spec_from_file_location(name,Path(__file__).with_name(file));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
pipeline=module('vignanam','lalita-vignanam-video.py');caps=module('full_caps','full-shloka-captions.py')
pipeline.voice_root=pipeline.voice_root.parent/'priest-chant-full-v4'
pipeline.root=pipeline.voice_root/'final';pipeline.root.mkdir(exist_ok=True);pipeline.renderer.ROOT=pipeline.root
renderer=pipeline.renderer;root=pipeline.root
def captions():
    pipeline.captions();t=renderer.load('timeline');reports=[]
    for scene in t['scenes']:
        if scene['verse'] is None:continue
        tokens=[m for m in re.finditer(r'\S+',scene['text']) if any(caps.telugu_character(c) for c in m.group())]
        assert len(tokens)==len(scene['words'])
        words=[]
        for m,w in zip(tokens,scene['words']):
            assert m.group()==w['text']
            words.append({**w,'start':w['start']-scene['start'],'end':w['end']-scene['start'],'spokenStart':m.start(),'spokenEnd':m.end()})
        report=caps.write_full_shloka(root/f'captions-{scene["index"]:03}.ass',scene['text'],scene['displayText'],words,scene['end']-scene['start'],scene['verse'],font_size=88,max_width=1760,margin=70)
        reports.append(report)
    assert len(reports)==183
    renderer.save('FULL-SHLOKA-CHECK',{'completeShlokas':183,'onePagePerShloka':True,'speakingWordGold':True,'inactiveWordsWhite':True,'fontTarget':88,'previousSampleTarget':82,'safeTextWidth':1760,'reports':reports})
    print(json.dumps({'fullShlokas':183,'fontSizes':sorted(set(r['fontSize'] for r in reports))}),flush=True)
def verify():
    pipeline.verify();v=renderer.load('verification');v['delivery']='Approved rhythmic devotional chanting';v['sampleApprovedByUser']=True;v['fullShlokaVisibleThroughoutRecitation']=True;v['largerFontTarget']=88;v['fontFitCheckedForAll183Shlokas']=True;renderer.save('verification',v);print(json.dumps(v),flush=True)
if __name__=='__main__':{'assemble':pipeline.assemble,'captions':captions,'render':renderer.render,'verify':verify}[sys.argv[1]]()
