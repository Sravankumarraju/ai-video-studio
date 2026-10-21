"""Male Suprabhatam edition: whole shlokam, timed gold words, trimmed joins and pitch polish."""
from pathlib import Path
import importlib.util,json,math,re,subprocess,sys,shutil
from PIL import ImageFont

spec=importlib.util.spec_from_file_location('venkat_renderer',Path(__file__).with_name('venkateswara-package.py'))
renderer=importlib.util.module_from_spec(spec);spec.loader.exec_module(renderer)
ROOT=Path('data/productions/divine-wisdom/venkateswara/suprabhatam-2026-10-19/full-male-shloka-2026-10-19')
renderer.ROOT=ROOT
load=renderer.load;save=renderer.save;run=renderer.run;norm=renderer.norm
FPS=24

def words_for(u,raw):
 expected=[s for s in u['text'].split() if norm(s)]
 assert ''.join(norm(s) for s in expected)==''.join(norm(w['text']) for w in raw),(u['verse'],'source alignment mismatch')
 spans=[];pos=0
 for w in raw:spans.append((pos,pos+len(norm(w['text'])),w));pos+=len(norm(w['text']))
 result=[];pos=0
 for text in expected:
  endpos=pos+len(norm(text));hits=[w for a,b,w in spans if a<endpos and b>pos];assert hits
  result.append({'text':text,'start':min(w['start'] for w in hits),'end':max(w['end'] for w in hits),'verse':u['verse'],'kind':'prayer'});pos=endpos
 return result

