import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const dir='data/productions/divine-wisdom/motivation-shorts-40/motivation-short-033';
const config=JSON.parse(await readFile(`${dir}/episode.json`,'utf8'));
const original=JSON.parse(await readFile(`${dir}/provider-alignment-original.json`,'utf8')),a=original.alignment;
assert.equal(a.characters.join(''),config.sections[0].text);
const words=[];let word='',start=0;
for(let i=0;i<a.characters.length;i++){const ch=a.characters[i];if(!word&&!/\s/u.test(ch))start=a.character_start_times_seconds[i];if(!/\s/u.test(ch))word+=ch;if((/\s/u.test(ch)||/[.!?\n]/u.test(ch)||i===a.characters.length-1)&&word){words.push({text:word,start,end:a.character_end_times_seconds[/\s/u.test(ch)?Math.max(0,i-1):i]});word='';}}
const missingWord='\u0c2e\u0c28';
assert.equal(words[0].text,missingWord);assert.equal(words[0].end,0);
const donor=words.slice(1).find(w=>w.text===missingWord&&w.end>w.start);assert(donor,'Recover only the identical spoken word from this saved recording');
const prefix=`${dir}/opening-word-reused.wav`,body=`${dir}/original-recording.wav`,output=`${dir}/recording-opening-restored.wav`;
execFileSync('ffmpeg',['-v','error','-y','-i',`${dir}/recording-review.mp3`,'-af',`atrim=start=${donor.start}:end=${donor.end},asetpts=PTS-STARTPTS`,'-ar','48000','-ac','1',prefix]);
execFileSync('ffmpeg',['-v','error','-y','-i',`${dir}/recording-review.mp3`,'-ar','48000','-ac','1',body]);
execFileSync('ffmpeg',['-v','error','-y','-i',prefix,'-i',body,'-filter_complex','[0:a][1:a]concat=n=2:v=0:a=1[out]','-map','[out]','-c:a','pcm_s16le',output]);
const duration=f=>Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',f],{encoding:'utf8'}));
const shift=duration(prefix),length=duration(output);
const recovered=[{text:missingWord,start:0,end:shift},...words.slice(1).map(w=>({...w,start:w.start+shift,end:Math.min(w.end+shift,length)}))];
assert(recovered.every(w=>w.end>w.start));assert.deepEqual(recovered.map(w=>w.text),config.sections[0].text.split(/\s+/u));
execFileSync('ffmpeg',['-v','error','-i',output,'-f','null','-']);
const client=new Client({name:'restore-saved-opening-word',version:'1'});
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`,Connection:'close'}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args});const text=r.content.find(c=>c.type==='text').text;assert(!r.isError,text);return JSON.parse(text);}
try{const project=await call('get_project',{projectId:config.projectId});
const scene=project.document.scenes.find(s=>s.id==='motivation-short-033-source-0');assert(scene&&scene.audioId===original.assetId&&!project.document.variants.length);
const name='Saved narration 033 \u00b7 missing opening word restored from same recording';
const asset=project.assets.find(a=>a.name===name)||await call('import_asset',{projectId:config.projectId,name,base64:(await readFile(output)).toString('base64')});
scene.audioId=asset.id;scene.duration=length;scene.captions=[{id:'restored-original-033',start:0,end:length,text:scene.narration,words:recovered,accuracy:'aligned'}];scene.narrationStale=false;scene.captionsStale=false;scene.status='Opening word restored from same saved recording; original asset preserved';
await call('update_project',{projectId:config.projectId,expectedRevision:project.revision,document:project.document});
await writeFile(`${dir}/opening-recovery.json`,JSON.stringify({originalAssetId:original.assetId,recoveredAssetId:asset.id,donor,insertedSeconds:shift,duration:length,originalScriptPreserved:true,newPaidCalls:0,method:'Prefix exact missing opening word using an identical naturally spoken word from the same saved recording; retain all remaining original audio and aligned words.'},null,2));
console.log(JSON.stringify({recovered:true,words:recovered.length,seconds:length,newPaidCalls:0}));
}finally{await client.close();}
