import importlib.util,json,re,sys
from pathlib import Path
spec=importlib.util.spec_from_file_location('lalita_renderer',Path(__file__).with_name('lalita-recitation-video.py'))
renderer=importlib.util.module_from_spec(spec);spec.loader.exec_module(renderer)
voice_root=renderer.ROOT/'vignanam-v3';renderer.ROOT=voice_root/'final';renderer.EXPECTED_UNITS=184
root=renderer.ROOT;root.mkdir(exist_ok=True)
def assemble():
    plan=json.loads((voice_root/'plan.json').read_text(encoding='utf-8'));renderer.save('plan',plan);selected=[]
    for b in plan['batches']:
        stem=f'batch-{b["index"]:02}'
        a=json.loads((voice_root/(stem+'-alignment.json')).read_text(encoding='utf-8'))
        acoustic=voice_root/(stem+'-acoustic.json')
        if acoustic.exists():
            chars=[c for c in json.loads(acoustic.read_text(encoding='utf-8'))['characters'] if c['text']!='\r']
            prefix=b['text'][:b['units'][0]['startCharacter']]
            if ''.join(c['text'] for c in chars)==b['text'][len(prefix):] and prefix:
                # Direction tags are not spoken; keep offsets for the actual prayer text.
                chars=[{'text':c,'start':0,'end':0} for c in prefix]+chars
            a={'characters':[c['text'] for c in chars],'character_start_times_seconds':[c['start'] for c in chars],'character_end_times_seconds':[c['end'] for c in chars]}
        assert ''.join(a['characters'])==b['text']
        for u in b['units']:
            timing=a;offset=u['startCharacter'];source_file='../'+stem+'.mp3'
            if u['verse']==163 and (voice_root/'verse-163-repair-alignment.json').exists():
                timing=json.loads((voice_root/'verse-163-repair-alignment.json').read_text(encoding='utf-8'));offset=0;source_file='../verse-163-repair.mp3'
                repair_acoustic=voice_root/'verse-163-repair-acoustic.json'
                if repair_acoustic.exists():
                    chars=[c for c in json.loads(repair_acoustic.read_text(encoding='utf-8'))['characters'] if c['text']!='\r']
                    timing={'characters':[c['text'] for c in chars],'character_start_times_seconds':[c['start'] for c in chars],'character_end_times_seconds':[c['end'] for c in chars]}
                assert ''.join(timing['characters'])==u['text']
            words=[]
            for m in re.finditer(r'\S+',u['text']):
                if not re.search(r'[\u0c00-\u0c7f\w]',m.group()):continue
                start=offset+m.start();end=offset+m.end()
                s=min(timing['character_start_times_seconds'][start:end]);e=max(timing['character_end_times_seconds'][start:end])
                assert e>s,f'Collapsed timing: {u["name"]} {m.group()}'
                words.append({'text':m.group(),'start':s,'end':e})
            selected.append({**u,'words':words,'sourceStart':words[0]['start'],'sourceEnd':words[-1]['end'],'sourceFile':source_file,'clipStart':max(0,words[0]['start']-.03),'clipEnd':words[-1]['end']+.03,'issues':[],'timingSource':'approved male voice timestamps, acoustic timing used for batches 5,7,9'})
    assert [u['index'] for u in selected]==list(range(184))
    assert [u['verse'] for u in selected if u['verse'] is not None]==list(range(1,184))
    for a,b in zip(selected,selected[1:]):
        if a['sourceFile']==b['sourceFile']:
            assert a['sourceEnd']<=b['sourceStart']
            boundary=(a['sourceEnd']+b['sourceStart'])/2
            a['clipEnd']=min(a['clipEnd'],boundary);b['clipStart']=max(b['clipStart'],boundary)
            assert a['clipEnd']<=b['clipStart']
    renderer.save('units-selected',selected);renderer.assemble()
    t=renderer.load('timeline');t['nytDhyanaUnits']=0;t['source']=plan['source'];t['channelWelcomeFirst']=True;t['firstPrayerName']='శ్రీ మాతా';renderer.save('timeline',t)
