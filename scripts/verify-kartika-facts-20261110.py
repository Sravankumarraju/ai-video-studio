from pathlib import Path
import subprocess,json,zipfile
from PIL import Image,ImageOps
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'data/productions/divine-wisdom/kartika-facts-2026-11-10'
checks=[];frames=[]
for kind,expected in [('short',(720,1280)),('long',(1280,720))]:
    p=OUT/f'kartika-{kind}-telugu.mp4'
    d=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]))
    v=next(s for s in d['streams'] if s['codec_type']=='video');a=next(s for s in d['streams'] if s['codec_type']=='audio')
    assert (v['width'],v['height'])==expected
    seconds=float(d['format']['duration']);assert seconds>50 if kind=='short' else seconds>350
    subprocess.run(['ffmpeg','-v','error','-nostdin','-i',str(p),'-f','null','-'],check=True)
    for n,t in enumerate([2,seconds*.4,seconds*.8]):
        f=OUT/f'{kind}-qa-{n}.jpg'
        subprocess.run(['ffmpeg','-v','error','-nostdin','-ss',str(t),'-i',str(p),'-frames:v','1','-y',str(f)],check=True)
        im=Image.open(f);frames.append(ImageOps.contain(im,(480,300)))
    checks.append({'file':p.name,'seconds':seconds,'size':[v['width'],v['height']],'audioCodec':a['codec_name'],'fullDecodePassed':True,'pronunciationReview':'not verified by native listener'})
canvas=Image.new('RGB',(1440,600),'#111111')
for i,im in enumerate(frames):canvas.paste(im,((i%3)*480+(480-im.width)//2,(i//3)*300+(300-im.height)//2))
canvas.save(OUT/'review-contact-sheet.jpg')
(OUT/'verification.json').write_text(json.dumps(checks,indent=2))
names=['kartika-short-telugu.mp4','kartika-long-telugu.mp4','thumbnail.png','mala-modern.png','short-te.txt','long-te.txt','short-brian.mp3','short-brian-bass.mp3','george-hook.mp3','long-google.mp3','long-google-slow.mp3','production-notes.md','chapters.txt','verification.json','review-contact-sheet.jpg']
with zipfile.ZipFile(OUT/'Kartika-Telugu-Video-Package.zip','w',compression=zipfile.ZIP_STORED) as z:
    for n in names:z.write(OUT/n,n)
print(json.dumps(checks),flush=True)
