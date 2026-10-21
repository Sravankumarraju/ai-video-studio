from pathlib import Path
import json,re,subprocess,importlib.util,sys
spec=importlib.util.spec_from_file_location('full_caps',Path(__file__).with_name('full-shloka-captions.py'))
caps=importlib.util.module_from_spec(spec);spec.loader.exec_module(caps)
base=Path('data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12');root=base/'video-02-recitation/priest-chant-sample-2026-10-14'
def run(a):subprocess.run(a,check=True)
def probe(f):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(f)]))
def main():
    plan=json.loads((root/'plan.json').read_text(encoding='utf-8'));a=json.loads((root/'alignment.json').read_text(encoding='utf-8'));request=json.loads((root/'request.json').read_text(encoding='utf-8'))
    assert ''.join(a['characters'])==request['inputs'][0]['text']
    seconds=float(probe(root/'sample.mp3')['format']['duration']);units=[]
    for u in plan['units']:
        words=[]
        for m in re.finditer(r'\S+',u['text']):
            if not any(caps.telugu_character(c) for c in m.group()):continue
            x=u['startCharacter']+m.start();y=u['startCharacter']+m.end();s=min(a['character_start_times_seconds'][x:y]);e=max(a['character_end_times_seconds'][x:y]);assert e>s
            words.append({'text':m.group(),'start':s,'end':e,'spokenStart':m.start(),'spokenEnd':m.end()})
        units.append({**u,'words':words})
    cuts=[0]+[(x['words'][-1]['end']+y['words'][0]['start'])/2 for x,y in zip(units,units[1:])]+[seconds]
    cuts=[round(t*24)/24 for t in cuts];reports=[];concat=[]
    for i,u in enumerate(units):
        start=cuts[i];duration=cuts[i+1]-start
        words=[{**w,'start':w['start']-start,'end':w['end']-start} for w in u['words']]
        ass=root/f'captions-{i:02}.ass';reports.append(caps.write_full_shloka(ass,u['text'],u['displayText'],words,duration,u['verse']))
        clip=root/f'video-{i:02}.mp4'
        if not clip.exists():run(['ffmpeg','-hide_banner','-v','error','-nostdin','-n','-loop','1','-i',str(base/'video-01-background/assets/hero.png'),'-vf',f"scale=1920:1080,ass=filename='{ass.as_posix()}':fontsdir='public/fonts':shaping=complex,format=yuv420p",'-t',str(duration),'-r','24','-an','-c:v','libx264','-preset','veryfast','-crf','20','-threads','2',str(clip)])
        concat.append(f"file 'video-{i:02}.mp4'")
    (root/'video-concat.txt').write_text('\n'.join(concat)+'\n',encoding='utf-8')
    final=root/'Lalita-Priest-Chant-Full-Shloka-Sample.mp4'
    if not final.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(root/'video-concat.txt'),'-i',str(root/'sample.mp3'),'-c:v','copy','-c:a','aac','-b:a','192k','-t',str(seconds),'-movflags','+faststart',str(final)])
    run(['ffmpeg','-v','error','-nostdin','-i',str(final),'-f','null','-'])
    for i,sec in [('first',2),('fourth',(cuts[3]+cuts[4])/2)]:
        f=root/f'review-{i}.png'
        if not f.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(sec),'-i',str(final),'-frames:v','1',str(f)])
    report={'sampleFile':str(final.resolve()),'seconds':seconds,'verses':4,'fullShlokaVisible':True,'wordHighlight':True,'voiceName':'God Voice Tone Male','fullDecodePassed':True,'chantDeliveryUserApprovalPending':True,'fullReplacementStarted':False,'captionChecks':reports}
    (root/'VERIFICATION.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report),flush=True)
if __name__=='__main__':main()
