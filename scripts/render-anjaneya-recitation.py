"""Full spoken Dandakam with measured word highlighting and channel bookends."""
from pathlib import Path
import importlib.util, json, math, re, shutil, subprocess, sys
from PIL import ImageFont

ROOT=Path('data/productions/divine-wisdom/anjaneya-dandakam-2026-10-16')
PLAN=json.loads((ROOT/'recitation-plan.json').read_text(encoding='utf-8'))
BRAND=json.loads((ROOT/'plan.json').read_text(encoding='utf-8'))
FPS=24
TEMPO=PLAN['playbackTempo']
FONT=ImageFont.truetype('public/fonts/NotoSansTelugu.ttf',96)
spec=importlib.util.spec_from_file_location('bookends','scripts/render-anjaneya-bookends.py')
bookends=importlib.util.module_from_spec(spec)
spec.loader.exec_module(bookends)

def run(args):subprocess.run(args,check=True)
def read(name):return json.loads((ROOT/f'{name}.json').read_text(encoding='utf-8'))
def save(name,data):(ROOT/f'{name}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
def duration(path):return float(bookends.probe(path)['format']['duration'])

def prepare_audio():
    pieces=[]; all_words=[];offset=0
    for batch in PLAN['batches']:
        stem=batch['stem']
        assert not read(stem+'-checks')['collapsedWords']
        output=ROOT/f'{stem}-measured.wav'
        if not output.exists():
            run(['ffmpeg','-v','error','-nostdin','-n','-i',str(ROOT/f'{stem}.mp3'),
                '-af',f'atempo={TEMPO},loudnorm=I=-17:TP=-2:LRA=7,aresample=48000,apad=pad_dur=0.35',
                '-ar','48000','-ac','2','-c:a','pcm_s16le',str(output)])
        seconds=duration(output)
        alignment=read(stem+'-alignment')
        assert ''.join(alignment['characters'])==batch['text']
        for match in re.finditer(r'\S+',batch['text']):
            a=min(alignment['character_start_times_seconds'][match.start():match.end()])/TEMPO+offset
            b=max(alignment['character_end_times_seconds'][match.start():match.end()])/TEMPO+offset
            assert b>a
            all_words.append({'text':match.group(),'start':a,'end':b,'batch':batch['index']})
        pieces.append(output)
        offset+=seconds
    source=(ROOT/'lyrics-supplied.txt').read_text(encoding='utf-8').strip()
    assert [w['text'] for w in all_words]==source.split()
    assert len(all_words)==266
    assert all(a['start']<=b['start'] for a,b in zip(all_words,all_words[1:]))
    manifest=ROOT/'recitation-audio.ffconcat'
    manifest.write_text('ffconcat version 1.0\n'+''.join(f"file '{p.name}'\n" for p in pieces),encoding='utf-8')
    master=ROOT/'Anjaneya-Dandakam-Spoken-Recitation.wav'
    if not master.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(manifest),'-c:a','copy',str(master)])
    save('recitation-words',{'words':all_words,'seconds':duration(master),'sourceWordsPreserved':True,'timeScale':1/TEMPO})
    return all_words,duration(master)

