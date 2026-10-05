"""Original deterministic instrumental composition; no sampled songs or provider calls."""
from pathlib import Path
import numpy as np
import wave, json
out=Path('data/productions/divine-wisdom/animation-samples');out.mkdir(parents=True,exist_ok=True)
rate=48000; seconds=96; music=np.zeros((rate*seconds,2),dtype=np.float64)
def note(at,dur,midi,gain,kind,pan=0):
    count=int(dur*rate); t=np.arange(count)/rate; f=440*2**((midi-69)/12)
    if kind=='pad':
        signal=sum(np.sin(2*np.pi*f*(i+1)*t)/(i+1)**2.5 for i in range(4))
        env=np.sin(np.pi*np.minimum(t/dur,1))**1.8
    elif kind=='flute':
        phase=2*np.pi*f*t+0.009*np.sin(2*np.pi*4.5*t)
        signal=np.sin(phase)+.12*np.sin(2*phase)+.035*np.sin(3*phase)
        env=np.minimum(t/.22,1)*np.minimum((dur-t)/.4,1)
    else:
        signal=np.sin(2*np.pi*f*t)+.4*np.sin(2*np.pi*f*2*t)+.13*np.sin(2*np.pi*f*3*t)
        env=np.minimum(t/.012,1)*np.exp(-t*2.7)
    signal=signal*env*gain; start=int(at*rate); end=min(start+count,len(music)); signal=signal[:end-start]
    music[start:end,0]+=signal*np.sqrt((1-pan)/2);music[start:end,1]+=signal*np.sqrt((1+pan)/2)
    # Quiet delayed reflections keep the composition soft and spacious.
    for delay,level in [(.17,.16),(.31,.08)]:
        ds=start+int(delay*rate);de=min(ds+len(signal),len(music));
        if de>ds: music[ds:de]+=signal[:de-ds,None]*level
for k in range(8):
    at=k*12
    for pitch in [[50,57,62],[47,54,59],[43,50,57],[50,57,64]][k%4]:note(at,12,pitch,.026,'pad')
    melody=[[74,76,78,81],[78,76,74,71],[74,76,81,78],[76,74,71,69]][k%4]
    for i,pitch in enumerate(melody):note(at+1+i*2.5,2.2,pitch,.026,'flute',-.12)
    for i,pitch in enumerate([62,69,74,69]):note(at+i*3,2.9,pitch,.017,'pluck',.18)
fade=np.minimum(np.arange(len(music))/rate/2,1)*np.minimum((len(music)-np.arange(len(music)))/rate/2,1)
music*=fade[:,None];assert np.max(np.abs(music))<.5
pcm=np.clip(music*32767,-32768,32767).astype('<i2')
with wave.open(str(out/'original-devotional-bed.wav'),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(rate);f.writeframes(pcm.tobytes())
(out/'MUSIC-PROVENANCE.json').write_text(json.dumps({'type':'original procedural instrumental composition','seconds':seconds,'rate':rate,'instruments':'soft synthesized flute, plucked tones and pads','noExternalSamples':True,'noLiveMusicProviderCalls':True,'intendedMixVolume':0.12,'voiceDucking':True},indent=2))
print(json.dumps({'created':str(out/'original-devotional-bed.wav'),'seconds':seconds,'peak':float(np.max(np.abs(music)))}))