def prepare():
 p=load('plan');pieces=ROOT/'audio-pieces';pieces.mkdir(exist_ok=True);(ROOT/'fonts').mkdir(exist_ok=True)
 shutil.copyfile(renderer.FONT_PATH,ROOT/'fonts/NotoSansTelugu.ttf');shutil.copyfile('public/fonts/OFL.txt',ROOT/'fonts/OFL-NotoSansTelugu.txt')
 opening=renderer.aligned_words(load('approved-opening-alignment'));cursor=0;items=[]
 for u in p['units'][:2]:
  count=len([s for s in u['text'].split() if norm(s)]);raw=opening[cursor:cursor+count];cursor+=count
  items.append({'unit':u,'words':words_for(u,raw),'source':'approved-opening.mp3','sourceOffset':0,'allocation':30})
 for b in p['batches']:
  offset=0
  for u in b['units']:
   words=words_for(u,renderer.aligned_words(load(f"fresh-verse-{u['verse']:02}-alignment")))
   items.append({'unit':u,'words':words,'source':f"fresh-batch-{b['index']}.mp3",'sourceOffset':offset,'allocation':u['seconds']});offset+=u['seconds']
 issues=[]
 for item in items:
  for w in item['words']:
   syllables=len(re.findall('[క-హఱ](?!్)|[అ-ఔ]',w['text']))
   if w['end']-w['start']<max(.04,.09*syllables):issues.append({**w,'reason':'collapsed_or_compressed'})
 save('acoustic-audit',{'issues':issues,'independentTranscriptionFiles':['fresh-batch-1-transcription.json','fresh-batch-2-transcription.json'],'humanListeningPending':True})
 assert not issues,('Affected verses need repair before assembly',issues)
 # Render every audio part to a frame-aligned duration, keeping short natural breath space.
 audio=[];allwords=[];units=[];offset=0
 def part(name,source,start,seconds,prayer=False):
  nonlocal offset
  frames=math.ceil(seconds*FPS);seconds=frames/FPS;file=pieces/f'{len(audio):02}.wav'
  pitch='rubberband=tempo=1:pitch=1.0293022366:formant=preserved:channels=together,' if prayer else ''
  filters=pitch+f'apad,atrim=duration={seconds},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.012,afade=t=out:st={max(0,seconds-.012)}:d=0.012'
  if not file.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(start),'-i',str(ROOT/source),'-t',str(seconds),'-af',filters,'-ar','48000','-ac','2','-c:a','pcm_s24le',str(file)])
  audio.append({'name':name,'file':str(file.relative_to(ROOT)),'source':source,'sourceStart':start,'start':offset,'end':offset+seconds,'seconds':seconds,'prayer':prayer});offset+=seconds
  return audio[-1]
 welcome_words=renderer.aligned_words(load('welcome-alignment'))
 welcome=part('welcome','welcome.mp3',0,max(w['end'] for w in welcome_words)+.25)
 for w in welcome_words:allwords.append({**w,'kind':'welcome'})
 prayerstart=offset
 for item in items:
  u=item['unit'];raw=item['words'];start=max(0,raw[0]['start']-.12);end=min(item['allocation'],raw[-1]['end']+.26)
  # Opening verses share one source file, so keep the cut clear of the following verse.
  if u['verse']==1:end=min(end,items[1]['words'][0]['start']-.05)
  clip=part(f"verse-{u['verse']:02}",item['source'],item['sourceOffset']+start,end-start,True)
  adjusted=[{**w,'start':w['start']-start+clip['start'],'end':w['end']-start+clip['start']} for w in raw]
  allwords.extend(adjusted);units.append({**u,'start':clip['start'],'end':clip['end'],'sourceTrimStart':start,'words':adjusted})
 prayerend=offset
 closing_words=renderer.aligned_words(load('closing-alignment'))
 closing=part('closing','closing.mp3',0,max(w['end'] for w in closing_words)+.3)
 for w in closing_words:allwords.append({**w,'start':w['start']+prayerend,'end':w['end']+prayerend,'kind':'closing'})
 concat='\n'.join("file '"+a['file']+"'" for a in audio)+'\n';(ROOT/'audio-concat.txt').write_text(concat,encoding='utf8')
 (ROOT/'prayer-concat.txt').write_text('\n'.join("file '"+a['file']+"'" for a in audio if a['prayer'])+'\n',encoding='utf8')
 for source,target in [('audio-concat.txt','finished-audio-master.wav'),('prayer-concat.txt','suprabhatam-prayer-master.wav')]:
  if not (ROOT/target).exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/source),'-af','highpass=f=35,bass=g=1.5:f=110:w=0.7,equalizer=f=320:t=q:w=1:g=-0.7,equalizer=f=2600:t=q:w=0.8:g=0.8,alimiter=limit=0.841395:attack=5:release=80:level=false:latency=true','-c:a','pcm_s24le',str(ROOT/target)])
 if not (ROOT/'finished-audio-master.mp3').exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT/'finished-audio-master.wav'),'-c:a','libmp3lame','-b:a','320k',str(ROOT/'finished-audio-master.mp3')])
 image_index=[0,1,4,4,8,6,0,7,3,8,7,3,1,6,0,2,7,6,3,8,4,1,6,2,7,0,3,8,5]
 scenes=[{'index':0,'kind':'welcome','start':0,'end':welcome['end'],'seconds':welcome['seconds'],'image':renderer.ART[1]}]
 for u,img in zip(units,image_index):scenes.append({'index':len(scenes),'kind':'prayer','verses':[u['verse']],'start':u['start'],'end':u['end'],'seconds':u['end']-u['start'],'image':renderer.ART[img]})
 scenes.append({'index':len(scenes),'kind':'closing','start':prayerend,'end':offset,'seconds':closing['seconds'],'image':renderer.ART[5]})
 save('timeline',{'seconds':offset,'prayerStart':prayerstart,'prayerEnd':prayerend,'units':units,'scenes':scenes,'audio':audio,'fps':24,'width':1920,'height':1080,'noTempoProcessing':True,'pitchLiftSemitones':.5,'fullShlokaHeldOnScreen':True})
 save('timed-words',allwords)
 save('join-audit',{'internalVocalGaps':[{ 'afterVerse':a['verse'],'seconds':round(b['words'][0]['start']-a['words'][-1]['end'],3)} for a,b in zip(units,units[1:])],'method':'Trim non-vocal intro/outro tails only; preserve every aligned syllable and short breathing room; no tempo change'})
 print(json.dumps({'stage':'male-mastered','seconds':offset,'verses':len(units),'pitchLiftSemitones':.5}),flush=True)

