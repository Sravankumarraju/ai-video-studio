from pathlib import Path
import json, re, subprocess, math

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'data/productions/divine-wisdom/karthika-short-2026-10-29'
def run(args): subprocess.run(args,check=True,cwd=ROOT)
def probe(p): return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]))
def stamp(s):
    cs=round(s*100)
    return f'{cs//360000}:{cs//6000%60:02}:{cs//100%60:02}.{cs%100:02}'
plan=json.loads((OUT/'production.json').read_text(encoding='utf8'))
a=json.loads((OUT/'narration-alignment.json').read_text(encoding='utf8'))
text=''.join(a['characters'])
starts=a['character_start_times_seconds']; ends=a['character_end_times_seconds']
assert len(text)==len(starts)==len(ends)
words=[dict(text=m.group(),start=starts[m.start()]+.5,end=ends[m.end()-1]+.5) for m in re.finditer(r'\S+',text)]
expected=(OUT/'narration-te.txt').read_text(encoding='utf8').split()
assert [w['text'] for w in words]==expected,'Alignment differs from reviewed script'
assert all(w['end']>w['start']>=0 for w in words)
audio_seconds=float(probe(OUT/'narration.mp3')['format']['duration'])
duration=max(33,math.ceil(audio_seconds+1))
assert 30<=duration<=45
boundaries=[0]; cursor=0
for i,b in enumerate(plan['beats']):
    count=len(b['narration'].split()); chosen=words[cursor:cursor+count];cursor+=count
    if i: boundaries.append(chosen[0]['start'])
assert cursor==len(words)
boundaries.append(duration)
pieces=[]
for i in range(8):
    seconds=boundaries[i+1]-boundaries[i]
    dest=OUT/f'aligned-beat-{i:02}.mp4'
    if not dest.exists():
        run(['ffmpeg','-v','error','-nostdin','-n','-i',str(OUT/f'beat-{i:02}.mp4'),'-vf',f'setpts={seconds/5}*PTS,fps=30','-t',str(seconds),'-an','-c:v','libx264','-threads','2','-preset','veryfast','-crf','19',str(dest)])
    pieces.append(f"file '{dest.name}'\nduration {seconds:.8f}")
(OUT/'aligned-pieces.txt').write_text('\n'.join(pieces),encoding='utf8')
header=(OUT/'preview.ass').read_text(encoding='utf8').split('[Events]')[0]
ass=header+'[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n'
ass+=f'Dialogue: 1,{stamp(0)},{stamp(duration)},Brand,,0,0,0,,DIVINE WISDOM TELUGU\n'
cues=[]
for i in range(0,len(words),3):
    group=words[i:i+3];start=group[0]['start'];end=min(duration,words[i+3]['start'] if i+3<len(words) else group[-1]['end']+.3)
    lines=[' '.join(w['text'] for w in group[:2])]
    if len(group)>2:lines.append(group[2]['text'])
    display=r'\N'.join(lines)
    ass+=f'Dialogue: 2,{stamp(start)},{stamp(end)},Caption,,0,0,0,,{display}\n'
    cues.append(dict(start=start,end=end,text='\n'.join(lines)))
(OUT/'final.ass').write_text(ass,encoding='utf8')
(OUT/'caption-timing.json').write_text(json.dumps(dict(words=words,cues=cues),ensure_ascii=False,indent=2),encoding='utf8')
video=OUT/'karthika-telugu-short-with-audio.mp4'
if not video.exists():
    ass_path=(OUT/'final.ass').relative_to(ROOT).as_posix()
    run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(OUT/'aligned-pieces.txt'),'-i',str(OUT/'narration.mp3'),'-vf',f"ass=filename='{ass_path}':fontsdir='public/fonts':shaping=complex",'-af',f'adelay=500:all=1,loudnorm=I=-16:TP=-1.5:LRA=11,apad,atrim=duration={duration}', '-map','0:v:0','-map','1:a:0','-t',str(duration),'-c:v','libx264','-threads','2','-preset','veryfast','-crf','19','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart',str(video)])
p=probe(video);v=next(s for s in p['streams'] if s['codec_type']=='video');au=next(s for s in p['streams'] if s['codec_type']=='audio')
assert (v['width'],v['height'])==(720,1280)
assert au['codec_name']=='aac' and abs(float(p['format']['duration'])-duration)<.1
run(['ffmpeg','-v','error','-nostdin','-i',str(video),'-f','null','-'])
for t in [2,14,30]:
    frame=OUT/f'final-review-{t:02}s.jpg'
    if not frame.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(t),'-i',str(video),'-frames:v','1',str(frame)])
check=dict(duration=duration,narrationSeconds=audio_seconds,audioCodec=au['codec_name'],audioSampleRate=au['sample_rate'],audioChannels=au['channels'],width=v['width'],height=v['height'],fullDecodePassed=True,alignedWords=len(words),scriptWords=len(expected),voiceId='9dQiWzuJKan0MNO2wA8U',voiceName='Sindhuja Telugu - Divine Wisdom bookends',published=False)
(OUT/'final-verification.json').write_text(json.dumps(check,indent=2),encoding='utf8')
plan.update(status='completed_with_narration',narrationPending=False,paidGenerationAuthorized=True,duration=duration,video=video.name,captions='Character-aligned Telugu narration captions',successfulNarrationCalls=1,published=False)
(OUT/'production.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(check))
