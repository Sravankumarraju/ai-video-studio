"""Create an original melody-shaped vocal from the saved Telugu performance.

Uses pitch-synchronous resynthesis; no reference recording or singer cloning.
The original timing, unvoiced consonants and every prayer word are retained.
"""
from pathlib import Path
import json,math,re,subprocess,sys
sys.path.insert(0,str(Path('.tmp/chant-audio-deps').resolve()))
import numpy as np
from scipy.signal import stft
import parselmouth
from parselmouth.praat import call

ROOT=Path('data/productions/divine-wisdom/anjaneya-dandakam-2026-10-16')
OUT=ROOT/'melodic-voice-v5'
OUT.mkdir(exist_ok=True)
SOURCE=ROOT/'reference-v4/full-new-vocal.wav'
DATA=json.loads((ROOT/'reference-v4/words.json').read_text(encoding='utf-8'))
WORDS=DATA['words']
SCALE=[0,2,4,7,9]
PATTERNS=[[0,1,2,3,2,1],[2,3,4,3,2,1],[2,2,1,0,1,2],[3,2,1,0,0,0],[2,3,2,1,0,0]]

def run(args):subprocess.run(args,check=True)
def save(name,value):(OUT/f'{name}.json').write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')
def duration(path):return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(path)]))
def midi(hz):return 69+12*np.log2(hz/440)
def frequency(note):return 440*2**((note-69)/12)

def estimate_key():
    raw=subprocess.check_output(['ffmpeg','-v','error','-nostdin','-i',str(ROOT/'instrumental-v2.mp3'),'-t','50','-ac','1','-ar','12000','-f','f32le','-'])
    audio=np.frombuffer(raw,dtype='<f4')
    freqs,t,z=stft(audio,fs=12000,nperseg=4096,noverlap=3072)
    use=(freqs>=70)&(freqs<=1500)
    notes=np.rint(midi(freqs[use])).astype(int)%12
    energy=np.mean(np.abs(z[use])**.7,axis=1)
    chroma=np.bincount(notes,weights=energy,minlength=12)
    chroma/=chroma.sum()
    scores=[]
    for root in range(12):
        selected=[(root+n)%12 for n in SCALE]
        scores.append(float(chroma[selected]@np.array([1.5,.5,1.1,1.2,.55])))
    return int(np.argmax(scores)),chroma.tolist()

def melody(sound):
    pitch=sound.to_pitch(time_step=.01,pitch_floor=65,pitch_ceiling=380)
    values=pitch.selected_array['frequency']
    voiced=values>0
    median=float(np.median(values[voiced]))
    pitch_class,chroma=estimate_key()
    candidates=[n for n in range(43,56) if n%12==pitch_class]
    tonic=min(candidates,key=lambda n:abs(n-(float(midi(median))-4)))
    lines=[line.strip() for line in (ROOT/'lyrics-supplied.txt').read_text(encoding='utf-8').splitlines() if line.strip()]
    intervals=[];index=0
    for line_index,line in enumerate(lines):
        count=len(line.split());selected=WORDS[index:index+count];index+=count
        assert [w['text'] for w in selected]==line.split()
        pattern=PATTERNS[line_index%len(PATTERNS)];cursor=0
        for word_index,word in enumerate(selected):
            length=word['end']-word['start']
            note_count=max(1,min(3,round(length/.48)))
            for j in range(note_count):
                step=pattern[cursor%len(pattern)];cursor+=1
                if word_index==len(selected)-1 and j==note_count-1:step=0 if line_index%3 else 1
                a=word['start']+length*j/note_count;b=word['start']+length*(j+1)/note_count
                intervals.append({'start':a,'end':b,'midi':tonic+SCALE[step],'word':word['text'],'line':line_index})
    assert index==len(WORDS)==266
    anchors=[]
    for item in intervals:
        transition=min(.035,(item['end']-item['start'])/5)
        anchors += [(item['start']+transition,float(item['midi'])),(item['end']-transition,float(item['midi']))]
    anchors.sort()
    times=np.array([t for t,n in anchors]);notes=np.array([n for t,n in anchors])
    save('melody-plan',{'method':'Praat pitch-synchronous overlap-add with original note contour',
        'source':str(SOURCE),'originalVoiceMedianHz':median,'estimatedBackingPitchClass':pitch_class,'chromaEstimate':chroma,
        'tonicMidi':tonic,'tonicHz':frequency(tonic),'scaleSemitones':SCALE,'intervals':intervals,
        'words':266,'pitchNoteControl':.92,'timingPreserved':True,'unvoicedConsonantsPreserved':True,
        'copiedReferenceAudio':False,'sourceVoiceIsAIGenerated':True,'naturalSingingPerformanceClaimed':False})
    return pitch,voiced,times,notes