def captions(words,seconds):
    # Preserve complete supplied phrases, wrapping only at whole word boundaries.
    source=(ROOT/'lyrics-supplied.txt').read_text(encoding='utf-8').strip()
    rows=[]; index=0
    for text in source.splitlines():
        if not text.strip():continue
        count=len(text.split()); selected=words[index:index+count];index+=count
        assert [w['text'] for w in selected]==text.split()
        row=[]
        for word in selected:
            if row and FONT.getlength(' '.join(w['text'] for w in row+[word]))>1660:
                rows.append(row);row=[]
            row.append(word)
        if row:rows.append(row)
    assert index==len(words)
    assert all(FONT.getlength(' '.join(w['text'] for w in row))<=1660 for row in rows),'Caption line exceeds reading area'
    pages=[]
    for i in range(0,len(rows),2):
        lines=rows[i:i+2];ws=sum(lines,[])
        pages.append({'lines':lines,'words':ws,'start':ws[0]['start'],'end':min(seconds,ws[-1]['end']+.2)})
    for page,next_page in zip(pages,pages[1:]):page['end']=min(page['end'],next_page['start'])
    events=[]
    def event(a,b,style,text):events.append(f'Dialogue: 0,{bookends.stamp(a)},{bookends.stamp(b)},{style},,0,0,0,,{text}')
    event(0,seconds,'Brand',r'{\pos(150,47)}Divine Wisdom Telugu')
    event(0,seconds,'Label',r'{\pos(1840,47)}శ్రీ ఆంజనేయ దండకం')
    for page in pages:
        bounds=sorted(set([page['start'],page['end']]+[min(page['end'],max(page['start'],t)) for w in page['words'] for t in (w['start'],w['end'])]))
        for a,b in zip(bounds,bounds[1:]):
            if round(b*100)<=round(a*100):continue
            active=next((w for w in page['words'] if w['start']<=(a+b)/2<w['end']),None)
            text=r'\N'.join(' '.join((r'{\c&H004AD5FF&}'+w['text']+r'{\c&H00FFFFFF&}') if w is active else w['text'] for w in line) for line in page['lines'])
            event(a,b,'Caption',text)
    header=bookends.HEADER.replace('Style: Caption,Noto Sans Telugu,88,','Style: Caption,Noto Sans Telugu,96,')
    extra='''Style: Brand,Noto Sans,36,&H00FFFFFF,&H00FFFFFF,&H00101010,&H90000000,0,0,0,0,100,100,0,0,1,2,0,4,0,0,0,1
Style: Label,Noto Sans Telugu,40,&H004AD5FF,&H004AD5FF,&H00101010,&H90000000,0,0,0,0,100,100,0,0,1,2,0,6,0,0,0,1
'''
    header=header.replace('[Events]',extra+'[Events]')
    (ROOT/'recitation-highlight.ass').write_text(header+'\n'.join(events)+'\n',encoding='utf-8')
    (ROOT/'recitation-captions-te.srt').write_text('\n\n'.join(f'{i+1}\n{bookends.srtstamp(p["start"])} --> {bookends.srtstamp(p["end"])}\n'+'\n'.join(' '.join(w['text'] for w in line) for line in p['lines']) for i,p in enumerate(pages))+'\n',encoding='utf-8')
    save('recitation-caption-layout',{'pages':pages,'fontSize':96,'maxLines':2,'minimumPanelContrast':'White/gold on opaque dark navy','events':len(events),'allWordsMapped':len(words),'listeningReviewPending':True})

def full_subtitles():
    welcome_seconds=duration(ROOT/'welcome-1080p.mp4')
    recitation_seconds=read('recitation-words')['seconds']
    sections=[(read('welcome-caption-layout')['pages'],0),
        (read('recitation-caption-layout')['pages'],welcome_seconds),
        (read('closing-caption-layout')['pages'],welcome_seconds+recitation_seconds)]
    cues=[]
    for pages,offset in sections:
        for page in pages:
            text='\n'.join(' '.join(w['text'] for w in line) for line in page['lines'])
            cues.append(f'{len(cues)+1}\n{bookends.srtstamp(page["start"]+offset)} --> {bookends.srtstamp(page["end"]+offset)}\n{text}')
    (ROOT/'full-video-captions-te.srt').write_text('\n\n'.join(cues)+'\n',encoding='utf-8')

def artwork(words,seconds):
    folder=ROOT/'recitation-artwork';folder.mkdir(exist_ok=True)
    previous=ROOT.parent/'hanuman-chalisa'
    blocks=(ROOT/'lyrics-supplied.txt').read_text(encoding='utf-8').strip().split('\n\n')
    names=['new-hero','new-hero','devotion','devotion','ocean','ocean','new-mountain','strength','peace','new-hero','new-hero','devotion','strength','strength','strength','new-hero','new-hero']
    cuts=[];index=0
    for block,name in zip(blocks,names):
        cuts.append((0 if not cuts else words[index]['start'],name));index+=len(block.split())
    assert index==len(words)
    sources={'new-hero':ROOT/'hanuman-blessing-original.png','new-mountain':ROOT/'hanuman-sanjeevani-original.png',
        **{name:previous/f'hanuman-{name}-v1.png' for name in ['devotion','ocean','strength','peace']}}
    for name,path in sources.items():
        target=folder/f'{name}.png'
        if not target.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(path),'-vf','scale=1920:1080:flags=lanczos,setsar=1','-frames:v','1',str(target)])
    lines=['ffconcat version 1.0'];timeline=[]
    for i,(start,name) in enumerate(cuts):
        a=round(start*FPS)/FPS
        b=round(cuts[i+1][0]*FPS)/FPS if i+1<len(cuts) else math.ceil(seconds*FPS)/FPS
        if b<=a:continue
        lines += [f"file 'recitation-artwork/{name}.png'",'option framerate 24',f'duration {b-a:.9f}']
        timeline.append({'start':a,'end':b,'image':name})
    lines += [f"file 'recitation-artwork/{cuts[-1][1]}.png'",'option framerate 24']
    (ROOT/'recitation-artwork.ffconcat').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    save('recitation-timeline',{'scenes':timeline,'newImages':2,'reusedPreviousChannelImages':4,'seconds':seconds})

