from pathlib import Path
import json,subprocess,hashlib
from PIL import Image,ImageDraw,ImageFont
ROOT=Path('output/sri-venkateswara-female-chant-v3-2026-10-20')
SOURCE=ROOT/'Sri-Venkateswara-Female-Chant-V3-Telugu-Sample-1080p.mp4'
OUT=ROOT/'Sri-Venkateswara-Female-Chant-With-Channel-Ending-1080p.mp4'
def run(a):subprocess.run(a,check=True)
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]))
im=Image.open(ROOT/'lyric-background.jpg').convert('RGB');d=ImageDraw.Draw(im)
d.rectangle((0,160,1020,1080),fill=(43,57,24))
en=lambda n:ImageFont.truetype('public/fonts/NotoSans.ttf',n)
te=lambda n:ImageFont.truetype('public/fonts/NotoSansTelugu.ttf',n)
gold='#f5df9b';white='#f3f5e9'
d.text((75,210),'శ్రీ వేంకటేశాయ నమః',font=te(48),fill=gold)
d.text((75,345),'Sri Venkateswara',font=en(65),fill=white)
d.text((75,433),'Suprabhatham',font=en(65),fill=white)
d.line((76,553,965,553),fill='#a59c58',width=2)
d.rounded_rectangle((76,610,965,700),radius=15,fill='#a53e27')
d.text((520,651),'SUBSCRIBE  •  LIKE',font=en(43),fill='#ffffff',anchor='mm')
d.text((76,750),'SHARE  •  COMMENT',font=en(43),fill=gold)
d.text((76,864),'సబ్‌స్క్రైబ్ చేయండి',font=te(40),fill=white)
d.text((76,937),'లైక్ • షేర్ • కామెంట్ చేయండి',font=te(36),fill=white)
im.save(ROOT/'channel-ending-card.jpg',quality=96)
closing=ROOT/'channel-ending-6s.mp4'
if not closing.exists():
 run(['ffmpeg','-v','error','-nostdin','-n','-loop','1','-i',str(ROOT/'channel-ending-card.jpg'),'-ss','95','-i','output/sri-venkateswara-instrumental-2026-10-20/instrumental.mp3','-t','6','-vf','fps=24,format=yuv420p','-af','volume=0.10,afade=t=in:d=0.4,afade=t=out:st=4.5:d=1.5','-ar','48000','-ac','2','-c:v','libx264','-preset','veryfast','-crf','19','-threads','4','-c:a','aac','-b:a','192k',str(closing)])
# Re-encode only the ending; retain the approved prayer's encoded video packets.
(ROOT/'approved-ending.ffconcat').write_text(f"file '{SOURCE.name}'\nfile '{closing.name}'\n",encoding='utf8')
if not OUT.exists():
 run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'approved-ending.ffconcat'),'-c','copy','-movflags','+faststart',str(OUT)])
run(['ffmpeg','-v','error','-nostdin','-i',str(OUT),'-f','null','-'])
p=probe(OUT);v=next(s for s in p['streams'] if s['codec_type']=='video')
assert(v['width'],v['height'])==(1920,1080)
seconds=float(p['format']['duration']);assert 28<=seconds<28.5
def hashes(p,limit=None):
 args=['ffprobe','-v','error','-select_streams','v:0','-show_packets','-show_data_hash','sha256','-show_entries','packet=data_hash','-of','json',str(p)]
 return [x['data_hash'] for x in json.loads(subprocess.check_output(args))['packets']][:limit]
original=hashes(SOURCE);assert original==hashes(OUT,len(original)),'Approved video packets changed'
record={'channelName':'Sri Venkateswara Suprabhatham','durationSeconds':seconds,'endingSeconds':6,'cta':['Subscribe','Like','Share','Comment'],'teluguCtaIncluded':True,'approvedPrayerVideoPacketsPreserved':True,'newPaidGenerationCalls':0,'fullDecodePassed':True,'source':SOURCE.name,'output':OUT.name}
(ROOT/'channel-ending-verification.json').write_text(json.dumps(record,indent=2),encoding='utf8')
print(json.dumps({'video':str(OUT.resolve()),'durationSeconds':seconds,'approvedPrayerPreserved':True}))
