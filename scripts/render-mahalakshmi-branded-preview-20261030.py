from pathlib import Path
import json,math,subprocess
R=Path('data/productions/divine-wisdom/mahalakshmi-mala-full-2026-10-30');S=Path('data/productions/divine-wisdom/mahalakshmi-mala-sample-2026-10-30');V=R/'branded-preview';V.mkdir(exist_ok=True)
p=json.loads((R/'full-production-plan.json').read_text(encoding='utf8'))
def run(a):return subprocess.run(a,check=True,capture_output=True)
def dur(f):return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(f)]))
def stamp(t):
 n=round(t*100);return f'{n//360000}:{n//6000%60:02}:{n%6000/100:05.2f}'
header='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Card,Noto Sans Telugu,60,&H00C3E8FF,&H00FFFFFF,&H00101010,&H80000000,0,0,0,0,100,100,0,0,1,2,0,5,80,80,30,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
lengths={n:math.ceil(dur(R/f'{n}.mp3')*24)/24 for n in ['welcome','closing']}
for name in ['welcome','closing']:
 d=lengths[name]
 if name=='welcome':
  rows=[(535,72,'డివైన్ విజ్డమ్ తెలుగు ఛానల్‌కు స్వాగతం'),(650,62,'శ్రీ మహాలక్ష్మి స్తోత్ర మాలిక'),(755,48,'మహాలక్ష్మ్యష్టకం • కనకధారా • అష్టలక్ష్మీ స్తోత్రం'),(855,42,'భక్తితో ఆలకించండి • తెలుగు శ్లోకాలను అనుసరించండి')]
 else:
  rows=[(535,67,'శ్రీ మహాలక్ష్మి అనుగ్రహం మీ అందరికీ కలగాలి'),(655,62,'సబ్‌స్క్రైబ్ చేయండి • లైక్ చేయండి'),(770,56,'షేర్ చేయండి • కామెంట్ చేయండి'),(875,43,'కామెంట్‌లో: ఓం శ్రీ మహాలక్ష్మ్యై నమః')]
 events=[f'Dialogue: 0,0:00:00.00,{stamp(d)},Card,,0,0,0,,{{\\pos(960,{y})\\fs{fs}}}{txt}' for y,fs,txt in rows]
 (V/f'{name}.ass').write_text(header+'\n'.join(events)+'\n',encoding='utf8')
 out=V/f'{name}.mp4'
 if not out.exists():
  image=R/'art'/('01-mahalakshmi-lotus.png' if name=='welcome' else '06-deepa-blessing.png')
  graph=f"[0:v]scale=1920:1080,setsar=1,drawbox=x=0:y=0:w=iw:h=ih:color=0x080d20@0.76:t=fill[base];[1:v]split=2[mark][corner];[mark]scale=360:-1[big];[corner]scale=200:-1[small];[base][big]overlay=(W-w)/2:90[mid];[mid][small]overlay=W-w-32:24,ass=filename='{V.as_posix()}/{name}.ass':fontsdir='public/fonts':shaping=complex,format=yuv420p[v]"
  run(['ffmpeg','-v','error','-nostdin','-n','-loop','1','-framerate','24','-i',str(image),'-i',str(R/'channel-logo-transparent.png'),'-i',str(R/f'{name}.mp3'),'-filter_complex_threads','2','-filter_complex',graph,'-map','[v]','-map','2:a:0','-af',f'loudnorm=I=-17:TP=-1.5:LRA=7,apad,atrim=duration={d}','-t',str(d),'-c:v','libx264','-preset','veryfast','-crf','20','-threads','4','-c:a','aac','-b:a','192k','-ar','48000','-ac','2',str(out)])
 print(json.dumps({'rendered':name,'seconds':d}),flush=True)
ass=(S/'captions.ass').read_text(encoding='utf8');(V/'song.ass').write_text(ass,encoding='utf8')
if not (V/'song.mp4').exists():
 graph=f"[0:v]ass=filename='{V.as_posix()}/song.ass':fontsdir='public/fonts':shaping=complex[base];[2:v]scale=200:-1[logo];[base][logo]overlay=W-w-32:24,format=yuv420p[v]"
 run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(R/'visual-preview/concat.txt'),'-i',str(S/'mahalakshmi-female-sample.mp3'),'-i',str(R/'channel-logo-transparent.png'),'-filter_complex_threads','2','-filter_complex',graph,'-map','[v]','-map','1:a:0','-af','loudnorm=I=-17:TP=-1.5:LRA=7,apad','-t',str(961/24),'-c:v','libx264','-preset','veryfast','-crf','20','-threads','4','-c:a','aac','-b:a','192k','-ar','48000','-ac','2',str(V/'song.mp4')])
print(json.dumps({'rendered':'song','seconds':961/24}),flush=True)
(V/'concat.txt').write_text("file 'welcome.mp4'\nfile 'song.mp4'\nfile 'closing.mp4'\n",encoding='utf8')
target=R/'Mahalakshmi-Branded-Preview-1080p.mp4'
if not target.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(V/'concat.txt'),'-c','copy','-movflags','+faststart',str(target)])
run(['ffmpeg','-v','error','-xerror','-nostdin','-i',str(target),'-f','null','-'])
total=dur(target);assert abs(total-(sum(lengths.values())+961/24))<.2
for label,t in [('welcome',2),('song',lengths['welcome']+12),('closing',total-4)]:run(['ffmpeg','-v','error','-nostdin','-y','-ss',str(t),'-i',str(target),'-frames:v','1',str(V/f'review-{label}.jpg')])
status=json.loads((R/'PRODUCTION-STATUS.json').read_text(encoding='utf8'));status.update({'brandedPreview':str(target),'brandedPreviewSeconds':total,'brandedPreviewFullDecodePassed':True,'spokenWelcomeAndClosingCompleted':True,'fullTransparentLogoThroughout':True,'completeShlokaCaptionsBelow':True,'closingActions':['subscribe','like','share','comment'],'fullVideoState':'blocked_on_elevenlabs_music_review'})
(R/'PRODUCTION-STATUS.json').write_text(json.dumps(status,indent=2),encoding='utf8')
print(json.dumps({'video':str(target),'seconds':total,'verified':True}),flush=True)
