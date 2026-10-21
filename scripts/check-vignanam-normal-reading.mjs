import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {credential,submit,save,exists,db,root} from './anjaneya-dandakam-audio.mjs';
const dir=process.argv[2]||'vignanam-normal-reading';
async function main(){
  if(await exists(`${dir}/transcription.json`)){console.log('Normal reading transcript already saved');return;}
  const key=await credential(),form=new FormData();
  form.set('file',new Blob([new Uint8Array(await readFile(`${root}/${dir}/Anjaneya-Dandakam-Normal-Reading.mp3`))],{type:'audio/mpeg'}),'normal-reading.mp3');
  form.set('model_id','scribe_v2');form.set('language_code','tel');form.set('tag_audio_events','true');form.set('timestamps_granularity','word');
  const bytes=await submit(`${dir}/transcription`,'speech-to-text',form,key,false,'Check newly requested normal Telugu Dandakam reading for missing passages independently of its generated alignment.');
  const result=JSON.parse(bytes.toString());await save(`${dir}/transcription`,result);
  console.log(JSON.stringify({text:result.text,words:result.words?.filter(w=>w.type==='word').length}));
}
main().catch(e=>{console.error(e instanceof assert.AssertionError||String(e.message).startsWith('Provider rejected')?e.message:'Reading transcription stopped; credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
