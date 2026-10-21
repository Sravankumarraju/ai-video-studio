"""Complete Govinda Namalu using the channel's existing illustrated-video pattern."""
from pathlib import Path
import importlib.util,json,re,math,subprocess,sys,shutil,difflib
from PIL import Image,ImageFont,ImageDraw

spec=importlib.util.spec_from_file_location('existing_renderer',Path(__file__).with_name('venkateswara-package.py'))
existing=importlib.util.module_from_spec(spec);spec.loader.exec_module(existing)
ROOT=Path('data/productions/divine-wisdom/govinda-namalu-full-2026-10-20')
FPS=24
ART=existing.ART
FONT_PATH=existing.FONT_PATH
FONT=ImageFont.truetype(FONT_PATH,104)
OUTPUT=ROOT/'Sri-Govinda-Namalu-Telugu-1080p.mp4'
def load(n):return json.loads((ROOT/f'{n}.json').read_text(encoding='utf8'))
def save(n,v):(ROOT/f'{n}.json').write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
def run(a):subprocess.run(a,check=True)
def duration(p):return existing.duration(p)
def norm(t):return ''.join(c for c in t if '\u0c00'<=c<='\u0c7f')
def ass_time(t):return existing.ass_time(t)
def srt_time(t):return existing.srt_time(t)
def frame(t):return math.ceil(t*FPS)/FPS

def audit():
 song=next(n for n in ['song-final','song-repaired','song-fresh','song'] if (ROOT/(n+'.mp3')).exists())
 p=load('plan');raw=load(song+'-metadata')['words_timestamps'];expected=[w for u in p['units'] for w in u['text'].split()]
 assert ''.join(norm(w) for w in expected)==''.join(norm(w['word']) for w in raw),'Music timestamp text does not match complete source'
 words=[{'text':w['word'],'start':w['start_ms']/1000,'end':w['end_ms']/1000,'kind':'prayer'} for w in raw]
 assert len(words)==len(expected),'Provider split/joined words; reconcile before assembly'
 repairs=[]
 # The music aligner occasionally assigns a zero-length honorific. Highlight it with
 # the following name, retaining both source tokens instead of inventing a sung span.
 for i,w in enumerate(words):
  if w['end']-w['start']<.04:
   assert i+1<len(words)
   nxt=next(x for x in words[i+1:] if x['end']-x['start']>=.04);repairs.append({'index':i,'text':w['text'],'originalStart':w['start'],'originalEnd':w['end'],'method':'shared highlight span with following sung name'})
   w['start']=nxt['start'];w['end']=nxt['end'];w['sharedHighlight']=True
 lines=[];cursor=0
 for u in p['units']:
  for text in u['text'].splitlines():
   count=len(text.split());selected=words[cursor:cursor+count];cursor+=count
   assert norm(text)==norm(''.join(w['text'] for w in selected))
   lines.append({'text':text,'words':selected,'verse':u['verse'],'start':min(w['start'] for w in selected),'end':max(w['end'] for w in selected)})
 assert cursor==len(words) and len(lines)==112
 transcription=load(song+'-transcription')
 spoken=' '.join(w.get('text','') for w in transcription.get('words',[]) if w.get('type')=='word') or transcription.get('text','')
 # Scribe may return Kannada glyphs for this Sanskrit-derived namavali despite a
 # Telugu language hint. These scripts use corresponding Unicode block offsets.
 # Keep the raw transcript; normalize script only for the comparison.
 spoken=''.join(chr(ord(c)-0x80) if '\u0c80'<=c<='\u0ce3' else chr(ord(c)+0x300) if '\u0900'<=c<='\u0963' else c for c in spoken)
 a=norm('\n'.join(u['text'] for u in p['units']));b=norm(spoken)
 matcher=difflib.SequenceMatcher(None,a,b,autojunk=False)
 differences=[{'operation':op,'expected':a[i:j],'recognized':b[k:l]} for op,i,j,k,l in matcher.get_opcodes() if op!='equal']
 report={'selectedSong':song,'namams':108,'lyricLines':112,'sourceOrderMatchesMusicTimestampText':True,'independentASRCharacterSimilarity':round(matcher.ratio(),4),
  'independentTranscriptionDifferences':differences,'timestampSharedHighlightRepairs':repairs,
  'rawGaps':[{'afterLine':i+1,'seconds':round(n['start']-l['end'],3)} for i,(l,n) in enumerate(zip(lines,lines[1:]))],
  'humanPronunciationListeningReviewPending':True,'alignmentDoesNotProveCorrectSinging':True}
 save('source-audit',report);save('source-timed-lines',lines)
 print(json.dumps({'stage':'source-audited','namams':108,'lines':112,'ASRSimilarity':report['independentASRCharacterSimilarity'],'ASRDifferences':len(differences),'sharedHighlightRepairs':len(repairs)},ensure_ascii=False),flush=True)

