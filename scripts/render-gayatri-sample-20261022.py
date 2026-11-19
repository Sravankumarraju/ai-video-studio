from pathlib import Path
import json,subprocess

ROOT=Path('output/gayatri-mantra-108-original-2026-10-22')
def run(args):subprocess.run(args,check=True)
def probe(path):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(path)]))
def at(t):
 n=round(t*100);return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'

duration=float(probe(ROOT/'original-four-cycles.mp3')['format']['duration'])
meta=json.loads((ROOT/'song-metadata.json').read_text(encoding='utf8'))
words=meta['words_timestamps']
expected='ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं भर्गो देवस्य धीमहि धियो यो नः प्रचोदयात्'.split()
assert [w['word'] for w in words]==expected*4,'Provider transcript text mismatch'
header='''[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Noto Sans Telugu,64,&H00F4F7FF,&H000000FF,&H00200B17,&H00000000,0,0,0,0,100,100,0,0,1,1,0,7,0,0,0,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
def event(text,x,y,size,color='&H00F4F7FF&',font='Noto Sans Telugu',start=0,end=duration):
 return f'Dialogue: 1,{at(start)},{at(end)},Default,,0,0,0,,{{\\an7\\pos({x},{y})\\fs{size}\\fn{font}\\c{color}}}{text}'
events=[event('గాయత్రీ మంత్రం',88,106,84,'&H009BDBF9&'),event('GAYATRI MANTRA',92,244,38,'&H00C5D8EA&','Noto Sans'),event('ఓం భూర్భువః స్వః',92,390,65),event('తత్సవితుర్వరేణ్యం',92,496,65),event('భర్గో దేవస్య ధీమహి',92,602,65),event('ధియో యో నః ప్రచోదయాత్',92,708,61),event('108 REPETITIONS  |  VOICE & STYLE SAMPLE',94,887,25,'&H009BDBF9&','Noto Sans'),event('DIVINE WISDOM TELUGU',94,984,27,'&H00C5D8EA&','Noto Sans')]
(ROOT/'sample-telugu.ass').write_text(header+'\n'.join(events)+'\n',encoding='utf-8-sig')
ass=str(ROOT/'sample-telugu.ass').replace('\\','/')
vf=f"scale=1920:1080,setsar=1,ass=filename='{ass}':fontsdir='public/fonts':shaping=complex,format=yuv420p"
out=ROOT/'Gayatri-Mantra-Original-Sample-1080p.mp4'
if not out.exists():
 run(['ffmpeg','-v','error','-nostdin','-n','-loop','1','-framerate','24','-i',str(ROOT/'meditation-sunrise.png'),'-i',str(ROOT/'original-four-cycles.mp3'),'-vf',vf,'-af','afade=t=out:st=55.2:d=0.84','-t',str(duration),'-c:v','libx264','-preset','veryfast','-tune','stillimage','-crf','19','-threads','4','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart',str(out)])
preview=ROOT/'sample-preview.jpg'
if not preview.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss','4','-i',str(out),'-frames:v','1','-q:v','2',str(preview)])
run(['ffmpeg','-v','error','-nostdin','-i',str(out),'-f','null','-'])
p=probe(out);video=next(s for s in p['streams'] if s['codec_type']=='video');audio=next(s for s in p['streams'] if s['codec_type']=='audio')
assert (video['width'],video['height'])==(1920,1080)
assert abs(float(p['format']['duration'])-duration)<.2
report={'file':str(out.resolve()),'durationSeconds':float(p['format']['duration']),'width':1920,'height':1080,'videoCodec':video['codec_name'],'audioCodec':audio['codec_name'],'fullDecodePassed':True,'sourceTextMatchesProviderTranscript':True,'plannedSampleRepetitions':4,'sampleOnly':True,'full108VersionCreated':False,'teluguShaping':'libass complex / HarfBuzz / Noto Sans Telugu','originalGeneratedAudioAndVisual':True,'humanListeningReviewPending':True,'providerTimestampIssues':[{**w,'issue':'Zero-duration timestamp; not used for caption highlighting or cycle boundaries'} for w in words if w['end_ms']<=w['start_ms']],'note':'Provider transcript is not an independent pronunciation check. Static lyrics used. Sample generated at user request; no full export or upload.'}
(ROOT/'sample-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(report,ensure_ascii=True))
