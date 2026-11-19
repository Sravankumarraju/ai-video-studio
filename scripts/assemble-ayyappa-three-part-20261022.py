from pathlib import Path
import json,subprocess,shutil
ROOT=Path('data/productions/divine-wisdom/ayyappa-birth-story-three-part-2026-10-22')
def load(n):return json.loads((ROOT/f'{n}.json').read_text(encoding='utf8'))
def save(n,v):(ROOT/f'{n}.json').write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
def norm(s):return ''.join(c for c in s if '\u0c00'<=c<='\u0c7f')
if (ROOT/'assembly.json').exists():raise SystemExit('Assembly already saved; no replacement')
shutil.copyfile(ROOT/'song.mp3',ROOT/'source-song.mp3')
shutil.copyfile(ROOT/'song-metadata.json',ROOT/'source-song-metadata.json')
shutil.copyfile(ROOT/'plan.json',ROOT/'source-plan.json')
meta=load('source-song-metadata');plan=load('source-plan');words=meta['words_timestamps']
desired=''.join(norm(s['text']) for s in plan['sections']);actual=''.join(norm(w['word']) for w in words)
assert desired==actual,'Provider timestamp tokens differ; inspect before assembly'
chunks=[];offset=0;pos=0
for s in plan['sections']:
 end=offset+len(norm(s['text']));items=[]
 while pos<len(words) and offset<end:
  w=words[pos];offset+=len(norm(w['word']));pos+=1;items.append(w)
 assert offset==end
 chunks.append(items)
duration=float(json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(ROOT/'source-song.mp3')]))['format']['duration'])
boundaries=[0]
for i in range(1,4):
 previous=[w for w in chunks[i-1] if w['end_ms']>w['start_ms']]
 following=[w for w in chunks[i] if w['end_ms']>w['start_ms']]
 left=previous[-1]['end_ms']/1000;right=following[0]['start_ms']/1000
 boundaries.append((left+right)/2 if right>=left else plan['sections'][i]['start'])
boundaries.append(duration)
order=[0,1,2,1,3,1];filters=[];labels=[];outwords=[];sections=[];start=0
for k,index in enumerate(order):
 a,b=boundaries[index:index+2];seconds=b-a;label=f'a{k}';labels.append(f'[{label}]')
 filters.append(f'[0:a]atrim=start={a}:end={b},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.008,afade=t=out:st={seconds-.008}:d=0.008[{label}]')
 source=plan['sections'][index]
 sections.append({**source,'id':source['id']+(f'-{k}' if index==1 else ''),'seconds':seconds,'start':start,'end':start+seconds,'sourceIndex':index})
 for w in chunks[index]:outwords.append({**w,'start_ms':max(start*1000,w['start_ms']-a*1000+start*1000),'end_ms':min((start+seconds)*1000,w['end_ms']-a*1000+start*1000)})
 start+=seconds
assert 300<=start<=360,f'Assembled length outside requested range: {start}'
filters.append(''.join(labels)+'concat=n=6:v=0:a=1[out]')
subprocess.run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT/'source-song.mp3'),'-filter_complex',';'.join(filters),'-map','[out]','-c:a','libmp3lame','-b:a','192k',str(ROOT/'assembled-song.mp3')],check=True)
shutil.copyfile(ROOT/'assembled-song.mp3',ROOT/'song.mp3')
save('song-metadata',{**meta,'words_timestamps':outwords})
save('plan',{**plan,'seconds':start,'sections':sections,'structure':'Three story sections connected by the same recorded chorus, reused verbatim three times','narrativeClassification':'Devotional tradition following Kerala Tourism account; alternate local traditions are not blended into this telling','opening':'Immediate sung divine birth: Shiva and Mohini in first line, Harihara son in second','manualListeningVerified':False})
(ROOT/'lyrics-telugu.txt').write_text('\n\n'.join(s['title']+'\n'+s['text'] for s in sections)+'\n',encoding='utf8')
save('assembly',{'sourceSeconds':duration,'finalSeconds':start,'sourceBoundaries':boundaries,'order':order,'chorusSamePCMSource':True,'chorusCount':3,'fadesAtEditBoundariesMs':8,'published':False})
print(json.dumps({'stage':'three-part-assembled','seconds':start,'chorusIdenticalSource':True}),flush=True)