def captions():
 t=load('timeline');words=load('timed-words');pages=[]
 for u in t['units']:
  iterator=iter(u['words']);lines=[]
  for line in u['text'].splitlines():
   current=[]
   for token in line.split():
    if norm(token):w=next(iterator);assert norm(w['text'])==norm(token);current.append({**w,'text':token})
    else:current.append({'text':token})
   lines.append(current)
  lines[-1].extend([{'text':str(u['verse'])},{'text':'॥'}])
  maxwidth=max(ImageFont.truetype(renderer.FONT_PATH,82).getlength(' '.join(w['text'] for w in line)) for line in lines)
  size=min(82,math.floor(82*1760/maxwidth))
  assert size>=72,(u['verse'],size)
  pages.append({'start':u['start'],'end':u['end'],'lines':lines,'words':u['words'],'verse':u['verse'],'fontSize':size,'display':'full-verse'})
 for kind in ['welcome','closing']:
  group=[w for w in words if w['kind']==kind]
  for index in range(0,len(group),8):
   selected=group[index:index+8];lines=[selected[:4],selected[4:]] if len(selected)>4 else [selected]
   pages.append({'start':selected[0]['start'],'end':selected[-1]['end']+.12,'lines':lines,'words':selected,'fontSize':82})
 pages.sort(key=lambda p:p['start']);save('captions',{'words':words,'pages':pages});save('caption-audit',{'issues':[],'prayerWords':sum(w['kind']=='prayer' for w in words),'completeHeldVerses':29,'verseNumbersVisible':True,'verseNumbersSung':False,'noPaginatedPrayerVerses':True,'listeningReviewPending':True})
 write_ass(ROOT/'telugu-captions.ass',pages,t['seconds'])
 (ROOT/'telugu-captions.srt').write_text('\n\n'.join(f"{i+1}\n{renderer.srt_time(p['start'])} --> {renderer.srt_time(p['end'])}\n"+'\n'.join(' '.join(w['text'] for w in line) for line in p['lines']) for i,p in enumerate(pages))+'\n',encoding='utf8')
 print(json.dumps({'stage':'full-verse-captions-ready','verses':29,'pages':len(pages)}),flush=True)

def write_ass(path,pages,seconds,offset=0,kind=None):
 events=[f'Dialogue: 0,{renderer.ass_time(0)},{renderer.ass_time(seconds)},Title,,0,0,0,,శ్రీ వేంకటేశ్వర సుప్రభాతం']
 for p in pages:
  a=max(offset,p['start']);b=min(offset+seconds,p['end'])
  if b<=a:continue
  bounds=sorted(set([a,b]+[max(a,min(b,w[k])) for w in p['words'] for k in ['start','end']]))
  for x,y in zip(bounds,bounds[1:]):
   if round(y*100)<=round(x*100):continue
   mid=(x+y)/2
   text='\\N'.join(' '.join(('{\\c&H004AD5FF&}'+w['text']+'{\\c&H00FFFFFF&}') if w.get('start',-1)<=mid<w.get('end',-1) else w['text'] for w in line) for line in p['lines'])
   events.append(f"Dialogue: 1,{renderer.ass_time(x-offset)},{renderer.ass_time(y-offset)},Lyrics,,0,0,0,,{{\\fs{p['fontSize']}}}{text}")
 if kind=='welcome':events.append(f'Dialogue: 0,0:00:00.00,{renderer.ass_time(seconds)},Card,,0,0,0,,{{\\an5\\pos(1430,430)}}డివైన్ విజ్డమ్ తెలుగు\\Nఛానల్‌కు స్వాగతం')
 if kind=='closing':events.append(f'Dialogue: 0,0:00:00.00,{renderer.ass_time(seconds)},Card,,0,0,0,,{{\\an5\\pos(1430,430)\\fs64}}సబ్‌స్క్రైబ్ • లైక్\\Nషేర్ • కామెంట్')
 path.write_text(renderer.HEADER+'\n'.join(events)+'\n',encoding='utf8')

def verify():
 renderer.verify();report=load('VERIFICATION');report.update({'noTempoProcessing':True,'noTempoOrPitchProcessing':False,'pitchLiftSemitones':.5,'pitchMethod':'Formant-preserving whole-prayer-mix half-semitone lift; voice stem unavailable','completeHeldVerses':29,'verseNumbersDisplayed':True,'verseNumbersSung':False,'captionFontSize':'72–82 px as needed for complete 2/4-line shlokams','originalApprovedOpeningPerformancePreserved':True})
 save('VERIFICATION',report)
 result=subprocess.run(['ffmpeg','-hide_banner','-nostdin','-i',str(ROOT/'finished-audio-master.wav'),'-af','silencedetect=noise=-42dB:d=0.8','-f','null','-'],capture_output=True,text=True,check=True)
 (ROOT/'silence-detection.txt').write_text(result.stderr,encoding='utf8');assert 'silence_start:' not in result.stderr,'Long silence remains; inspect before delivery'
 report['silenceAtLeastPointEightSecondsDetected']=False;save('VERIFICATION',report)

renderer.write_ass=write_ass
if __name__=='__main__':
 {'prepare':prepare,'captions':captions,'render':renderer.render,'verify':verify,'metadata':renderer.metadata,'thumbnail':renderer.thumbnail}[sys.argv[1]]()
