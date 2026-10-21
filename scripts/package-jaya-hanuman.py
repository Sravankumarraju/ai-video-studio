"""Create a channel thumbnail and upload copy without publishing."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, subprocess, importlib.util

ROOT=Path('data/productions/divine-wisdom/jaya-hanuman-2026-10-15')
art=Image.open(ROOT/'hanuman-temple-hero-v1.png').convert('RGB').resize((1920,1080))
shade=Image.new('RGBA',art.size)
d=ImageDraw.Draw(shade)
for x in range(1920):
    a=int(230*max(0,min(1,(x-650)/650)))
    d.line((x,0,x,1080),fill=(7,13,24,a))
art=Image.alpha_composite(art.convert('RGBA'),shade)
background=art.copy()
d=ImageDraw.Draw(art)
te='public/fonts/NotoSansTelugu.ttf'
en='public/fonts/NotoSans.ttf'
def txt(pos,text,font,size,color):
    d.text(pos,text,font=ImageFont.truetype(font,size),fill=color,stroke_width=1,stroke_fill='#090d16')
txt((1090,215),'జయ',te,180,'#ffe09a')
txt((1010,440),'హనుమాన్',te,150,'#ffe09a')
d.rounded_rectangle((1080,735,1810,835),radius=20,fill='#9b341b')
txt((1130,737),'తెలుగు భక్తి గీతం',te,55,'white')
txt((1100,928),'DIVINE WISDOM TELUGU',en,37,'#ffe09a')
logo=Image.open('data/branding/divine-wisdom/youtube-avatar/divine-wisdom-telugu-circle-safe.png').convert('RGBA').resize((132,132))
art.alpha_composite(logo,(55,45))
art.convert('RGB').resize((1280,720),Image.Resampling.LANCZOS).save(ROOT/'youtube-thumbnail.jpg',quality=94)
# Pillow on this host lacks HarfBuzz; libass provides native Telugu shaping.
background.convert('RGB').save(ROOT/'thumbnail-background.png')
spec=importlib.util.spec_from_file_location('render_header','scripts/render-shiva-song.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
events=[
 r'Dialogue: 1,0:00:00.00,0:00:02.00,Title,,0,0,0,,{\an5\pos(1430,330)\fs250}జయ',
 r'Dialogue: 1,0:00:00.00,0:00:02.00,Title,,0,0,0,,{\an5\pos(1430,550)\fs205}హనుమాన్',
 r'Dialogue: 1,0:00:00.00,0:00:02.00,Caption,,0,0,0,,{\an5\pos(1440,790)\fs72}తెలుగు భక్తి గీతం',
 r'Dialogue: 1,0:00:00.00,0:00:02.00,Small,,0,0,0,,{\an5\pos(1450,960)\fnNoto Sans\fs38}DIVINE WISDOM TELUGU',
]
(ROOT/'thumbnail.ass').write_text(module.HEADER+'\n'.join(events)+'\n',encoding='utf8')
graph=f"[0:v]ass=filename='{ROOT.as_posix()}/thumbnail.ass':fontsdir='public/fonts':shaping=complex[art];[1:v]scale=132:132[logo];[art][logo]overlay=55:45,scale=1280:720[v]"
subprocess.run(['ffmpeg','-v','error','-y','-i',str(ROOT/'thumbnail-background.png'),'-i','data/branding/divine-wisdom/youtube-avatar/divine-wisdom-telugu-circle-safe.png','-filter_complex',graph,'-map','[v]','-frames:v','1','-q:v','2',str(ROOT/'youtube-thumbnail.jpg')],check=True)
title='జయ హనుమాన్ | ధైర్యం • భక్తి • సేవ | Telugu Hanuman Devotional Song | Divine Wisdom Telugu'
description='''Divine Wisdom Telugu ఛానల్‌కు స్వాగతం!

హనుమంతుని ధైర్యం, వినయం, భక్తి, సేవా గుణాలను స్మరించుకుంటూ “జయ హనుమాన్” తెలుగు భక్తి గీతం వినండి.

ఈ గీతం నచ్చితే సబ్‌స్క్రైబ్ చేయండి, లైక్ చేయండి, షేర్ చేయండి. మీ అభిప్రాయాన్ని కామెంట్ చేయండి.

00:00 ఛానల్ స్వాగతం
00:09 ఆరంభ ప్రార్థన
00:26 పల్లవి
00:55 చరణం 1
01:23 పల్లవి
01:52 చరణం 2
02:20 చివరి పల్లవి
02:36 ప్రశాంత ముగింపు
02:53 సబ్‌స్క్రైబ్ · లైక్ · షేర్

Audio: supplied recording, preserved unchanged. AI-assisted devotional illustrations reused from this channel project; video editing and Telugu captions prepared with AI assistance.

#జయహనుమాన్ #Hanuman #TeluguDevotional #DivineWisdomTelugu
'''
(ROOT/'youtube-title.txt').write_text(title+'\n',encoding='utf8')
(ROOT/'youtube-description.txt').write_text(description,encoding='utf8')
(ROOT/'youtube-tags.txt').write_text('Jaya Hanuman, Telugu Hanuman song, Hanuman devotional song, Anjaneya, Telugu bhakti songs, Divine Wisdom Telugu, జయ హనుమాన్, ఆంజనేయ స్వామి\n',encoding='utf8')
print(json.dumps({'thumbnail':'youtube-thumbnail.jpg','uploadTextPrepared':True,'uploaded':False}))
