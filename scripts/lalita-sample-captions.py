"""Create reviewed-text phrase timings from acoustic alignment, without approving pronunciation."""
from pathlib import Path
import json, re, shutil

root = Path('data/productions/divine-wisdom/lalita/sahasranamam-2026-10-12')
captions = json.loads((root/'SAMPLE-CAPTIONS.json').read_text(encoding='utf-8'))
aligned = json.loads((root/'sample-alignment.json').read_text(encoding='utf-8'))
def lexical(ch):
    return not ch.isspace() and ch not in '।॥-'
chars = [item for item in aligned['characters'] if lexical(item['text'])]
actual = ''.join(item['text'] for item in chars)
expected = ''.join(ch for p in captions['phrases'] for ch in p['sanskrit'] if lexical(ch))
assert actual == expected, 'Alignment text changed; do not guess caption offsets'
offset = 0
for phrase in captions['phrases']:
    text = ''.join(ch for ch in phrase['sanskrit'] if lexical(ch))
    selected = chars[offset:offset+len(text)]
    assert ''.join(c['text'] for c in selected) == text
    phrase['startSeconds'] = selected[0]['start']
    phrase['endSeconds'] = selected[-1]['end']
    phrase['status'] = 'acoustic_alignment_draft_requires_listening_review'
    offset += len(text)
assert offset == len(chars)
assert all(a['endSeconds'] <= b['startSeconds']+.001 for a,b in zip(captions['phrases'],captions['phrases'][1:])), 'Overlapping lexical phrase timing'
captions['timingStatus'] = 'acoustically_aligned_draft_not_pronunciation_approved'
(root/'SAMPLE-CAPTIONS-TIMED.json').write_text(json.dumps(captions,ensure_ascii=False,indent=2),encoding='utf-8')
def stamp(seconds):
    n=round(seconds*100)
    return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'
header = '''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Phrase,Noto Sans Telugu,58,&H004AD5FF,&H004AD5FF,&H00101010,&H90000000,0,0,0,0,100,100,0,0,3,2,0,2,130,130,90,1
Style: Title,Noto Sans Telugu,38,&H00FFFFFF,&H00FFFFFF,&H00101010,&H90000000,0,0,0,0,100,100,0,0,3,1,0,8,100,100,30,1
Style: Review,Noto Sans,24,&H00FFFFFF,&H00FFFFFF,&H00101010,&H90000000,0,0,0,0,100,100,0,0,3,1,0,7,24,24,85,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
events=['Dialogue: 0,0:00:00.00,0:01:15.02,Title,,0,0,0,,శ్రీ లలితా సహస్రనామం',
        'Dialogue: 0,0:00:00.00,0:01:15.02,Review,,0,0,0,,CHANT SAMPLE - PRONUNCIATION REVIEW PENDING']
for phrase in captions['phrases']:
    text=phrase['teluguScript'].replace('\n',' ').replace('\r','')
    events.append(f"Dialogue: 0,{stamp(phrase['startSeconds'])},{stamp(phrase['endSeconds'])},Phrase,,0,0,0,,{text}")
(root/'sample-phrases.ass').write_text(header+'\n'.join(events)+'\n',encoding='utf-8')
(root/'fonts').mkdir(exist_ok=True)
shutil.copyfile('public/fonts/NotoSansTelugu.ttf',root/'fonts/NotoSansTelugu.ttf')
words=[w for w in aligned['words'] if any(lexical(c) for c in w['text'])]
collapsed=[w for w in words if w['end']-w['start']<.02]
report={'phrases':len(captions['phrases']),'alignedLexicalTokens':len(words),'collapsedLexicalTokens':len(collapsed),
        'alignmentLoss':aligned.get('loss'),'textMatchesSuppliedSample':True,'pronunciationApproved':False,
        'firstPhraseStart':captions['phrases'][0]['startSeconds'],'lastPhraseEnd':captions['phrases'][-1]['endSeconds'],
        'note':'Text equality and noncollapsed timing do not prove correct audible Sanskrit words or pronunciation.'}
(root/'SAMPLE-TIMING-REVIEW.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
