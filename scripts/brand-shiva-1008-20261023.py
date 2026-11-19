from pathlib import Path
import json, subprocess, importlib.util, shutil
from PIL import Image
spec=importlib.util.spec_from_file_location('shiva','scripts/render-shiva-108-20261023.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
ROOT=Path('output/om-namah-shivaya-1008-2026-10-23');OUT=ROOT/'branded-v2';OUT.mkdir(exist_ok=True);m.ROOT=OUT
LOGO=Path('data/branding/divine-wisdom/production-presets/suprabhatam-female-chant-approved-2026-10-20/channel-logo-transparent.png')
TOTAL=8072;COUNT=1008
def run(a):subprocess.run(a,check=True)
def save(n,d):(OUT/f'{n}.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
def label(text,x,y,size,start=0,end=16,font='Noto Sans',color='&H00F3F5F7&',fade=False):
 e=m.event(text,x,y,size,start,end,font,color)
 return e if fade else e.replace(r'\fad(500,500)','')
def prepare():
 im=Image.open(LOGO);assert im.mode=='RGBA' and im.getextrema()[3][0]==0 and im.getextrema()[3][1]==255
 shutil.copyfile(LOGO,OUT/'channel-logo-transparent.png')
 for name in ['chant.ass','outro.ass']:
  text=(ROOT/name).read_text(encoding='utf-8-sig')
  if name=='chant.ass':text=text.replace(r'\fad(500,500)','')
  (OUT/name).write_text(text,encoding='utf-8-sig')
 gold='&H009EE0F7&'
 m.ass('brand-main.ass',[label('DIVINE WISDOM TELUGU',82,70,26,color=gold)])
 m.ass('brand-opening.ass',[
  label('DIVINE WISDOM TELUGU',80,74,44,color=gold),
  label('భక్తి మంత్రాలు • ప్రార్థన • ప్రశాంతత',84,146,30,font='Noto Sans Telugu'),
  label('Devotional chants • Prayer • Inner Peace',84,206,26),
  label('Salutations to Lord Shiva',84,560,32,start=0,end=8,fade=True),
  label('A sacred expression of devotion and surrender',84,615,25,start=0,end=8,fade=True),
  label('Namah Shivaya • Sri Rudram • Yajurveda',84,560,26,start=8,end=16,fade=True),
  label('Chant along gently, at your own comfortable pace.',84,615,25,start=8,end=16,fade=True)])
 m.ass('brand-ending.ass',[
  label('DIVINE WISDOM TELUGU',80,74,38,end=8,color=gold),
  label('SUBSCRIBE',84,728,48,end=8,color=gold),
  label('LIKE  •  SHARE  •  COMMENT',84,802,30,end=8),
  label('మీ అభిప్రాయాన్ని కామెంట్‌లో చెప్పండి',84,858,28,end=8,font='Noto Sans Telugu')])
 manifest=['opening-branded.mp4']+['chant-branded.mp4']*503+['ending-branded.mp4']
 assert len(manifest[:-1])*2==COUNT
 (OUT/'video.ffconcat').write_text('ffconcat version 1.0\n'+''.join(f"file '{name}'\n" for name in manifest),encoding='utf8')
 save('production-plan',{'channel':'Divine Wisdom Telugu','repetitions':COUNT,'durationSeconds':TOTAL,'removedSilentIntroSeconds':16,'channelIntroduction':'Overlaid on the first 16 seconds of chanting, without delaying or interrupting the mantra','fullVideoLogo':{'source':str(LOGO.resolve()),'transparent':True,'width':220,'height':220,'x':1672,'y':832},'ending':['Subscribe','Like','Share','Comment'],'audio':'Reuse unchanged chant recording and timing; copy original AAC packets','thumbnail':str((ROOT/'Om-Namah-Shivaya-1008-Thumbnail.jpg').resolve()),'published':False})
def clips():
 for kind,length,base,brand in [('opening',16,'chant.ass','brand-opening.ass'),('chant',16,'chant.ass','brand-main.ass'),('ending',8,'outro.ass','brand-ending.ass')]:
  target=OUT/f'{kind}-branded.mp4'
  if target.exists():continue
  graph=f'[0:v]{m.af(base)},{m.af(brand)}[bg];[1:v]scale=220:220,format=rgba[logo];[bg][logo]overlay=1672:832:format=auto,format=yuv420p[v]'
  run(['ffmpeg','-v','error','-nostdin','-n','-filter_complex_threads','2','-i',str(ROOT/'water-flowers-loop.mp4'),'-loop','1','-framerate','24','-i',str(OUT/'channel-logo-transparent.png'),'-filter_complex',graph,'-map','[v]','-t',str(length),'-an',*m.ENC,'-movflags','+faststart',str(target)])
 print('Channel opening, complete-video transparent logo, and ending CTA rendered',flush=True)
def export():
 source=ROOT/'Om-Namah-Shivaya-1008-No-Silent-Intro-1080p.mp4'
 target=OUT/'Om-Namah-Shivaya-1008-Divine-Wisdom-Telugu-1080p.mp4'
 if not target.exists():
  run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(OUT/'video.ffconcat'),'-i',str(source),'-map','0:v:0','-map','1:a:0','-c','copy','-t',str(TOTAL),'-movflags','+faststart',str(target)])
 p=m.probe(target);v=next(s for s in p['streams'] if s['codec_type']=='video');assert int(v['nb_frames'])==TOTAL*24;assert abs(float(p['format']['duration'])-TOTAL)<.15
 def audiohash(file):return subprocess.check_output(['ffmpeg','-v','error','-nostdin','-i',str(file),'-map','0:a:0','-c','copy','-t','8064','-f','hash','-hash','sha256','-']).decode().strip()
 assert audiohash(source)==audiohash(target),'Chant audio packets changed'
 for name,clip in [('opening',OUT/'opening-branded.mp4'),('middle',OUT/'chant-branded.mp4'),('ending',OUT/'ending-branded.mp4')]:
  run(['ffmpeg','-v','error','-nostdin','-threads','2','-i',str(clip),'-f','null','-'])
  if not (OUT/f'review-{name}.jpg').exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss','3','-i',str(clip),'-frames:v','1','-q:v','2',str(OUT/f'review-{name}.jpg')])
 for start in [0,4000,8065]:run(['ffmpeg','-v','error','-nostdin','-ss',str(start),'-i',str(target),'-t','4','-threads','2','-f','null','-'])
 preview=OUT/'Shiva-1008-Branded-Preview.mp4'
 if not preview.exists():
  (OUT/'preview.ffconcat').write_text("ffconcat version 1.0\nfile 'opening-branded.mp4'\nfile 'chant-branded.mp4'\nfile 'ending-branded.mp4'\n",encoding='utf8')
  # Actual first four chants plus the saved quiet ending, with no additional lead-in.
  run(['ffmpeg','-v','error','-nostdin','-n','-ss','16','-i',str(ROOT.parent/'om-namah-shivaya-108-2026-10-23'/'preview-audio.wav'),'-c:a','aac','-b:a','192k','-threads','2',str(OUT/'preview-audio.m4a')])
  run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(OUT/'preview.ffconcat'),'-i',str(OUT/'preview-audio.m4a'),'-map','0:v:0','-map','1:a:0','-c','copy','-t','40','-movflags','+faststart',str(preview)])
 package=json.loads((ROOT/'youtube-package-no-intro.json').read_text(encoding='utf8'));package.update({'video':target.name,'channel':'Divine Wisdom Telugu','transparentLogoThroughout':True,'openingChannelDetails':True,'closingCTA':['Subscribe','Like','Share','Comment']});package['description']='Divine Wisdom Telugu 🙏\n\n'+package['description']+'\n\nSubscribe to Divine Wisdom Telugu for more devotional chants. Like, share, and comment with your experience.';save('youtube-package',package)
 save('VERIFICATION',{'file':str(target.resolve()),'durationSeconds':float(p['format']['duration']),'repetitions':1008,'resolution':[1920,1080],'transparentLogoAlphaVerified':True,'logoIncludedInEverySourceClip':True,'channelOpeningOverChant':True,'closingSubscribeLikeShareComment':True,'allSourceClipsFullDecodePassed':True,'startMiddleEndPlaybackPassed':True,'chantAudioPacketHashMatchesPreviousVersion':True,'silentIntroRemovedSeconds':16,'humanPronunciationListeningReviewPending':True,'published':False,'bytes':target.stat().st_size})
 print(json.dumps({'ready':str(target.resolve()),'durationSeconds':TOTAL,'repetitions':COUNT}),flush=True)
prepare();clips();export()
