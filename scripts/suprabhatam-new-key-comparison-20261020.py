from pathlib import Path
import json,subprocess,re
ROOT=Path('output/sri-venkateswara-full-approved-2026-10-20')
DESIGN=Path('output/sri-venkateswara-telugu-shaping-fixed-2026-10-20')
OPEN=Path('output/sri-venkateswara-female-chant-v3-2026-10-20/song.mp3')
def run(a):subprocess.run(a,check=True)
def dur(p):return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(p)]))
def at(t):
 n=round(t*100);return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'
def norm(s):return ''.join(c for c in s if '\u0c00'<=c<='\u0c7f')
offset=dur(OPEN);end=offset+dur(ROOT/'verse-04.mp3')
base=(DESIGN/'telugu-captions.ass').read_text(encoding='utf-8-sig')
header=base[:base.index('[Events]')]+'''[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
events=[]
for line in base.splitlines():
 if not line.startswith('Dialogue:'):continue
 if line.startswith('Dialogue: 2,'):
  parts=line.split(',',9);parts[2]=at(end);line=','.join(parts)
 events.append(line)
for start,stop,label in [(0,offset,'Approved opening'),(offset,end,'New recording with the new key — verse 4')]:
 events.append(f'Dialogue: 3,{at(start)},{at(stop)},Default,,0,0,0,,{{\\an7\\pos(76,320)\\fnNoto Sans\\fs30\\c&H00BBD0D1&\\bord0}}{label}')
plan=json.loads((ROOT/'full-production-plan.json').read_text(encoding='utf8'))
lines=[u['text'] for b in plan['batches'] for u in b['units'] if u['verse']==4]
words=[w for w in json.loads((ROOT/'verse-04-metadata.json').read_text(encoding='utf8'))['words_timestamps'] if norm(w['word'])]
assert norm(''.join(lines))==norm(''.join(w['word'] for w in words))
rows=[];index=0
for line in lines:
 row=[]
 for token in line.split():
  if norm(token):row.append([token,index]);index+=1
  elif row:row[-1][0]+=' '+token
 rows.append(row)
assert index==len(words)
bounds=sorted(set([0,end-offset]+[w[t]/1000 for w in words for t in ['start_ms','end_ms'] if 0<w[t]/1000<end-offset]))
for a,b in zip(bounds,bounds[1:]):
 mid=(a+b)*500;active=next((i for i,w in enumerate(words) if w['start_ms']<=mid<w['end_ms']),None)
 text='\\N'.join(' '.join(('{\\c&H008BD1F4&}' if i==active else '{\\c&H00F1F6F6&}')+token for token,i in row) for row in rows)
 events.append(f'Dialogue: 0,{at(offset+a)},{at(offset+b)},Default,,0,0,0,,{{\\an7\\pos(76,410)\\fs64\\q0}}{text}')
ass=ROOT/'new-key-comparison.ass';ass.write_text(header+'\n'.join(events)+'\n',encoding='utf-8-sig')
audio=ROOT/'new-key-comparison.m4a'
if not audio.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(OPEN),'-i',str(ROOT/'verse-04.mp3'),'-filter_complex','[0:a][1:a]concat=n=2:v=0:a=1[a]','-map','[a]','-ar','48000','-ac','2','-c:a','aac','-b:a','192k',str(audio)])
out=ROOT/'Approved-Voice-Vs-New-Key-Comparison-1080p.mp4'
if not out.exists():
 run(['ffmpeg','-v','error','-nostdin','-n','-loop','1','-i',str(DESIGN/'prayer-background.jpg'),'-i',str(audio),'-i',str(ROOT/'channel-logo-transparent.png'),'-filter_complex',f"[0:v]fps=24,ass=filename='{ass.as_posix()}':fontsdir='public/fonts':shaping=complex[bg];[2:v]scale=220:220[logo];[bg][logo]overlay=W-w-28:H-h-28,format=yuv420p[v]",'-map','[v]','-map','1:a','-t',str(end),'-c:v','libx264','-preset','veryfast','-crf','19','-threads','4','-c:a','copy','-movflags','+faststart',str(out)])
run(['ffmpeg','-v','error','-nostdin','-i',str(out),'-f','null','-'])
print(json.dumps({'video':str(out.resolve()),'approvedOpeningSeconds':offset,'newRecordingStartsAt':offset,'durationSeconds':end}))