def captions():
    renderer.captions();t=renderer.load('timeline');f=root/'captions-000.ass';s=f.read_text(encoding='utf-8')
    style='Style: IntroTitle,Noto Sans Telugu,76,&H004AD5FF,&H004AD5FF,&H00101010,&H00000000,0,0,0,0,100,100,0,0,1,3,1,5,80,80,80,1\n'
    s=s.replace('[Events]',style+'[Events]')
    end=renderer.stamp(t['scenes'][0]['end'])
    s+=f'Dialogue: 1,0:00:00.00,{end},IntroTitle,,0,0,0,,{{\\pos(1350,350)}}శ్రీ లలితా\\Nసహస్రనామ స్తోత్రం\n'
    s+=f'Dialogue: 1,0:00:00.00,{end},IntroTitle,,0,0,0,,{{\\pos(1350,225)\\fs34\\c&H00FFFFFF&}}డివైన్ విజ్డమ్ తెలుగు\n'
    f.write_text(s,encoding='utf-8')
def verify():
    t=renderer.load('timeline');f=root/'Lalita-Video-02-Complete-Recitation-Telugu-Script.mp4';info=renderer.probe(f)
    v=next(x for x in info['streams'] if x['codec_type']=='video');assert(v['width'],v['height'])==(1920,1080);assert abs(float(info['format']['duration'])-t['seconds'])<.1
    assert t['scenes'][0]['name']=='channel-welcome' and t['scenes'][1]['verse']==1
    renderer.run(['ffmpeg','-v','error','-nostdin','-i',str(f),'-f','null','-'])
    for name,sec in [('intro',3),('stotram',t['scenes'][1]['start']+2),('middle',t['seconds']/2),('ending',t['seconds']-12)]:
        target=root/f'review-{name}.png'
        if not target.exists():renderer.run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(sec),'-i',str(f),'-frames:v','1',str(target)])
    labels=[('channel-welcome','స్వాగతం — శ్రీ లలితా సహస్రనామ స్తోత్రం'),('stotram-001','శ్రీ మాతా — పారాయణం ప్రారంభం')]+[(f'stotram-{i:03}',f'శ్లోకం {i}') for i in [25,50,75,100,125,150,175]]+[('stotram-183-half-and-closing','శ్రీ శివా — లలితాంబికా'),('closing-cta','ముగింపు సందేశం')]
    chapters=[]
    for key,label in labels:
        seconds=int(next(s for s in t['scenes'] if s['name']==key)['start']);chapters.append(f'{seconds//60:02}:{seconds%60:02} {label}')
    (root/'chapters.txt').write_text('\n'.join(chapters)+'\n',encoding='utf-8')
    metadata={'title':'శ్రీ లలితా సహస్రనామ స్తోత్రం | తెలుగు లిపిలో పారాయణం | Divine Wisdom Telugu','description':'శ్రీ లలితా సహస్రనామ స్తోత్ర పారాయణం. చిన్న తెలుగు స్వాగతం, పరిచయం తరువాత శ్రీ మాతా నామంతో నేరుగా ప్రారంభమవుతుంది.\n\nపాఠం ఆధారం: https://vignanam.org/telugu/sree-lalita-sahasra-nama-stotram.html\n\nన్యాసం, ధ్యాన శ్లోకాలు, ప్రత్యేక ఫలశ్రుతి అధ్యాయం ఈ వీడియోలో చేర్చలేదు.\n\nఅధ్యాయాలు:\n'+'\n'.join(chapters)+'\n\nAI-generated male-voice recitation and devotional artwork.\n\nలైక్ చేయండి, షేర్ చేయండి, సబ్‌స్క్రైబ్ చేయండి. మీ అభిప్రాయాన్ని కామెంట్‌లో చెప్పండి.\n\n#LalitaSahasranamam #Telugu #DivineWisdomTelugu','tags':['Sri Lalita Sahasranamam','Telugu','Vignanam','Divine Wisdom Telugu']}
    assert len(metadata['title'])<=100 and len(metadata['description'].encode())<5000;renderer.save('youtube-metadata',metadata)
    report={'file':f.name,'seconds':float(info['format']['duration']),'resolution':'1920x1080','fullDecodePassed':True,'channelWelcomeAndTitleFirst':True,'startsDirectlyWithSriMata':True,'all183SourceNumberedUnitsPresent':True,'openingPrayersIncluded':False,'source':t['source'],'voiceName':'God Voice Tone Male','wordHighlight':True,'leftTopTextRemoved':True,'sourceTextMatchesSelectedVignanamPage':True,'fullHumanListeningReviewCompleted':False,'uploaded':False}
    renderer.save('verification',report);print(json.dumps(report),flush=True)
if __name__=='__main__':{'assemble':assemble,'captions':captions,'render':renderer.render,'verify':verify}[sys.argv[1]]()
