import importlib.util,json,re,sys
from pathlib import Path
spec=importlib.util.spec_from_file_location('lalita_renderer',Path(__file__).with_name('lalita-recitation-video.py'))
renderer=importlib.util.module_from_spec(spec);spec.loader.exec_module(renderer)
voice_root=renderer.ROOT/'male-voice-v2'
renderer.ROOT=voice_root/'final'
root=renderer.ROOT;root.mkdir(exist_ok=True)

def prepare_units():
    plan=json.loads((voice_root/'plan.json').read_text(encoding='utf-8'));selected=[]
    renderer.save('plan',plan)
    for batch in plan['batches']:
        stem=f'batch-{batch["index"]:02}'
        a=json.loads((voice_root/(stem+'-alignment.json')).read_text(encoding='utf-8'))
        assert ''.join(a['characters'])==batch['text'],f'Timing source differs in {stem}'
        for entry in batch['units']:
            timing=a;source_file=stem+'.mp3';offset=entry['startCharacter']
            if entry['name']=='stotram-055':
                timing=json.loads((voice_root/'verse-055-repair-alignment.json').read_text(encoding='utf-8'))
                assert ''.join(timing['characters'])==entry['text']
                source_file='verse-055-repair.mp3';offset=0
            words=[]
            for m in re.finditer(r'\S+',entry['text']):
                if not re.search(r'[\u0c00-\u0c7f\w]',m.group()):continue
                start=offset+m.start();end=offset+m.end()
                s=min(timing['character_start_times_seconds'][start:end]);e=max(timing['character_end_times_seconds'][start:end])
                assert e>s,f'Collapsed spoken word: {entry["name"]}'
                words.append({'text':m.group(),'start':s,'end':e})
            assert words
            selected.append({'index':entry['index'],'name':entry['name'],'verse':entry['verse'],'text':entry['text'],'words':words,'sourceStart':words[0]['start'],'sourceEnd':words[-1]['end'],'sourceFile':'../'+source_file,'clipStart':max(0,words[0]['start']-.03),'clipEnd':words[-1]['end']+.03,'issues':[],'timingSource':'returned male-voice character alignment'})
    selected.sort(key=lambda u:u['index'])
    assert len(selected)==188
    assert [u['index'] for u in selected]==list(range(188))
    assert [u['verse'] for u in selected if u['verse'] is not None]==list(range(1,184))
    for a,b in zip(selected,selected[1:]):
        if a['sourceFile']==b['sourceFile']:
            assert a['sourceEnd']<=b['sourceStart'],'Overlapping spoken-word timing requires review'
            boundary=(a['sourceEnd']+b['sourceStart'])/2
            a['clipEnd']=min(a['clipEnd'],boundary)
            b['clipStart']=max(b['clipStart'],boundary)
            assert a['clipEnd']<=b['clipStart']
    renderer.save('JOIN-CHECK',{'adjacentSourceWindowsDoNotOverlap':True,'paddingSeconds':.03,'wordAttacksAndEndsRetained':True})
    renderer.save('units-selected',selected)

def verify():
    renderer.verify()
    v=renderer.load('verification')
    v.update({'voiceId':'sJrRcQEpUbZehhGBdEbD','voiceName':'God Voice Tone Male','approvedSampleReused':True,'allCaptionsUseNewMaleVoiceTiming':True,'repairsUseExistingProviderWordTiming':False,'extraAcousticUploadPerformed':False,'pronunciationApproval':'User approved the six-verse sample; full listening review not claimed'})
    v['verseJoinsChecked']=renderer.load('JOIN-CHECK')['adjacentSourceWindowsDoNotOverlap']
    renderer.save('verification',v)
    print(json.dumps(v),flush=True)

if __name__=='__main__':
    mode=sys.argv[1]
    if mode=='assemble':prepare_units();renderer.assemble()
    elif mode=='captions':renderer.captions()
    elif mode=='render':renderer.render()
    elif mode=='verify':verify()
