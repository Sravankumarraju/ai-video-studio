from pathlib import Path
import json,subprocess,shutil
ROOT=Path('data/productions/divine-wisdom/ayyappa-birth-story-three-part-2026-10-22')
def read(n):return json.loads((ROOT/f'{n}.json').read_text(encoding='utf8'))
def save(n,v):(ROOT/f'{n}.json').write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
assert not (ROOT/'opening-polish.json').exists(),'Opening already polished'
transcript=read('transcribe');first=next(w for w in transcript['words'] if w.get('type')=='word');trim=max(0,first['start']-.08)
assert 0<trim<10
shutil.copyfile(ROOT/'song.mp3',ROOT/'song-before-opening-polish.mp3')
graph=f'[0:a]atrim=start={trim},asetpts=PTS-STARTPTS[main];[0:a]atrim=end={trim},asetpts=PTS-STARTPTS,afade=t=out:st={trim-1}:d=1[tail];[main][tail]concat=n=2:v=0:a=1[out]'
subprocess.run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT/'song-before-opening-polish.mp3'),'-filter_complex',graph,'-map','[out]','-c:a','libmp3lame','-b:a','192k',str(ROOT/'song-opening-polished.mp3')],check=True)
shutil.copyfile(ROOT/'song-opening-polished.mp3',ROOT/'song.mp3')
meta=read('song-metadata')
for w in meta['words_timestamps']:
 w['start_ms']=max(0,w['start_ms']-trim*1000);w['end_ms']=max(0,w['end_ms']-trim*1000)
save('song-metadata',meta)
transcript['words']=[{**w,'start':max(0,w['start']-trim),'end':max(0,w['end']-trim)} for w in transcript['words'] if w['end']>=trim]
save('transcribe',transcript)
plan=read('plan');total=plan['seconds']
for s in plan['sections']:
 s['start']=max(0,s['start']-trim);s['end']-=trim;s['seconds']=s['end']-s['start']
plan['sections'][-1]['end']=total;plan['sections'][-1]['seconds']+=trim
plan['opening']='First sung divine-birth word starts approximately 0.08 seconds into video; instrumental introduction relocated to musical tail'
save('plan',plan)
save('opening-polish',{'originalFirstSungWordSeconds':first['start'],'firstSungWordSeconds':.08,'relocatedIntroSeconds':trim,'durationPreserved':True,'noSpeedChange':True,'chorusRecordedSourceUnchanged':True})
print(json.dumps({'stage':'immediate-singing-opening','firstWordSeconds':.08,'tailSeconds':trim}),flush=True)
