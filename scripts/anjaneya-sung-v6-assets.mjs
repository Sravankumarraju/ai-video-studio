import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {credential,submit,save,exists,db,root} from './anjaneya-dandakam-audio.mjs';

const dir='song-style-v6';
const mode=process.argv[2];
const shortTest=process.argv[3]==='short';
const index=shortTest?0:Number(process.argv[3]||0);
async function main(){
  const plan=JSON.parse(await readFile(`${root}/${dir}/full-song-plan.json`,'utf8'));
  const stem=shortTest?'short-verse-test':index?`part-${String(index).padStart(2,'0')}`:'opening-edited';
  const prefix=`${dir}/${stem}`;
  if(mode==='download'){
    const record=JSON.parse(await readFile(`${root}/${prefix}-generation.json`,'utf8'));
    assert(record.status==='completed'&&record.result?.audioUrl);
    if(await exists(`${prefix}.wav`))return;
    const r=await fetch(record.result.audioUrl,{signal:AbortSignal.timeout(90000)});
    assert(r.ok,'Generated project audio asset download failed');
    const bytes=Buffer.from(await r.arrayBuffer());assert(bytes.length>10000);
    await writeFile(`${root}/${prefix}.wav`,bytes);
    console.log(JSON.stringify({stem,bytes:bytes.length}));return;
  }
  assert(['transcribe','align'].includes(mode));
  const name=`${prefix}-${mode}`;
  if(await exists(`${name}.json`)){console.log(JSON.stringify({stem,mode,cached:true}));return;}
  const key=await credential();
  const credits=await fetch('https://api.elevenlabs.io/v1/user/subscription',{headers:{'xi-api-key':key},signal:AbortSignal.timeout(30000)});
  assert(credits.ok,'Credit check failed');const info=await credits.json();
  assert(info.tier!=='free'&&Number(info.character_limit)-Number(info.character_count)>=10000,'Insufficient included credits; no overage');
  const form=new FormData();
  form.set('file',new Blob([new Uint8Array(await readFile(`${root}/${prefix}.wav`))],{type:'audio/wav'}),`${stem}.wav`);
  if(mode==='transcribe'){
    form.set('model_id','scribe_v2');form.set('language_code','tel');
    form.set('tag_audio_events','true');form.set('timestamps_granularity','word');
  }else{
    const text=shortTest?JSON.parse(await readFile(`${root}/${prefix}-generation.json`,'utf8')).lyrics:index?plan.parts.find(p=>p.index===index).text:(await readFile(`${root}/lyrics-supplied.txt`,'utf8')).trim().split(/\r?\n\s*\r?\n/)[0];
    form.set('text',text);
  }
  const bytes=await submit(name,mode==='transcribe'?'speech-to-text':'forced-alignment',form,key,false,
    'User approved V6 song style and requested the full production; verify sung lyrics and generate acoustic word timings for Telugu captions.');
  const result=JSON.parse(bytes.toString());await save(name,result);
  console.log(JSON.stringify({stem,mode,text:result.text,words:result.words?.length,loss:result.loss}));
}
main().catch(e=>{console.error(e instanceof assert.AssertionError||String(e.message).startsWith('Provider rejected')?e.message:'Asset check stopped; inspect saved attempt. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