def prepare():
 p=load('plan');auditreport=load('source-audit');assert auditreport['independentASRCharacterSimilarity']>.94,'Inspect transcription before assembly'
 source=ROOT/(auditreport['selectedSong']+'.mp3')
 lines=load('source-timed-lines');raw_duration=duration(source)
 cuts=[]
 if lines[0]['start']>.15:cuts.append((0,lines[0]['start']-.08))
 for a,b in zip(lines,lines[1:]):
  if b['start']-a['end']>.7:cuts.append((a['end']+.16,b['start']-.16))
 if raw_duration-lines[-1]['end']>.3:cuts.append((lines[-1]['end']+.2,raw_duration))
 cuts=sorted((a,b) for a,b in cuts if b>a)
 keep=[];pos=0
 for a,b in cuts:
  if a>pos:keep.append((pos,a))
  pos=b
 if pos<raw_duration:keep.append((pos,raw_duration))
 def adjusted(t):return t-sum(max(0,min(t,b)-a) for a,b in cuts)
 for line in lines:
  line['start']=adjusted(line['start']);line['end']=adjusted(line['end'])
  for w in line['words']:w['start']=adjusted(w['start']);w['end']=adjusted(w['end'])
 pieces=ROOT/'audio-pieces';pieces.mkdir(exist_ok=True)
 prayer_seconds=frame(sum(b-a for a,b in keep));prayer=pieces/'prayer-tight.wav'
 if not prayer.exists():
  graph=';'.join(f'[0:a]atrim=start={a:.6f}:end={b:.6f},asetpts=PTS-STARTPTS[s{i}]' for i,(a,b) in enumerate(keep))
  graph+=';' + ''.join(f'[s{i}]' for i in range(len(keep)))+f'concat=n={len(keep)}:v=0:a=1,loudnorm=I=-18:TP=-2:LRA=7,aresample=48000,apad,atrim=duration={prayer_seconds}[out]'
  run(['ffmpeg','-v','error','-nostdin','-n','-i',str(source),'-filter_complex',graph,'-map','[out]','-ar','48000','-ac','2','-c:a','pcm_s24le',str(prayer)])
 audio=[];words=[];offset=0
 def bookend(name):
  nonlocal offset
  raw=existing.aligned_words(load(name+'-alignment'));seconds=frame(max(w['end'] for w in raw)+.3);target=pieces/f'{name}.wav'
  if not target.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT/f'{name}.mp3'),'-af',f'loudnorm=I=-18:TP=-2:LRA=7,aresample=48000,apad,atrim=duration={seconds}','-ar','48000','-ac','2','-c:a','pcm_s24le',str(target)])
  part={'name':name,'file':target.relative_to(ROOT).as_posix(),'start':offset,'end':offset+seconds,'seconds':seconds};audio.append(part)
  words.extend({**w,'start':w['start']+offset,'end':w['end']+offset,'kind':name} for w in raw);offset+=seconds;return part
 welcome=bookend('welcome');prayer_start=offset
 audio.append({'name':'prayer','file':prayer.relative_to(ROOT).as_posix(),'start':offset,'end':offset+prayer_seconds,'seconds':prayer_seconds})
 for line in lines:
  line['start']+=prayer_start;line['end']+=prayer_start
  for w in line['words']:w['start']+=prayer_start;w['end']+=prayer_start
  words.extend(line['words'])
 offset+=prayer_seconds;prayer_end=offset;closing=bookend('closing')
 (ROOT/'audio-concat.txt').write_text('\n'.join("file '"+a['file']+"'" for a in audio)+'\n',encoding='utf8')
 lead=ROOT/'continuous-voices.wav'
 if not lead.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'audio-concat.txt'),'-c:a','pcm_s24le',str(lead)])
 # Reuse the approved original ElevenLabs music bed, with crossfades between cycles.
 bed=ROOT/'continuous-music-bed.wav'
 if not bed.exists():
  source=Path('data/productions/divine-wisdom/govinda-namalu-female-sample-2026-10-20/music-bed/instrumental.mp3');d=duration(source);n=math.ceil(offset/(d-.5))+1
  args=['ffmpeg','-v','error','-nostdin','-n']
  for _ in range(n):args+=['-i',str(source)]
  graph='';previous='0:a'
  for i in range(1,n):
   current=f'b{i}';graph+=f'[{previous}][{i}:a]acrossfade=d=0.5:c1=tri:c2=tri[{current}];';previous=current
  graph+=f'[{previous}]loudnorm=I=-29:TP=-8:LRA=6,aresample=48000,atrim=duration={offset},afade=t=in:st=0:d=0.3,afade=t=out:st={offset-1.5}:d=1.5[out]'
  run(args+['-filter_complex',graph,'-map','[out]','-ar','48000','-ac','2','-c:a','pcm_s24le',str(bed)])
 master=ROOT/'finished-audio-master.wav'
 if not master.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(lead),'-i',str(bed),'-filter_complex',f'[0:a][1:a]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000,apad,atrim=duration={offset}[out]','-map','[out]','-ar','48000','-ac','2','-c:a','pcm_s24le',str(master)])
 if not (ROOT/'finished-audio-master.mp3').exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(master),'-c:a','libmp3lame','-b:a','320k',str(ROOT/'finished-audio-master.mp3')])
 units=[]
 for u in p['units']:
  selected=[line for line in lines if line['verse']==u['verse']]
  units.append({**u,'start':selected[0]['start'],'end':selected[-1]['end'],'words':[w for line in selected for w in line['words']]})
 scenes=[{'index':0,'kind':'welcome','start':0,'end':welcome['end'],'seconds':welcome['seconds'],'image':ART[1]}]
 image_sequence=[1,0,2,3,6,7,1,4,8,0,3,6,7,2,5]
 for i in range(0,len(units),2):
  start=prayer_start if i==0 else units[i]['start']-.05
  end=units[i+2]['start']-.05 if i+2<len(units) else prayer_end
  # Scene boundaries lie on video frames; the captions retain acoustic word timing.
  start=round(start*FPS)/FPS;end=round(end*FPS)/FPS
  scenes.append({'index':len(scenes),'kind':'prayer','verses':[u['verse'] for u in units[i:i+2]],'start':start,'end':end,'seconds':end-start,'image':ART[image_sequence[i//2]]})
 scenes.append({'index':len(scenes),'kind':'closing','start':prayer_end,'end':offset,'seconds':closing['seconds'],'image':ART[5]})
 save('timeline',{'seconds':offset,'prayerStart':prayer_start,'prayerEnd':prayer_end,'units':units,'scenes':scenes,'audio':audio,'fps':24,'width':1920,'height':1080,'noTempoOrPitchProcessing':True})
 save('timed-lines',lines);save('timed-words',words)
 gaps=[round(b['start']-a['end'],4) for a,b in zip(lines,lines[1:])]
 save('join-audit',{'removedIntervals':cuts,'removedSeconds':sum(b-a for a,b in cuts),'maximumGapBetweenNames':max(gaps),'gaps':gaps,'method':'Trim only long gaps between supplied line-end and next line-start timestamps, keeping short breaths. No tempo or pitch processing.'})
 print(json.dumps({'stage':'mastered','seconds':offset,'scenes':len(scenes),'maxGapBetweenNames':max(gaps),'trimmedSeconds':sum(b-a for a,b in cuts)}),flush=True)

def captions():
 lines=load('timed-lines');words=load('timed-words');t=load('timeline');pages=[]
 for i in range(0,len(lines),2):
  group=lines[i:i+2];selected=[w for line in group for w in line['words']]
  pages.append({'start':max(t['prayerStart'],group[0]['start']-.05),'end':min(t['prayerEnd'],group[-1]['end']+.12),'lines':[line['words'] for line in group],'words':selected,'namamLines':[i+1,i+2]})
 for kind in ['welcome','closing']:
  group=[w for w in words if w.get('kind')==kind]
  for i in range(0,len(group),6):
   selected=group[i:i+6];pages.append({'start':max(0,selected[0]['start']-.03),'end':min(t['seconds'],selected[-1]['end']+.1),'lines':[selected[:3],selected[3:]] if len(selected)>3 else [selected],'words':selected})
 pages.sort(key=lambda p:p['start'])
 issues=[]
 for i,p in enumerate(pages):
  if i+1<len(pages):p['end']=min(p['end'],pages[i+1]['start'])
  maxwidth=max(FONT.getlength(' '.join(w['text'] for w in line)) for line in p['lines'])
  p['fontSize']=min(104,math.floor(104*1650/max(maxwidth,1)))
  if p['fontSize']<82 or p['end']<=p['start']:issues.append({'page':i,'reason':'layout_or_timing','fontSize':p['fontSize']})
 assert not issues,issues
 save('captions',{'words':words,'pages':pages});save('caption-audit',{'issues':issues,'prayerLines':112,'completeNamams':108,'pages':len(pages),'wordHighlight':True,'manualListeningVerified':False,'sharedHighlightRepairs':load('source-audit')['timestampSharedHighlightRepairs']})
 write_ass(ROOT/'telugu-captions.ass',pages,t['seconds'])
 srt='\n\n'.join(f"{i+1}\n{srt_time(p['start'])} --> {srt_time(p['end'])}\n"+'\n'.join(' '.join(w['text'] for w in line) for line in p['lines']) for i,p in enumerate(pages))+'\n'
 (ROOT/'telugu-captions.srt').write_text(srt,encoding='utf8');(ROOT/'telugu-captions.vtt').write_text('WEBVTT\n\n'+srt.replace(',','.'),encoding='utf8')
 print(json.dumps({'stage':'captions-ready','pages':len(pages),'namams':108}),flush=True)

def write_ass(path,pages,seconds,offset=0,kind=None):
 events=[f'Dialogue: 0,{ass_time(0)},{ass_time(seconds)},Title,,0,0,0,,శ్రీ గోవింద నామాలు']
 for p in pages:
  a=max(offset,p['start']);b=min(offset+seconds,p['end'])
  if b<=a:continue
  bounds=sorted(set([a,b]+[max(a,min(b,w[k])) for w in p['words'] for k in ['start','end']]))
  for x,y in zip(bounds,bounds[1:]):
   if round(y*100)<=round(x*100):continue
   mid=(x+y)/2
   text='\\N'.join(' '.join(('{\\c&H004AD5FF&}'+w['text']+'{\\c&H00FFFFFF&}') if w['start']<=mid<w['end'] else w['text'] for w in line) for line in p['lines'])
   events.append(f"Dialogue: 1,{ass_time(x-offset)},{ass_time(y-offset)},Lyrics,,0,0,0,,{{\\fs{p['fontSize']}}}{text}")
 if kind=='welcome':events.append(f'Dialogue: 0,0:00:00.00,{ass_time(seconds)},Card,,0,0,0,,{{\\an5\\pos(1430,430)}}డివైన్ విజ్డమ్ తెలుగు\\Nఛానల్‌కు స్వాగతం')
 if kind=='closing':events.append(f'Dialogue: 0,0:00:00.00,{ass_time(seconds)},Card,,0,0,0,,{{\\an5\\pos(1430,430)\\fs64}}సబ్‌స్క్రైబ్ • లైక్\\Nషేర్ • కామెంట్')
 path.write_text(existing.HEADER+'\n'.join(events)+'\n',encoding='utf8')

def thumbnail():
 img=Image.open(ROOT/'art/02-venkateswara-portrait.png').convert('RGBA').resize((1920,1080),Image.Resampling.LANCZOS)
 overlay=Image.new('RGBA',img.size);d=ImageDraw.Draw(overlay);d.rectangle((980,0,1920,1080),fill=(2,8,23,225));img=Image.alpha_composite(img,overlay);d=ImageDraw.Draw(img)
 for text,y,size,color in [('శ్రీ గోవింద',280,118,'#f4cf70'),('నామాలు',460,144,'#f4cf70'),('పూర్తి 108 నామాలు',670,72,'white'),('డివైన్ విజ్డమ్ తెలుగు',835,48,'#f1d894')]:
  font=ImageFont.truetype(FONT_PATH,size);assert font.getlength(text)<900;d.text((1430,y),text,font=font,fill=color,anchor='mm',stroke_width=1)
 logo=Image.open(ROOT/'channel-logo.png').convert('RGBA');logo.thumbnail((150,150));img.alpha_composite(logo,(1730,40))
 img.convert('RGB').resize((1280,720),Image.Resampling.LANCZOS).save(ROOT/'thumbnail.jpg',quality=95)

def render():
 t=load('timeline');c=load('captions');assert not load('caption-audit')['issues']
 (ROOT/'video-pieces').mkdir(exist_ok=True)
 logo=Image.open(ROOT/'channel-logo.png').convert('RGBA');logo.thumbnail((128,128));logo.save(ROOT/'logo-overlay.png')
 for s in t['scenes']:
  target=ROOT/'video-pieces'/f"{s['index']:02}.mp4"
  if target.exists():continue
  frames=round(s['seconds']*FPS);subtitle=ROOT/f"screen-{s['index']:02}.ass";write_ass(subtitle,c['pages'],s['seconds'],s['start'],s['kind'])
  zoom=f"1.015+0.025*on/{max(frames-1,1)}" if s['index']%2==0 else f"1.04-0.025*on/{max(frames-1,1)}"
  vf=f"[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='{zoom}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d={frames}:s=1920x1080:fps=24,setsar=1,fade=t=in:st=0:d=0.25,fade=t=out:st={max(0,s['seconds']-.25)}:d=0.25,drawbox=x=0:y=740:w=iw:h=340:color=black@0.64:t=fill,drawbox=x=0:y=0:w=iw:h=110:color=black@0.25:t=fill[bg];[bg][1:v]overlay=W-w-28:28,ass=filename='{subtitle.as_posix()}':fontsdir='{ROOT.as_posix()}/fonts':shaping=complex,format=yuv420p[out]"
  run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT/'art'/f"{s['image']}.png"),'-i',str(ROOT/'logo-overlay.png'),'-filter_complex',vf,'-map','[out]','-frames:v',str(frames),'-an','-c:v','libx264','-threads','6','-preset','veryfast','-crf','19','-pix_fmt','yuv420p','-video_track_timescale','24000',str(target)])
  save('RENDER-PROGRESS',{'completedScreens':s['index']+1,'screens':len(t['scenes'])});print(json.dumps({'stage':'screen-rendered','screen':s['index']+1,'total':len(t['scenes'])}),flush=True)
 (ROOT/'video-concat.txt').write_text('\n'.join(f"file 'video-pieces/{s['index']:02}.mp4'" for s in t['scenes'])+'\n',encoding='utf8')
 if not OUTPUT.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'video-concat.txt'),'-i',str(ROOT/'finished-audio-master.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','256k','-movflags','+faststart',str(OUTPUT)])
 thumbnail();metadata()

