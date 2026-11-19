"""Local NumPy/ONNX MDX inference; lower the accompaniment without paid calls.
STFT layout follows the UVR MDX interface documented by seanghay/uvr-mdx-infer.
Model source: TRvlvr/model_repo, UVR-MDX-NET-Inst_HQ_3 (instrumental estimate).
"""
from pathlib import Path
import numpy as np, onnxruntime as ort
from scipy.io import wavfile
from scipy import fft
import subprocess,json,math,time,sys
ROOT=Path('data/productions/divine-wisdom/mahishasura-mardini-2026-10-25')
OUT=ROOT/'female-full-v3'
MODEL=Path('data/runtime/mdx-models/UVR-MDX-NET-Inst_HQ_3.onnx')
NFFT=6144;HOP=1024;FRAMES=256;BINS=3072
WINDOW=np.hanning(NFFT+1)[:-1].astype(np.float32)
LENGTH=HOP*(FRAMES-1);TRIM=NFFT//2;STEP=LENGTH-2*TRIM
def stft(wave):
 pad=np.pad(wave,((0,0),(TRIM,TRIM)),mode='reflect')
 frames=np.lib.stride_tricks.sliding_window_view(pad,NFFT,axis=-1)[:,::HOP,:]*WINDOW
 z=fft.rfft(frames,axis=-1).transpose(0,2,1)
 return np.stack([z.real,z.imag],axis=1).reshape(1,4,NFFT//2+1,FRAMES)[:,:,:BINS].astype(np.float32)
def istft(tensor):
 spec=np.pad(tensor[0],((0,0),(0,NFFT//2+1-BINS),(0,0))).reshape(2,2,NFFT//2+1,FRAMES)
 z=spec[:,0]+1j*spec[:,1]
 frames=fft.irfft(z.transpose(0,2,1),n=NFFT,axis=-1)*WINDOW
 out=np.zeros((2,LENGTH+NFFT),np.float32);norm=np.zeros(LENGTH+NFFT,np.float32)
 for i in range(FRAMES):
  a=i*HOP;out[:,a:a+NFFT]+=frames[:,i];norm[a:a+NFFT]+=WINDOW**2
 good=norm>1e-8;out[:,good]/=norm[good]
 return out[:,TRIM:-TRIM]
def main():
 options=ort.SessionOptions();options.intra_op_num_threads=2;options.inter_op_num_threads=1
 session=ort.InferenceSession(str(MODEL),sess_options=options,providers=['CPUExecutionProvider'])
 assert session.get_inputs()[0].shape[-3:]==[4,BINS,FRAMES],session.get_inputs()[0].shape
 (OUT/'stems').mkdir(exist_ok=True)
 files=[('opening-verse',ROOT/'chant-female-sample-v1/chant-sample.mp3')]+[(f'batch-{i:02}',OUT/f'batch-{i:02}.mp3') for i in range(1,4)]
 reports=[]
 if len(sys.argv)>1:files=[x for x in files if x[0]==sys.argv[1]]
 for name,file in files:
  mixed=OUT/'stems'/f'{name}-quiet-music.wav'
  if mixed.exists():print(json.dumps({'remix':name,'state':'already_saved'}),flush=True);continue
  audio=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-nostdin','-i',str(file),'-ar','44100','-ac','2','-f','f32le','-']),dtype='<f4').reshape(-1,2).T.copy()
  count=audio.shape[1];blocks=math.ceil(count/STEP);pad=np.pad(audio,((0,0),(TRIM,blocks*STEP-count+TRIM)))
  checkpoints=OUT/'stems'/'checkpoints'/name;checkpoints.mkdir(parents=True,exist_ok=True)
  begin=time.monotonic()
  for index in range(blocks):
   checkpoint=checkpoints/f'{index:03}.npy'
   if not checkpoint.exists():
    x=pad[:,index*STEP:index*STEP+LENGTH];inp=stft(x)
    pred=session.run(None,{session.get_inputs()[0].name:inp})[0]
    np.save(checkpoint,istft(pred)[:,TRIM:-TRIM])
   if index%5==0 or index==blocks-1:print(json.dumps({'remix':name,'block':index+1,'total':blocks}),flush=True)
  instrumental=np.memmap(checkpoints/'instrumental-buffer.dat',mode='w+',dtype=np.float32,shape=(2,count))
  for index in range(blocks):
   a=index*STEP;b=min(count,a+STEP);instrumental[:,a:b]=np.load(checkpoints/f'{index:03}.npy')[:,:b-a]*1.022
  instrumental.flush();vocals=audio-instrumental
  # Preserve original timing; no speed or pitch changes. Original music is reduced 14 dB.
  result=vocals*1.3+instrumental*.2
  peak=float(np.max(np.abs(result)));gain=min(1.,.89/max(peak,1e-8));result*=gain
  wavfile.write(str(mixed),44100,result.T.astype(np.float32))
  wavfile.write(str(OUT/'stems'/f'{name}-vocals.wav'),44100,vocals.T.astype(np.float32))
  wavfile.write(str(OUT/'stems'/f'{name}-instrumental.wav'),44100,instrumental.T.astype(np.float32))
  reports.append({'section':name,'samples':count,'seconds':count/44100,'instrumentalGain':.2,'vocalGain':1.3,'peakSafetyGain':gain,'elapsedSeconds':time.monotonic()-begin})
  (OUT/('mix-report-'+sys.argv[1]+'.json' if len(sys.argv)>1 else 'mix-report.json')).write_text(json.dumps({'method':'Local ONNX instrumental separation and remix','model':str(MODEL),'musicGainDb':20*math.log10(.2),'vocalGainDb':20*math.log10(1.3),'timingChanged':False,'paidCalls':0,'reports':reports,'listeningReviewPending':True},indent=2),encoding='utf-8')
 print(json.dumps({'remixCompleted':True,'sections':4}),flush=True)
if __name__=='__main__':main()
