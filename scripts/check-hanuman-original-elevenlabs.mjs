import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {credential,submit,save,exists,db,root} from './anjaneya-dandakam-audio.mjs';
const dir='elevenlabs-original-song',mode=process.argv[2];
async function main(){
  assert(['transcribe','align','closing'].includes(mode));
  if(await exists(`${dir}/${mode}.json`)){console.log(JSON.stringify({mode,cached:true}));return;}
  const key=await credential();
  if(mode==='closing'){
    const text='జై ఆంజనేయా! మన డివైన్ విజ్డమ్ తెలుగు ఛానల్‌ను సబ్‌స్క్రైబ్ చేయండి. లైక్ చేయండి, షేర్ చేయండి. కామెంట్‌లో జై హనుమాన్ అని రాయండి.';
    const original=JSON.parse(await readFile(`${root}/plan.json`,'utf8'));
    const body={inputs:[{text,voice_id:original.narrationVoiceId}],model_id:original.narrationModel,language_code:'te'};
    const bytes=await submit(`${dir}/closing`,'text-to-dialogue/with-timestamps',body,key,true,'User requested original ElevenLabs-only devotional song with channel closing and subscribe, like, share and comment.');
    const result=JSON.parse(bytes.toString());assert(result.audio_base64&&result.alignment);
    await writeFile(`${root}/${dir}/closing.mp3`,Buffer.from(result.audio_base64,'base64'));
    await save(`${dir}/closing`,{text,alignment:result.alignment});return;
  }
  const file=await readFile(`${root}/${dir}/song.mp3`);
  const form=new FormData();form.set('file',new Blob([new Uint8Array(file)],{type:'audio/mpeg'}),'original-song.mp3');
  if(mode==='transcribe'){
    form.set('model_id','scribe_v2');form.set('language_code','tel');form.set('tag_audio_events','true');form.set('timestamps_granularity','word');
  }else form.set('text',(await readFile(`${root}/${dir}/lyrics-original-te.txt`,'utf8')).trim());
  const bytes=await submit(`${dir}/${mode}`,mode==='transcribe'?'speech-to-text':'forced-alignment',form,key,false,
    'Verify newly written original Telugu lyrics and determine acoustic caption timings for the ElevenLabs-only song.');
  const result=JSON.parse(bytes.toString());await save(`${dir}/${mode}`,result);
  console.log(JSON.stringify({mode,text:result.text,words:result.words?.length,loss:result.loss}));
}
main().catch(e=>{console.error(e instanceof assert.AssertionError||String(e.message).startsWith('Provider rejected')?e.message:'Song verification stopped; inspect saved attempt. Credentials suppressed.');process.exitCode=1;}).finally(()=>db.$disconnect());
