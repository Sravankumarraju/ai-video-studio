from PIL import ImageFont
from pathlib import Path
import re
FONT='public/fonts/NotoSansTelugu.ttf'
def stamp(t):
    n=round(t*100);return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'
def telugu_character(c):return '\u0c00'<=c<='\u0c7f'
def write_full_shloka(target,spoken,display,words,duration,verse,font_size=82,max_width=1620,margin=130):
    source_chars=[i for i,c in enumerate(spoken) if telugu_character(c)]
    display_chars=[i for i,c in enumerate(display) if telugu_character(c)]
    assert ''.join(spoken[i] for i in source_chars)==''.join(display[i] for i in display_chars)
    mapping=dict(zip(source_chars,display_chars))
    for w in words:
        indices=[i for i in range(w['spokenStart'],w['spokenEnd']) if i in mapping]
        assert indices
        w['displayStart']=mapping[indices[0]];w['displayEnd']=mapping[indices[-1]]+1
    if display.endswith('॥'):display=display[:-1]+f'॥ {verse} ॥'
    half=re.search(r'(?<!।)।(?!।)',display)
    if half:cut=half.end()
    else:
        f=ImageFont.truetype(FONT,76)
        candidates=[m.end() for m in re.finditer(r'\s+',display)]
        cut=min(candidates,key=lambda i:max(f.getlength(display[:i]),f.getlength(display[i:])))
    ranges=[(0,cut),(cut,len(display))]
    size=font_size
    while size>48:
        font=ImageFont.truetype(FONT,size)
        if max(font.getlength(display[a:b].strip()) for a,b in ranges)<=max_width:break
        size-=2
    assert max(ImageFont.truetype(FONT,size).getlength(display[a:b].strip()) for a,b in ranges)<=max_width+40
    bounds=sorted(set([0,duration]+[max(0,min(duration,w[k])) for w in words for k in ['start','end']]))
    events=[]
    for a,b in zip(bounds,bounds[1:]):
        if round(b*100)<=round(a*100):continue
        mid=(a+b)/2
        active=next((w for w in reversed(words) if w['start']<=mid<w['end']),None)
        lines=[]
        for x,y in ranges:
            if active and x<=active['displayStart']<y:
                s=active['displayStart'];e=active['displayEnd']
                line=display[x:s]+'{\\c&H004AD5FF&}'+display[s:e]+'{\\c&H00FFFFFF&}'+display[e:y]
            else:line=display[x:y]
            lines.append(line.strip())
        text='\\N'.join(lines)
        events.append(f'Dialogue: 0,{stamp(a)},{stamp(b)},Caption,,0,0,0,,{text}')
    header=f'''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Noto Sans Telugu,{size},&H00FFFFFF,&H00FFFFFF,&H00101010,&H95000000,0,0,0,0,100,100,0,0,3,2,0,2,{margin},{margin},90,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    Path(target).write_text(header+'\n'.join(events)+'\n',encoding='utf-8')
    return {'verse':verse,'completeShlokaAlwaysVisible':True,'pages':1,'lines':2,'fontSize':size,'events':len(events),'spokenWords':len(words)}
