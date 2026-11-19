from pathlib import Path
import json, subprocess, re
ROOT=Path('output/om-namah-shivaya-1008-2026-10-23')
CUT=16
def run(args):subprocess.run(args,check=True)
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]))
source=ROOT/'Om-Namah-Shivaya-1008-1080p.mp4'
target=ROOT/'Om-Namah-Shivaya-1008-No-Silent-Intro-1080p.mp4'
if not target.exists():
 run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(CUT),'-i',str(source),'-map','0:v:0','-map','0:a:0','-c','copy','-avoid_negative_ts','make_zero','-movflags','+faststart',str(target)])
p=probe(target);v=next(s for s in p['streams'] if s['codec_type']=='video');a=next(s for s in p['streams'] if s['codec_type']=='audio')
assert abs(float(p['format']['duration'])-8072)<.15
assert int(v['nb_frames'])==8072*24
assert (v['width'],v['height'])==(1920,1080)
for start,length in [(0,30),(8067,5)]:run(['ffmpeg','-v','error','-nostdin','-ss',str(start),'-i',str(target),'-t',str(length),'-threads','2','-f','null','-'])
# Shift every sidecar subtitle while preserving all 1008 entries.
def shift(match):
 h,m,s,ms=map(int,match.groups());n=max(0,((h*60+m)*60+s)*1000+ms-CUT*1000)
 return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02},{n%1000:03}'
subs=(ROOT/'Om-Namah-Shivaya-1008.srt').read_text(encoding='utf8')
shifted=re.sub(r'(\d{2}):(\d{2}):(\d{2}),(\d{3})',shift,subs)
assert shifted.count('Om Namah Shivaya')==1008
(ROOT/'Om-Namah-Shivaya-1008-No-Intro.srt').write_text(shifted,encoding='utf8')
preview=ROOT/'Shiva-1008-No-Intro-Preview.mp4'
if not preview.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(target),'-t','32','-map','0:v:0','-map','0:a:0','-c','copy','-movflags','+faststart',str(preview)])
package=json.loads((ROOT/'youtube-package.json').read_text(encoding='utf8'))
package['durationSeconds']=8072
package['video']=target.name
package['description']=package['description'].replace("The opening explains the mantra's meaning: salutations to Shiva.","The mantra means salutations to Shiva.").replace('00:00 Meaning and sacred context\n00:16 Om Namah Shivaya — 1008 chants\n01:07:28 Second half — continue chanting\n02:14:40 Quiet closing','00:00 Om Namah Shivaya — 1008 chants\n01:07:12 Second half — continue chanting\n02:14:24 Quiet closing')
(ROOT/'youtube-package-no-intro.json').write_text(json.dumps(package,ensure_ascii=False,indent=2),encoding='utf8')
report={'file':str(target.resolve()),'removedOpeningSeconds':CUT,'durationSeconds':float(p['format']['duration']),'repetitions':1008,'frameCount':int(v['nb_frames']),'firstAndLastPlaybackDecodePassed':True,'audioAndVideoStreamCopiedWithoutReencoding':True,'allChantCyclesPreserved':True,'subtitleEntries':1008,'sourceFullAudioDecodePreviouslyPassed':True,'humanPronunciationListeningReviewPending':True,'published':False}
(ROOT/'VERIFICATION-no-intro.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps(report),flush=True)
