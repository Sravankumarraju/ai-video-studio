from pathlib import Path
import json,subprocess,shutil,zipfile
R=Path('data/productions/divine-wisdom/mahalakshmi-mala-full-2026-10-30');S=Path('data/productions/divine-wisdom/mahalakshmi-mala-sample-2026-10-30')
V=R/'visual-preview';V.mkdir(exist_ok=True)
def run(a):subprocess.run(a,check=True,capture_output=True)
logo=Path('data/branding/divine-wisdom/youtube-avatar/divine-wisdom-telugu-circle-safe.png')
images=sorted((R/'art').glob('*.png'))
for i,im in enumerate(images):
 out=V/f'{i+1:02}.mp4';frames=161 if i==5 else 160
 if not out.exists():
  vf=f"scale=1920:1080,zoompan=z='1+0.025*on/{frames-1}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d={frames}:s=1920x1080:fps=24,setsar=1,format=yuv420p"
  run(['ffmpeg','-v','error','-nostdin','-n','-i',str(im),'-vf',vf,'-frames:v',str(frames),'-an','-c:v','libx264','-preset','veryfast','-crf','20','-threads','4',str(out)])
 print(json.dumps({'imageMotionRendered':i+1}),flush=True)
(V/'concat.txt').write_text('\n'.join(f"file '{i+1:02}.mp4'" for i in range(6))+'\n',encoding='utf8')
shutil.copyfile(S/'captions.ass',V/'captions.ass')
target=R/'Mahalakshmi-Six-Images-Visual-Preview-1080p.mp4'
if not target.exists():
 graph=f"[0:v]ass=filename='{V.as_posix()}/captions.ass':fontsdir='public/fonts':shaping=complex[bg];[2:v]scale=130:-1[logo];[bg][logo]overlay=W-w-28:24,format=yuv420p[v]"
 run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(V/'concat.txt'),'-i',str(S/'mahalakshmi-female-sample.mp3'),'-i',str(logo),'-filter_complex',graph,'-map','[v]','-map','1:a:0','-af','loudnorm=I=-17:TP=-1.5:LRA=7,apad','-t',str(961/24),'-c:v','libx264','-preset','veryfast','-crf','20','-threads','4','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart',str(target)])
run(['ffmpeg','-v','error','-nostdin','-i',str(target),'-f','null','-'])
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(target)]));vs=next(s for s in probe['streams'] if s['codec_type']=='video');assert (vs['width'],vs['height'])==(1920,1080)
run(['ffmpeg','-v','error','-nostdin','-y','-ss','22','-i',str(target),'-frames:v','1',str(V/'review-22.png')])
status={'fullVideoState':'blocked_on_remaining_music','provider':'ElevenLabs','model':'music_v2_5','blockedBatch':'batch-01','httpStatus':400,'providerReason':'copyrighted_material_detected','rejectedRequestResubmitted':False,'otherPaidBatchesSubmitted':False,'imagesCompleted':6,'fullTextPrepared':True,'expectedFullMusicSeconds':1170,'approvedSampleReusedSeconds':40,'visualPreview':str(target),'visualPreviewSeconds':float(probe['format']['duration']),'visualPreviewFullDecodePassed':True,'humanPronunciationReviewPending':True,'published':False}
(R/'PRODUCTION-STATUS.json').write_text(json.dumps(status,indent=2),encoding='utf8')
with zipfile.ZipFile(R/'Mahalakshmi-Six-Original-Images.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in images:z.write(p,p.name)
 z.write(R/'image-prompts.json','image-prompts.json')
print(json.dumps(status),flush=True)
