"""Use retained music timings, repaired-stanza alignment and an audible closing refrain."""
from pathlib import Path
import json,subprocess
ROOT=Path('data/productions/divine-wisdom/govinda-namalu-full-2026-10-20')
def load(n):return json.loads((ROOT/f'{n}.json').read_text(encoding='utf8'))
def save(n,v):(ROOT/f'{n}.json').write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
def norm(t):return ''.join(c for c in t if '\u0c00'<=c<='\u0c7f')
p=load('plan');original=load('song-fresh-metadata')['words_timestamps']
aligned=[w for w in load('song-repaired-alignment')['words'] if norm(w['text'])]
expected=[w for u in p['units'] for w in u['text'].split()]
assert len(original)==len(aligned)==len(expected)
assert ''.join(norm(w['text']) for w in aligned)==''.join(norm(w) for w in expected)
words=[dict(w) for w in original[:-5]];cursor=0
for u in p['units'][:-1]:
 count=len(u['text'].split())
 if u['verse'] in [6,14,20]:
  for i in range(cursor,cursor+count):words[i]={'word':expected[i],'start_ms':round(aligned[i]['start']*1000),'end_ms':round(aligned[i]['end']*1000)}
 cursor+=count
assert cursor==len(words)
transcript=load('song-repaired-transcription');recognized=[w for w in transcript['words'] if w.get('type')=='word']
last=recognized[-1];assert 328<last['end']<329
words[-1]['end_ms']=round(last['end']*1000)
# The generated closing refrain was omitted. Reprise the clearly sung opening
# refrain from this very performance, preserving the singer, melody and all names.
cut=329.;start=.24;end=5.5;shift=cut-start
for w in original[:5]:words.append({**w,'start_ms':round(w['start_ms']+shift*1000),'end_ms':round(w['end_ms']+shift*1000)})
assert len(words)==len(expected)
assert all(w['end_ms']>w['start_ms'] for w in words)
source=ROOT/'song-final.mp3'
if not source.exists():
 graph=f'[0:a]atrim=end={cut},asetpts=PTS-STARTPTS[a];[0:a]atrim=start={start}:end={end},asetpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=0:a=1[out]'
 subprocess.run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT/'song-repaired.mp3'),'-filter_complex',graph,'-map','[out]','-ar','48000','-ac','2','-c:a','libmp3lame','-b:a','320k',str(source)],check=True)
save('song-final-metadata',{'words_timestamps':words,'provenance':{'source':'song-repaired.mp3','retainedWordTimings':'song-fresh-metadata.json','repairedStanzas':[6,14,20],'repairedTimings':'song-repaired-alignment.json','closingRefrainReprise':{'sourceStart':start,'sourceEnd':end,'outputStart':cut},'lastNamamEndFromIndependentASR':last['end']}})
base=[w for w in transcript['words'] if w.get('end',0)<=cut]
refrain=[{**w,'start':w['start']+shift,'end':w['end']+shift} for w in transcript['words'] if w.get('type')=='word' and w['start']>=start and w['end']<=end]
save('song-final-transcription',{'language_code':transcript['language_code'],'words':base+refrain,'text':transcript['text']+' '+' '.join(w['text'] for w in refrain),'provenance':'Independent transcription of repaired recording plus its identical opening-refrain audio excerpt reused at the end.'})
save('source-selection',{'selectedSong':'song-final','excludedTakes':['song','song-fresh'],'referenceConditionedFirstTakeExcluded':True,'exactStanzasRepaired':[6,14,20],'closingRefrainReusedFromSameSinger':True,'manualPronunciationReviewPending':True})
print(json.dumps({'stage':'final-source-ready','words':len(words),'seconds':cut+end-start,'closingRefrainIncluded':True}))
