from pathlib import Path
import json,wave,subprocess,hashlib
import numpy as np
ROOT=Path('output/sri-venkateswara-full-approved-2026-10-20')
def canonical(s):
 s=''.join(chr(ord(c)-0x300) if '\u0c00'<=c<='\u0c7f' else c for c in s).replace('ळ','ल').replace('ङ्','ं').replace('ञ्','ं')
 return ''.join(c for c in s if '\u0900'<=c<='\u0963')
def remap(t,cuts):return t-sum(max(0,min(t,b)-a) for a,b in cuts if t>a)
def normalize(name,source,rows):
 folder=ROOT/'audio';folder.mkdir(exist_ok=True);raw=folder/(name+'-raw.wav')
 if not raw.exists():subprocess.run(['ffmpeg','-v','error','-nostdin','-n','-i',str(source),'-ar','48000','-ac','2','-c:a','pcm_s16le',str(raw)],check=True)
 with wave.open(str(raw),'rb') as f:rate=f.getframerate();channels=f.getnchannels();samples=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').reshape(-1,channels).copy()
 total=len(samples)/rate
 meta=json.loads((ROOT/f'{name}-metadata.json').read_text(encoding='utf8'));words=[w for w in meta['words_timestamps'] if canonical(w['word'])]
 assert canonical(''.join(rows))==canonical(''.join(w['word'] for w in words))
 lineends=set();cursor=0
 for line in rows:cursor+=len(canonical(line));lineends.add(cursor)
 cursor=0;cuts=[];gaps=[]
 for w,nxt in zip(words,words[1:]):
  cursor+=len(canonical(w['word']));a=w['end_ms']/1000;b=nxt['start_ms']/1000;gap=b-a
  boundary=cursor in lineends;target=.8 if boundary else .18
  limit=1.25 if boundary else .45
  cut=None
  if gap>limit:
   remove=gap-target;cut=(a+(gap-remove)/2,b-(gap-remove)/2);cuts.append(cut)
  gaps.append({'after':w['word'],'before':nxt['word'],'location':'printed-line-boundary' if boundary else 'within-phrase','originalGapSeconds':round(gap,3),'editedGapSeconds':round(target if cut else gap,3)})
 last=words[-1]['end_ms']/1000
 # Remove only post-lyric tail; do not stretch, speed or alter any voiced word.
 if total>last+.65:cuts.append((last+.65,total))
 cuts=sorted(cuts);assert all(a>=0 and b>a and b<=total+.001 for a,b in cuts)
 blocks=[];start=0
 for a,b in cuts:
  end=round(a*rate);blocks.append(samples[start:end].copy());start=round(b*rate)
 blocks.append(samples[start:].copy())
 fade=int(rate*.003)
 for i,block in enumerate(blocks):
  n=min(fade,len(block)//2)
  if n and i>0:block[:n]=(block[:n]*np.linspace(0,1,n)[:,None]).astype('<i2')
  if n and i<len(blocks)-1:block[-n:]=(block[-n:]*np.linspace(1,0,n)[:,None]).astype('<i2')
 result=np.concatenate(blocks,axis=0)
 target=folder/(name+'.wav')
 with wave.open(str(target),'wb') as f:f.setnchannels(channels);f.setsampwidth(2);f.setframerate(rate);f.writeframes(result.tobytes())
 report={'recording':name,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'originalSeconds':total,'editedSeconds':len(result)/rate,'cuts':cuts,'gaps':gaps,'vocalTimingUnstretched':True,'pitchChanged':False,'method':'Trim excess intervals between complete word endpoints and post-lyric tail; 3ms fades within the cuts. Line-boundary target 0.8s, within-phrase target 0.18s only when a gap exceeds 0.45s. These are editorial targets, not measured exact timings of the reference.'}
 (folder/(name+'-gap-audit.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
 return target,report
