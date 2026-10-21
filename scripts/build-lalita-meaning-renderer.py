from pathlib import Path
s=Path('scripts/lalita-background-video.py').read_text(encoding='utf-8')
s=s.replace('video-01-background','video-03-bhavasaram').replace('video-01-master.wav','video-03-master.wav').replace('lalita-video-01-background-telugu-1080p.mp4','lalita-video-03-bhavasaram-telugu-1080p.mp4')
s=s.replace("s['index']==10", "s['index']==len(config['sections'])-1").replace("'total':11", "'total':len(t['scenes'])").replace("'sections':11", "'sections':len(t['scenes'])")
s=s.replace('Style: Caption,Noto Sans Telugu,88,&H004AD5FF','Style: Caption,Noto Sans Telugu,88,&H00FFFFFF')
start=s.index("  length=s['end']-s['start'];events=")
end=s.index("  (ROOT/f'captions-",start)
replacement='''  events=[]
  for p in pages:
   if p['section']!=s['index']:continue
   bounds=sorted(set([p['start'],p['end']]+[w['start'] for w in p['words']]))
   for x,y in zip(bounds,bounds[1:]):
    a=round((x-s['start'])*100)/100;b=round((y-s['start'])*100)/100
    if b<=a:continue
    active=next(w for w in reversed(p['words']) if w['start']<=(x+y)/2)
    text='\\\\N'.join(' '.join(('{\\\\c&H004AD5FF&}'+w['text']+'{\\\\c&H00FFFFFF&}') if w==active else w['text'] for w in line) for line in p['lines'])
    events.append(f'Dialogue: 0,{stamp(a)},{stamp(b)},Caption,,0,0,0,,{text}')
'''
s=s[:start]+replacement+s[end:]
s=s.replace("'highlightUnit':'phrase'", "'highlightUnit':'word'")
s=s.replace("'highlightColor':'#ffd54a'", "'highlightColor':'#ffd54a','inactiveColor':'#ffffff','leftTopTextRemoved':True")
Path('scripts/lalita-meaning-video.py').write_text(s,encoding='utf-8')
print('Prepared Video 3 local renderer with word highlighting and no top-left titles.')
