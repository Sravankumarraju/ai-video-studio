"""Version two: show the existing thumbnail at time zero with the recorded channel welcome."""
from pathlib import Path
import importlib.util,json,subprocess,math,shutil,sys
spec=importlib.util.spec_from_file_location('ayyappa_render','scripts/render-ayyappa-deeksha-20261022.py')
v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
ROOT=v.ROOT
OUT=ROOT/'Ayyappa-Deeksha-41-Days-Telugu-1080p-v2.mp4'
def main():
 t=v.load('timeline');s=t['scenes'][0];assert s['id']=='welcome';seconds=s['seconds'];n=round(seconds*24)
 alignment=v.load('voice-00-alignment');text=''.join(alignment['characters']);phrase='డివైన్ విజ్డమ్ తెలుగు ఛానల్‌కు స్వాగతం.';i=text.index(phrase)
 start=alignment['character_start_times_seconds'][i];end=alignment['character_end_times_seconds'][i+len(phrase)-1]
 assert 2<start<4 and 5<end<7
 ass=v.header()+v.event(start-.15,end+.6,'Call',r'{\an8\pos(960,938)\fs45}డివైన్ విజ్డమ్ తెలుగు ఛానల్‌కు స్వాగతం')+'\n'+v.event(start-.15,end+.6,'Brand',r'{\an8\pos(960,1020)\fs29\c&H00FFFFFF&}WELCOME TO DIVINE WISDOM TELUGU')+'\n'
 (ROOT/'opening-welcome-v2.ass').write_text(ass,encoding='utf8')
 intro=ROOT/'video-pieces'/'00-thumbnail-welcome-v2.mp4'
 if not intro.exists():
  vf=f"[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='1.01+0.035*on/{n}':x='(iw-iw/zoom)*0.5':y='(ih-ih/zoom)*0.4':d={n}:s=1920x1080:fps=24,setsar=1,drawbox=x=0:y=0:w=iw:h=145:color=black@0.58:t=fill,drawbox=x=0:y=805:w=iw:h=275:color=black@0.66:t=fill,ass=filename='{ROOT.as_posix()}/captions-00.ass':fontsdir='public/fonts':shaping=complex[base];[1:v]scale=100:100[logo];[base][logo]overlay=30:22[branded];[2:v]scale=1920:1080,setsar=1,format=yuva420p,fade=t=out:st=6.5:d=0.5:alpha=1[thumb];[branded][thumb]overlay=0:0:enable='lt(t,7)',drawbox=x=0:y=920:w=iw:h=160:color=0x071534@0.96:t=fill:enable='between(t,{start-.15},{end+.6})',ass=filename='{ROOT.as_posix()}/opening-welcome-v2.ass':fontsdir='public/fonts':shaping=complex,fade=t=out:st={seconds-.25}:d=0.25,format=yuv420p[v]"
  v.run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT/'art/01-devotion.png'),'-i',str(ROOT/'channel-logo.png'),'-loop','1','-framerate','24','-i',str(ROOT/'thumbnail-generated.png'),'-filter_complex_threads','2','-filter_complex',vf,'-map','[v]','-frames:v',str(n),'-an','-c:v','libx264','-threads','4','-preset','veryfast','-crf','19','-video_track_timescale','24000',str(intro)])
 assert abs(float(v.probe(intro)['format']['duration'])-seconds)<.06
 pieces=["file 'video-pieces/00-thumbnail-welcome-v2.mp4'"]+[f"file 'video-pieces/{s['index']:02}.mp4'" for s in t['scenes'][1:]]
 (ROOT/'video-concat-v2.txt').write_text('\n'.join(pieces)+'\n',encoding='utf8')
 if not OUT.exists():v.run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'video-concat-v2.txt'),'-i',str(v.OUT),'-map','0:v:0','-map','1:a:0','-c','copy','-t',str(t['seconds']),'-movflags','+faststart','-metadata','title=అయ్యప్ప దీక్ష ఎందుకు? — 41 రోజుల ఆచారం, అర్థం',str(OUT)])
 p=v.probe(OUT);video=next(s for s in p['streams'] if s['codec_type']=='video');audio=next(s for s in p['streams'] if s['codec_type']=='audio');duration=float(p['format']['duration'])
 assert (video['width'],video['height'],video['codec_name'],audio['codec_name'])==(1920,1080,'h264','aac')
 assert abs(duration-t['seconds'])<.1
 v.run(['ffmpeg','-v','error','-xerror','-nostdin','-i',str(OUT),'-f','null','-'])
 for when in [0,4,8,508]:
  dest=ROOT/f'v2-review-{when:03}.jpg'
  if not dest.exists():v.run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(when),'-i',str(OUT),'-frames:v','1','-q:v','2',str(dest)])
 if not (ROOT/'VERIFICATION-v1.json').exists():shutil.copyfile(ROOT/'VERIFICATION.json',ROOT/'VERIFICATION-v1.json')
 verification=v.load('VERIFICATION-v1')
 verification.update({'file':str(OUT.resolve()),'version':2,'seconds':duration,'fullDecodePassed':True,'thumbnailOpeningSeconds':7,'thumbnailAtTimeZero':True,'welcomeAudioRange':[start,end],'visibleWelcomeMessage':True,'audioCopiedFromOriginal':True,'captionAndChapterTimingUnchanged':True,'openingVisualReviewPassed':False,'bytes':OUT.stat().st_size})
 v.save('VERIFICATION-v2',verification)
 v.save('opening-change-v2',{'file':OUT.name,'previousFile':v.OUT.name,'thumbnail':'thumbnail-generated.png','thumbnailRange':[0,7],'welcomeTextTelugu':phrase,'welcomeTextEnglish':'WELCOME TO DIVINE WISDOM TELUGU','welcomeAudioRange':[start,end],'durationSeconds':duration,'audioChanged':False,'chaptersChanged':False,'captionsChanged':False,'published':False})
 print(json.dumps({'file':str(OUT),'seconds':duration,'thumbnailAtStart':True,'spokenAndVisibleWelcome':True,'fullDecodePassed':True}),flush=True)
if __name__=='__main__':main()