def synthesize():
    target=OUT/'Anjaneya-Dandakam-Melodic-Voice.wav'
    if target.exists():
        checks=json.loads((OUT/'pitch-and-word-checks.json').read_text(encoding='utf-8'))
        assert checks['fractionWithinOneSemitone']>.65 and checks['noClipping'],'Existing vocal needs review'
        return target
    sound=parselmouth.Sound(str(SOURCE)).convert_to_mono().resample(24000)
    pitch,voiced,times,notes=melody(sound)
    manipulation=call(sound,'To Manipulation',.01,65,380)
    tier=call('Create PitchTier','original-devotional-melody',sound.xmin,sound.xmax)
    voiced_times=pitch.xs()[voiced]
    voiced_values=pitch.selected_array['frequency'][voiced]
    for t,original in zip(voiced_times,voiced_values):
        desired=float(np.interp(t,times,notes))
        original_note=float(midi(original))
        desired=.92*desired+.08*original_note
        desired=max(original_note-9,min(original_note+9,desired))
        desired+=.07*math.sin(2*math.pi*4.7*t)
        call(tier,'Add point',float(t),frequency(desired))
    call([tier,manipulation],'Replace pitch tier')
    result=call(manipulation,'Get resynthesis (overlap-add)')
    assert abs(result.duration-sound.duration)<.025
    result.scale_peak(.88)
    result.save(str(target),'WAV')
    # Check that the produced pitch actually follows notes, not just metadata.
    measured=result.to_pitch(time_step=.01,pitch_floor=65,pitch_ceiling=380)
    hz=measured.selected_array['frequency'];okay=hz>0
    actual_midi=midi(hz[okay]);actual_times=measured.xs()[okay]
    desired_midi=np.interp(actual_times,times,notes)
    cents=np.abs(actual_midi-desired_midi)*100
    pcm=result.values[0];rate=result.sampling_frequency
    active=[]
    for word in WORDS:
        segment=pcm[round(word['start']*rate):round(word['end']*rate)]
        assert len(segment) and np.sqrt(np.mean(segment**2))>1e-5,word['text']
        active.append(word['text'])
    report={'seconds':result.duration,'wordsAudibleByEnergyCheck':len(active),'timingPreserved':True,
        'voicedPitchFrames':int(okay.sum()),'medianNoteErrorCents':float(np.median(cents)),
        'fractionWithinOneSemitone':float(np.mean(cents<100)),
        'noClipping':bool(np.max(np.abs(pcm))<.99),'listeningReviewPending':True,
        'description':'Melody-shaped version of the saved AI vocal using original musical notes; not a newly recorded human singer'}
    save('pitch-and-word-checks',report)
    print(json.dumps(report),flush=True)
    assert report['fractionWithinOneSemitone']>.65,'Pitch control needs review before delivery'
    return target

def main():
    vocal=synthesize();seconds=duration(vocal)
    mp3=ROOT/'Sri-Anjaneya-Dandakam-Song-Style-Voice-V5.mp3'
    if not mp3.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(vocal),'-af','loudnorm=I=-17:TP=-2:LRA=7,aresample=48000','-ac','2','-c:a','libmp3lame','-b:a','192k',str(mp3)])
    with_music=ROOT/'Sri-Anjaneya-Dandakam-Song-Style-With-Music-V5.mp3'
    if not with_music.exists():
        graph=(f'[0:a]loudnorm=I=-17:TP=-2:LRA=7,aresample=48000,aformat=channel_layouts=stereo,asplit=2[voice][side];'
            f'[1:a]loudnorm=I=-27:TP=-3:LRA=7,aresample=48000,aformat=channel_layouts=stereo,atrim=duration={seconds},'
            f'afade=t=in:d=0.7,afade=t=out:st={seconds-2}:d=2[bed];'
            '[bed][side]sidechaincompress=threshold=0.06:ratio=3:attack=15:release=300[ducked];'
            '[voice][ducked]amix=inputs=2:duration=first:normalize=0,alimiter=limit=.891251:level=false:latency=true[a]')
        run(['ffmpeg','-v','error','-nostdin','-n','-i',str(vocal),'-stream_loop','-1','-i',str(ROOT/'instrumental-v2.mp3'),
            '-filter_complex',graph,'-map','[a]','-t',str(seconds),'-c:a','libmp3lame','-b:a','192k',str(with_music)])
    for path in [mp3,with_music]:
        run(['ffmpeg','-v','error','-nostdin','-i',str(path),'-f','null','-'])
        assert abs(duration(path)-seconds)<.15
    preview=OUT/'Song-Style-Voice-Preview.mp3'
    if not preview.exists():run(['ffmpeg','-v','error','-nostdin','-n','-i',str(with_music),'-t','30','-c:a','libmp3lame','-b:a','192k',str(preview)])
    save('delivery',{'voiceOnly':str(mp3.resolve()),'withMusic':str(with_music.resolve()),'preview':str(preview.resolve()),
        'seconds':seconds,'words':266,'fullDecodePassed':True,'melodyShapedVocal':True,'listeningReviewPending':True})
    print(json.dumps(json.loads((OUT/'delivery.json').read_text(encoding='utf-8'))),flush=True)

if __name__=='__main__':main()
