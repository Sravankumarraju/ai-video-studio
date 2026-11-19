"""Local, silent editorial preview. Never starts paid generation or uploads."""
from pathlib import Path
import json, subprocess

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/productions/divine-wisdom/karthika-short-2026-10-29'
OUT.mkdir(parents=True, exist_ok=True)
beats = [
    ('కార్తీక మాసంలో దీపం…\nఏం గుర్తుచేస్తుంది?', 'కార్తీక మాసంలో వెలిగించే చిన్న దీపం… మనకు ఏం గుర్తుచేస్తుంది?', 'lamp'),
    ('చీకటిని తొలగించే వెలుగు', 'చీకటిని తొలగించే వెలుగులాగే,', 'lamp'),
    ('కోపాన్ని తగ్గించి…\nప్రేమను పెంచుకుందాం', 'మనలోని కోపాన్ని తగ్గించి, ప్రేమను పెంచుకోవాలని గుర్తుచేస్తుంది.', 'shiva'),
    ('ఫోన్‌ను పక్కన పెట్టి…\nఒక్క క్షణం ప్రశాంతంగా', 'దీపం వెలిగించే ఆ క్షణంలో ఫోన్‌ను పక్కన పెట్టండి.', 'lamp'),
    ('మీ ఇష్టదైవాన్ని\nస్మరించండి', 'ప్రశాంతంగా కూర్చుని, మీ ఇష్టదైవాన్ని స్మరించండి.', 'shiva'),
    ('అందరి క్షేమాన్ని\nకోరుకుందాం', 'మన ప్రార్థనలో మన కుటుంబంతో పాటు, అందరి క్షేమాన్ని కోరుకుందాం.', 'shiva'),
    ('ఇంట్లో దీపం…\nమనసులో దయ', 'ఈ కార్తీకంలో… ఇంట్లో దీపం, మనసులో దయ.', 'lamp'),
    ('ఓం నమః శివాయ', 'ఓం నమః శివాయ!', 'shiva'),
]
images = {
    'lamp': ROOT / 'data/productions/divine-wisdom/chapters-7-10-art/lamp.png',
    'shiva': ROOT / 'data/productions/divine-wisdom/shiva-tandavam-2026-10-15/kailash-meditation.png',
}
def run(args):
    subprocess.run(args, check=True, cwd=ROOT)
def stamp(s):
    return f'0:{s//60:02}:{s%60:02}.00'
script = '\n\n'.join(b[1] for b in beats)
(OUT / 'narration-te.txt').write_text(script, encoding='utf-8')
header = '''[Script Info]
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Noto Sans Telugu,46,&H00FFFFFF,&H00FFFFFF,&H0020150B,&H80000000,1,0,0,0,100,100,0,0,1,3,1,2,60,85,270,1
Style: Brand,Noto Sans,21,&H009DDFFF,&H009DDFFF,&H0020150B,&H80000000,1,0,0,0,100,100,0,0,1,1,0,8,30,30,85,1
Style: Note,Noto Sans,16,&H00D8D8D8,&H00D8D8D8,&H0020150B,&H80000000,0,0,0,0,100,100,0,0,1,1,0,8,30,30,120,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 1,0:00:00.00,0:00:40.00,Brand,,0,0,0,,DIVINE WISDOM TELUGU
Dialogue: 1,0:00:00.00,0:00:40.00,Note,,0,0,0,,VISUAL PREVIEW - NARRATION PENDING
'''
for i, (text, _, _) in enumerate(beats):
    header += f'Dialogue: 2,{stamp(i*5)},{stamp((i+1)*5)},Caption,,0,0,0,,{{\\fad(250,200)}}' + text.replace('\n', r'\N') + '\n'
(OUT / 'preview.ass').write_text(header, encoding='utf-8')
for i, (_, _, key) in enumerate(beats):
    piece = OUT / f'beat-{i:02}.mp4'
    if piece.exists() and piece.stat().st_size == 0:
        piece.unlink()
    if piece.exists():
        continue
    # Preserve Shiva's face in the portrait crop; keep lamp centered.
    focal = '.40' if key == 'shiva' else '.50'
    vf = f"scale=-2:1280,crop=720:1280:(iw-720)*{focal}:0,zoompan=z='1+0.00025*on':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=150:s=720x1280:fps=30,drawbox=x=0:y=820:w=iw:h=460:color=black@0.45:t=fill,format=yuv420p"
    run(['ffmpeg','-v','error','-nostdin','-n','-i',str(images[key]),'-vf',vf,'-t','5','-an','-c:v','libx264','-threads','2','-preset','veryfast','-crf','20',str(piece)])
(OUT / 'pieces.txt').write_text('\n'.join(f"file 'beat-{i:02}.mp4'" for i in range(8)), encoding='utf-8')
video = OUT / 'karthika-telugu-short-visual-preview.mp4'
if not video.exists():
    ass = (OUT / 'preview.ass').relative_to(ROOT).as_posix()
    run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(OUT/'pieces.txt'),'-vf',f"ass=filename='{ass}':fontsdir='public/fonts':shaping=complex",'-an','-c:v','libx264','-threads','2','-preset','veryfast','-crf','20','-movflags','+faststart',str(video)])
probe = json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)]))
v = next(s for s in probe['streams'] if s['codec_type']=='video')
assert (v['width'],v['height']) == (720,1280)
assert abs(float(probe['format']['duration'])-40)<.1
run(['ffmpeg','-v','error','-nostdin','-i',str(video),'-f','null','-'])
frame = OUT / 'review-02s.jpg'
if not frame.exists():
    run(['ffmpeg','-v','error','-nostdin','-n','-ss','2','-i',str(video),'-frames:v','1',str(frame)])
manifest = dict(title='కార్తీక మాసంలో దీపం ఎందుకు వెలిగిస్తారు? | Telugu Devotional #Shorts',duration=40,width=720,height=1280,status='silent_visual_preview',narrationPending=True,paidGenerationAuthorized=False,paidCalls=0,published=False,scriptCharacters=len(script),classification='Original devotional reflection; not a scripture quotation or ritual instruction',captions='Editorial display beats; not aligned to recorded speech',beats=[dict(start=i*5,end=(i+1)*5,display=b[0],narration=b[1],source=str(images[b[2]].relative_to(ROOT))) for i,b in enumerate(beats)])
(OUT/'production.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(video=str(video),seconds=40,verified=True,characters=len(script))))