def metadata():
 p=load('plan');t=load('timeline');chapters=[{'start':0,'title':'ఛానల్ స్వాగతం'},{'start':t['prayerStart'],'title':'గోవింద నామావళి ప్రారంభం'}]
 for u in t['units']:
  if u['verse'] in [1,7,13,19,25]:chapters.append({'start':u['start'],'title':u['text'].splitlines()[0]})
 chapters.append({'start':t['prayerEnd'],'title':'ముగింపు • గోవిందా గోవిందా'})
 chaptertext='\n'.join(existing.chapter_time(c['start'])+' '+c['title'] for c in chapters)
 title='శ్రీ గోవింద నామాలు | పూర్తి 108 నామాలు | Govinda Namalu Telugu | Divine Wisdom Telugu'
 description='శ్రీ వేంకటేశ్వర స్వామి గోవింద నామావళి — పూర్తి 108 నామాలు, మధురమైన మహిళా గానం, భక్తి సంగీతం మరియు తెలుగు సాహిత్యంతో.\n\nసాహిత్య మూలం: '+p['source']+'\n\nగానం, సంగీతం మరియు ఛానల్ స్వరం ElevenLabs సహాయంతో రూపొందించబడ్డాయి. గతంలో మా ఛానల్ కోసం రూపొందించిన AI భక్తి చిత్రాలను ఈ వీడియోలో ఉపయోగించాము.\n\n'+chaptertext+'\n\nడివైన్ విజ్డమ్ తెలుగు ఛానల్‌ను సబ్‌స్క్రైబ్ చేయండి. లైక్, షేర్ చేసి, కామెంట్‌లో గోవిందా గోవిందా అని రాయండి.\n\n#GovindaNamalu #గోవిందనామాలు #Venkateswara #DivineWisdomTelugu\n'
 (ROOT/'youtube-description.txt').write_text(description,encoding='utf8');(ROOT/'chapters.txt').write_text(chaptertext+'\n',encoding='utf8')
 save('youtube-metadata',{'title':title,'description':description,'chapters':chapters,'language':'te','containsSyntheticMedia':True,'uploadOrPublishingAuthorized':False,'tags':['Govinda Namalu','గోవింద నామాలు','108 Govinda Namalu','Venkateswara','Divine Wisdom Telugu']})
 # The final YouTube package includes the entire namavali and valid chapter spacing.
 run(['node','scripts/package-govinda-youtube.mjs'])

