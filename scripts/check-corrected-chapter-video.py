import json, pathlib, subprocess, sys
root=pathlib.Path('data/productions/divine-wisdom/gita-chapter-1/audio-corrected-v5')
kind=sys.argv[1] if len(sys.argv)>1 else 'draft'
file=root/f'gita-chapter-1-{kind}.mp4'
info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(file)]))
video=next(s for s in info['streams'] if s['codec_type']=='video')
audio=next(s for s in info['streams'] if s['codec_type']=='audio')
state=json.loads((root/'state.json').read_text(encoding='utf8'))
assert video['codec_name']=='h264' and audio['codec_name']=='aac'
assert abs(float(info['format']['duration'])-state['seconds'])<0.2
assert (video['width'],video['height'])==((640,360) if kind=='draft' else (1920,1080))
with (root/f'decode-{kind}.log').open('w',encoding='utf8') as log:
 subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(file),'-f','null','-'],check=True,stderr=log)
for label,sec in [('name',12),('pronunciation',922),('ending',float(info['format']['duration'])-55)]:
 subprocess.run(['ffmpeg','-v','error','-y','-ss',str(sec),'-i',str(file),'-frames:v','1',str(root/f'{kind}-review-{label}.jpg')],check=True)
result={'completeDecodePassed':True,'codec':'H264/AAC','width':video['width'],'height':video['height'],'seconds':float(info['format']['duration']),'humanPronunciationReview':'Owner review clip provided; not independently verified by listening','jobId':state['renderJobs'][kind]}
(root/f'verification-{kind}.json').write_text(json.dumps(result,indent=2),encoding='utf8')
if kind=='full':
 (root/'FINAL_DELIVERY.md').write_text('# Corrected Chapter 1\n\nFull 1080p 16:9 MP4: `gita-chapter-1-full.mp4`, approximately 37:26. Whole-file decoding passed. All 47 meanings and unaffected explanation audio are preserved; original edition and individual episodes are unchanged.\n\nNew spoken opening: Arjuna Vishada Yoga and why Chapter 1 has that name. The reported `చూడాలని కోరుతున్నాడు` passage was regenerated. The ending introduces Chapter 2, Sankhya Yoga, and no longer promotes individual Shloka 11. Channel closing invitations remain.\n\nSeparate local full-chapter series and persistent prompt saved. No YouTube changes. Human review of the new voice pronunciation remains available in `pronunciation-finished.wav`.\n',encoding='utf8')
print(json.dumps(result))
