from pathlib import Path
import sys,json,subprocess,requests,math
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.tmp/kartika-python'))
from gtts import gTTS
OUT=ROOT/'data/productions/divine-wisdom/kartika-facts-2026-11-10'
ART=ROOT/'data/productions/divine-wisdom/karthika-deepam-2026-10-22/artwork'
def run(a): subprocess.run(a,check=True,cwd=ROOT)
def duration(p): return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(p)]))
if sys.argv[-1]=='audio':
    for name,url in json.loads((OUT/'media-urls.json').read_text()).items():
        p=OUT/name
        if not p.exists():
            r=requests.get(url,timeout=90);r.raise_for_status();p.write_bytes(r.content)
    pars=(OUT/'long-te.txt').read_text('utf8').strip().split('\n\n')
    for i,p in enumerate(pars):
        target=OUT/f'google-{i:02}.mp3'
        if not target.exists():gTTS(p,lang='te',slow=False).save(str(target))
        print(f'Audio {i+1}/{len(pars)} ready',flush=True)
    (OUT/'google-concat.txt').write_text('\n'.join(f"file 'google-{i:02}.mp3'" for i in range(len(pars))))
    if not (OUT/'long-google.mp3').exists():run(['ffmpeg','-v','error','-nostdin','-f','concat','-safe','0','-i',str(OUT/'google-concat.txt'),'-c:a','libmp3lame','-y',str(OUT/'long-google.mp3')])
    run(['ffmpeg','-v','error','-nostdin','-i',str(OUT/'long-google.mp3'),'-af','atempo=0.92','-c:a','libmp3lame','-y',str(OUT/'long-google-slow.mp3')])
    sys.exit()
def stamp(t):
    h=int(t//3600);m=int(t%3600//60);s=t%60
    return f'{h}:{m:02}:{s:05.2f}'
images=['01-harihara-deepam.png','02-shiva-bilva.png','05-river-temple-deepotsavam.png','04-karthika-deepalu.png','03-vishnu-tulasi.png']
long_heads=['కార్తీకం శివుడికేనా?','శివుడు • విష్ణువు','దీపం వెనుక అర్థం','మాల అంటే సంకల్పం','ఒకే క్యాలెండర్ కాదు','ఉసిరి చెట్టు • వనభోజనం','నేటి జీవితంలో అర్థం','విశ్వాసం • ఆధారం','ఈ కార్తీకంలో ఒక మంచి పని']
short_heads=['కార్తీకం శివుడికేనా?','తిరుమలలోనూ దీపోత్సవం','మాల అంటే సంకల్పం','వనభోజనం వెనుక సంప్రదాయం','పూజ • నిగ్రహం • పంచుకోవడం','ఒక మంచి అలవాటు మొదలుపెడదామా?']
def render(name,audio,heads,seq,times=None):
    seconds=duration(audio);w,h=(720,1280) if name=='short' else (1280,720)
    if times is None:times=[seconds/len(heads)]*len(heads)
    else:times=[t*seconds/sum(times) for t in times]
    ass='[Script Info]\nScriptType: v4.00+\nPlayResX: '+str(w)+'\nPlayResY: '+str(h)+'\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n'
    ass+=f'Style: Main,Noto Sans Telugu,{66 if name=="short" else 60},&H00FFFFFF,&H00FFFFFF,&H0020140A,&H90000000,1,0,0,0,100,100,0,0,1,3,1,2,40,40,{230 if name=="short" else 70},1\n'
    ass+='Style: Brand,Noto Sans,18,&H008BD9FF,&H008BD9FF,&H0020140A,&H90000000,0,0,0,0,100,100,0,0,1,1,0,8,20,20,30,1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n'
    t=0;pieces=[]
    for i,(head,sec) in enumerate(zip(heads,times)):
        ass+=f'Dialogue: 1,{stamp(t)},{stamp(t+sec)},Main,,0,0,0,,{head}\n';t+=sec
        img=(OUT/'thumbnail.png') if name=='long' and i==0 else ART/images[seq[i]];target=OUT/f'{name}-scene-{i:02}.mp4'
        if (OUT/'mala-modern.png').exists() and ((name=='short' and i==2) or (name=='long' and i==3)):img=OUT/'mala-modern.png'
        if not target.exists() or target.stat().st_mtime<img.stat().st_mtime:
            vf=f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},zoompan=z='1+0.00016*on':d=1:s={w}x{h}:fps=24,drawbox=x=0:y=ih*0.68:w=iw:h=ih*0.32:color=black@0.65:t=fill,format=yuv420p"
            run(['ffmpeg','-v','error','-nostdin','-loop','1','-i',str(img),'-vf',vf,'-t',str(sec),'-an','-c:v','libx264','-threads','2','-preset','ultrafast','-crf','22','-y',str(target)])
        pieces.append(f"file '{target.name}'")
    ass+=f'Dialogue: 2,0:00:00.00,{stamp(seconds)},Brand,,0,0,0,,DIVINE WISDOM TELUGU | ILLUSTRATIVE VISUALS\n'
    (OUT/f'{name}.ass').write_text(ass,encoding='utf8');(OUT/f'{name}-concat.txt').write_text('\n'.join(pieces))
    assfile=(OUT/f'{name}.ass').relative_to(ROOT).as_posix()
    dest=OUT/f'kartika-{name}-telugu.mp4'
    run(['ffmpeg','-v','error','-nostdin','-f','concat','-safe','0','-i',str(OUT/f'{name}-concat.txt'),'-i',str(audio),'-vf',f"ass=filename='{assfile}':fontsdir='public/fonts':shaping=complex",'-map','0:v:0','-map','1:a:0','-t',str(seconds),'-c:v','libx264','-threads','2','-preset','veryfast','-crf','21','-c:a','aac','-b:a','160k','-movflags','+faststart','-y',str(dest)])
    return {'file':dest.name,'seconds':duration(dest),'width':w,'height':h,'style':'animated still artwork with Telugu chapter cards','published':False}
results=[render('short',OUT/'short-brian.mp3',short_heads,[0,4,1,3,2,0]),render('long',OUT/'long-google-slow.mp3',long_heads,[0,1,2,1,4,3,0,2,0],[duration(OUT/f'google-{i:02}.mp3') for i in range(9)])]
(OUT/'verification.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(results),flush=True)