def verify():
 t=load('timeline');run(['ffmpeg','-v','error','-nostdin','-i',str(OUTPUT),'-f','null','-'])
 info=existing.probe(OUTPUT);v=next(s for s in info['streams'] if s['codec_type']=='video')
 assert (v['width'],v['height'],v['r_frame_rate'])==(1920,1080,'24/1')
 assert abs(float(info['format']['duration'])-t['seconds'])<.15
 assert load('join-audit')['maximumGapBetweenNames']<=.7
 (ROOT/'review').mkdir(exist_ok=True)
 for name,sec in [('welcome',3),('opening',t['units'][1]['start']+2),('middle',t['units'][14]['start']+2),('closing',t['prayerEnd']+5)]:
  run(['ffmpeg','-v','error','-nostdin','-y','-ss',str(sec),'-i',str(OUTPUT),'-frames:v','1',str(ROOT/'review'/f'{name}.png')])
 save('VERIFICATION',{'file':str(OUTPUT.resolve()),'seconds':float(info['format']['duration']),'resolution':'1920x1080','fps':24,'namams':108,'lyricLinesIncludingRefrains':112,'fullDecodePassed':True,'sourceOrderMatchesMusicTimestampText':True,'independentASRSimilarity':load('source-audit')['independentASRCharacterSimilarity'],'maximumGapBetweenNames':load('join-audit')['maximumGapBetweenNames'],'noTempoOrPitchProcessing':True,'existingChannelLogo':True,'existingArtworkReused':9,'captionFont':'Noto Sans Telugu','activeWordGold':True,'humanPronunciationAndCaptionSynchronizationListeningReviewPending':True,'published':False})
 print(json.dumps({'stage':'verified','seconds':float(info['format']['duration']),'file':str(OUTPUT)}),flush=True)

if __name__=='__main__':
 {'audit':audit,'prepare':prepare,'captions':captions,'render':render,'thumbnail':thumbnail,'metadata':metadata,'verify':verify}[sys.argv[1]]()
