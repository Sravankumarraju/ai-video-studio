from pathlib import Path
from PIL import ImageFont
import json,re,subprocess
ROOT=Path('data/productions/divine-wisdom/mahishasura-mardini-2026-10-25')
OUT=ROOT/'female-full-v3'
FONT='public/fonts/NotoSansTelugu.ttf'
def stamp(t):
 n=round(t*100);return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'
def letters(text):return ''.join(c for c in text if '\u0c00'<=c<='\u0c7f')
def make_ass(target,lines,timestamps,duration,number):
 text='\n'.join(lines);positions=[i for i,c in enumerate(text) if '\u0c00'<=c<='\u0c7f']
 timed=[w for w in timestamps if letters(w['word'])]
 assert ''.join(letters(w['word']) for w in timed)==letters(text),'Returned word sequence differs from source'
 cursor=0;words=[]
 for w in timed:
  count=len(letters(w['word']));words.append({'start':w['start_ms']/1000,'end':w['end_ms']/1000,'a':positions[cursor],'b':positions[cursor+count-1]+1,'text':w['word']});cursor+=count
 size=78
 while max(ImageFont.truetype(FONT,size).getlength(x) for x in lines)>1740:size-=2
 assert size>=52
 head=f'''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Verse,Noto Sans Telugu,{size},&H00FFFFFF,&H00FFFFFF,&H00101010,&H00000000,0,0,0,0,100,100,0,0,1,2,0,2,80,80,70,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
 bounds=sorted(set([0,duration]+[max(0,min(duration,w[k])) for w in words for k in ['start','end']]))
 events=[]
 for a,b in zip(bounds,bounds[1:]):
  if round(b*100)<=round(a*100):continue
  active=next((w for w in words if w['start']<=(a+b)/2<w['end']),None)
  display=text
  if active:display=text[:active['a']]+'{\\c&H004AD5FF&}'+text[active['a']:active['b']]+'{\\c&H00FFFFFF&}'+text[active['b']:]
  display=display.rstrip('॥').rstrip().replace('\n','\\N')+f' {{\\fs36}}॥ {number} ॥'
  events.append(f'Dialogue: 0,{stamp(a)},{stamp(b)},Verse,,0,0,0,,{display}')
 Path(target).write_text(head+'\n'.join(events)+'\n',encoding='utf-8')
 return {'verse':number,'fontSize':size,'words':words,'fullVerseAlwaysVisible':True}
def main():
 p=json.loads((OUT/'full-production-plan.json').read_text(encoding='utf-8'))
 meta=json.loads((ROOT/'chant-female-sample-v1/song-metadata.json').read_text(encoding='utf-8'))
 report=make_ass(OUT/'full-shloka-preview.ass',p['verses'][0]['lines'],meta['words_timestamps'],30,1)
 (OUT/'preview-caption-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 # Existing approved audio is reused without a paid call or time stretching.
 graph=f"[0:v]scale=1920:1080,drawbox=x=30:y=620:w=1860:h=430:color=0x070B20@0.78:t=fill,ass=filename='{OUT.as_posix()}/full-shloka-preview.ass':fontsdir='public/fonts':shaping=complex[bg];[1:v]scale=200:-1[logo];[bg][logo]overlay=W-w-40:30,format=yuv420p[v]"
 subprocess.run(['ffmpeg','-v','error','-nostdin','-y','-loop','1','-i',p['art'],'-i',p['logo'],'-i',p['approvedSample'],'-filter_complex',graph,'-map','[v]','-map','2:a:0','-t','30','-r','24','-c:v','libx264','-threads','2','-filter_complex_threads','1','-preset','veryfast','-crf','23','-c:a','aac','-b:a','192k','-movflags','+faststart',str(OUT/'Full-Shloka-Female-Preview.mp4')],check=True)
 subprocess.run(['ffmpeg','-v','error','-nostdin','-y','-ss','4','-i',str(OUT/'Full-Shloka-Female-Preview.mp4'),'-frames:v','1',str(OUT/'full-shloka-layout.png')],check=True)
 print(json.dumps({'previewCreated':True,'fontSize':report['fontSize'],'fullVerseAlwaysVisible':True,'paidGeneration':False}))
if __name__=='__main__':main()
