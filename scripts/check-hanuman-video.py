"""Check encoding and continuity; this never transcribes the licensed prayer."""
from pathlib import Path
import json, subprocess, wave, array, math, sys, statistics
root=Path('data/productions/divine-wisdom/hanuman-chalisa')
kind=sys.argv[1] if len(sys.argv)>1 else 'full'
file=root/f'hanuman-chalisa-{kind}.mp4'
info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(file)]))
video=next(s for s in info['streams'] if s['codec_type']=='video')
audio=next(s for s in info['streams'] if s['codec_type']=='audio')
assert video['codec_name']=='h264' and audio['codec_name']=='aac'
assert (video['width'],video['height'])==((1920,1080) if kind=='full' else (640,360))
assert abs(float(info['format']['duration'])-813)<0.15
subprocess.run(['ffmpeg','-v','error','-i',str(file),'-f','null','-'],check=True)
decoded=root/f'check-{kind}-audio.wav'
subprocess.run(['ffmpeg','-v','error','-y','-i',str(file),'-vn','-ac','2','-ar','48000','-c:a','pcm_s16le',str(decoded)],check=True)
timeline=json.loads((root/'completed-timeline.json').read_text(encoding='utf8'))
scenes=timeline['document']['scenes']
sung=[s for s in scenes if s.get('audioId')]
offset=0
for s in sung:
    assert abs(s['audioStart']-offset)<1e-6
    assert s['volume']==1 and not s['fadeIn'] and not s['fadeOut'] and not s['overlap']
    offset+=s['duration']
assert offset==805
assert len({s['assetId'] for s in sung if s['mediaType']=='image'})==6
def rms(w,t):
    w.setpos(int(t*48000));values=array.array('h',w.readframes(48000))
    return math.sqrt(sum(x*x for x in values)/len(values))
ratios=[]
with wave.open(str(root/'hanuman-chalisa-source.wav'),'rb') as source, wave.open(str(decoded),'rb') as output:
    for s in sung[1:]:
        t=max(0,s['audioStart']-.5)
        a,b=rms(source,t),rms(output,t)
        if a>100:
            db=20*math.log10(max(b,1)/a);ratios.append(db)
gain=statistics.median(ratios)
# The renderer normalizes the complete mix. Check deviations from that overall
# gain instead of incorrectly treating normalizing the whole track as a cut dip.
deviations=[abs(db-gain) for db in ratios]
assert max(deviations)<1.5, f'Unexpected cut-level variation: {max(deviations)} dB'
result={'kind':kind,'seconds':float(info['format']['duration']),'width':video['width'],'height':video['height'],'decodedEntireFile':True,'contiguousSourceAudioSeconds':805,'originalHanumanImages':6,'visualScenes':len(sung)-1,'levelChecksAtImageCuts':len(ratios),'overallNormalizationGainDb':gain,'maxCutLevelDeviationDb':max(deviations),'paidAudioGeneration':False,'prayerCompletenessListeningVerified':False,'awadhiLanguageListeningVerified':False,'ownerListeningReviewRequired':True,'youtubeUploadAttempted':False}
(root/f'verification-{kind}.json').write_text(json.dumps(result,indent=2),encoding='utf8')
decoded.unlink()
print(json.dumps(result))