def render():
    words,seconds=prepare_audio();captions(words,seconds);artwork(words,seconds)
    target=ROOT/'Anjaneya-Dandakam-Recitation-1080p.mp4'
    if not target.exists():
        graph=(f'[0:v]fps={FPS},setsar=1,drawbox=x=0:y=0:w=iw:h=94:color=black@0.45:t=fill,'
            f'drawbox=x=0:y=785:w=iw:h=295:color=0x050C20@0.94:t=fill,'
            f"ass=filename='{ROOT.as_posix()}/recitation-highlight.ass':fontsdir='public/fonts':shaping=complex[base];"
            '[2:v]scale=100:100[logo];[base][logo]overlay=25:0:format=auto,format=yuv420p[v]')
        run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(ROOT/'recitation-artwork.ffconcat'),
            '-i',str(ROOT/'Anjaneya-Dandakam-Spoken-Recitation.wav'),'-i',BRAND['logo'],
            '-filter_complex',graph,'-map','[v]','-map','1:a:0','-t',str(seconds),
            '-c:v','libx264','-threads','6','-preset','veryfast','-crf','19','-pix_fmt','yuv420p',
            '-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart',
            '-progress',str(ROOT/'recitation-render-progress.txt'),str(target)])
    # Existing welcome and closing are reused without new voice-generation calls.
    for section in BRAND['bookends']:bookends.render(section)
    full_subtitles()
    concat=ROOT/'full-recitation.ffconcat'
    concat.write_text("ffconcat version 1.0\nfile 'welcome-1080p.mp4'\nfile 'Anjaneya-Dandakam-Recitation-1080p.mp4'\nfile 'closing-1080p.mp4'\n",encoding='utf-8')
    final=ROOT/'Sri-Anjaneya-Dandakam-Full-Recitation-Divine-Wisdom-Telugu.mp4'
    if not final.exists():run(['ffmpeg','-v','error','-nostdin','-n','-f','concat','-safe','0','-i',str(concat),'-c','copy','-movflags','+faststart',str(final)])
    audio=ROOT/'Sri-Anjaneya-Dandakam-Full-Recitation.mp3'
    if not audio.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(final),'-vn','-af','asetpts=N/SR/TB','-c:a','libmp3lame','-b:a','192k',str(audio)])
    welcome_seconds=duration(ROOT/'welcome-1080p.mp4')
    for label,index in [('opening',1),('dense',100),('sanjeevani',130),('closing-prayer',260)]:
        w=words[index];t=welcome_seconds+(w['start']+w['end'])/2
        frame=ROOT/f'recitation-review-{label}.png'
        if not frame.exists():run(['ffmpeg','-v','error','-nostdin','-n','-ss',str(t),'-i',str(final),'-frames:v','1',str(frame)])
    run(['ffmpeg','-v','error','-nostdin','-i',str(final),'-f','null','-'])
    info=bookends.probe(final)
    v=next(x for x in info['streams'] if x['codec_type']=='video')
    a=next(x for x in info['streams'] if x['codec_type']=='audio')
    expected=seconds+welcome_seconds+duration(ROOT/'closing-1080p.mp4')
    assert (v['width'],v['height'])==(1920,1080)
    assert abs(float(info['format']['duration'])-expected)<.2
    assert abs(float(v['duration'])-float(a['duration']))<.2
    save('recitation-verification',{'file':str(final.resolve()),'audioFile':str(audio.resolve()),'kind':'Full spoken devotional recitation',
        'seconds':float(info['format']['duration']),'wordsMapped':len(words),'paragraphs':17,'captionFontSize':96,'maxCaptionLines':2,
        'whiteTextGoldActiveWord':True,'logoIncluded':True,'welcomeAndClosingIncluded':True,'newArtwork':2,
        'voiceId':PLAN['voiceId'],'sameNarrationVoiceAsPreviousChalisa':True,'pitchChanged':False,'playbackTempo':TEMPO,
        'fullDecodePassed':True,'resolution':'1920x1080','pronunciationListeningReviewPending':True,'published':False})
    print(json.dumps(read('recitation-verification')),flush=True)

if __name__=='__main__':render()
