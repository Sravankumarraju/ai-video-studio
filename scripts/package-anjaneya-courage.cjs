/* Portable, credential-free studio backup compatible with /api/projects/import. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {projectSchema}=require('../lib/schema.ts');
const root=process.argv[2]||'data/productions/divine-wisdom/anjaneya-courage-2026-10-18';
const load=n=>JSON.parse(fs.readFileSync(`${root}/${n}.json`,'utf8'));
const timeline=load('timeline'),cues=load('captions'),publishing=load('publishing');
assert(load('verification').fullDecodePassed);
const assets=[];
function asset(id,file){assets.push({id,name:path.basename(file),base64:fs.readFileSync(file).toString('base64'),metadata:{source:'owner-approved channel project media'}});return id;}
asset('audio',`${root}/full-master-audio.m4a`);
asset('logo','data/branding/divine-wisdom/youtube-avatar/divine-wisdom-telugu-circle-safe.png');
for(const image of new Set(timeline.scenes.map(s=>s.image)))asset(path.parse(image).name,`${root}/artwork/${path.parse(image).name}.jpg`);
const scenes=timeline.scenes.map(s=>({id:`shot-${s.index}`,title:`Hanuman devotional shot ${s.index+1}`,assetId:path.parse(s.image).name,mediaType:'image',duration:s.end-s.start,audioId:'audio',audioStart:s.start,audioSlice:true,volume:1,fadeIn:0,fadeOut:0,transition:'cut',overlap:0,motion:s.motion,motionEasing:'smooth',strength:.035,focalX:.5,focalY:.44,status:'Supplied song with aligned Telugu lyrics',captions:cues.filter(c=>c.end>s.start&&c.start<s.end).map((c,i)=>({id:`cue-${s.index}-${i}`,start:Math.max(0,c.start-s.start),end:Math.min(s.end,c.end)-s.start,text:c.lines.join('\n'),accuracy:'aligned',words:c.words.filter(w=>w.end>s.start&&w.start<s.end).map(w=>({text:w.text,start:Math.max(0,w.start-s.start),end:Math.min(s.end,w.end)-s.start}))}))}));
const document=projectSchema.parse({title:'అంజనేయా — అడుగులో ధైర్యమా',topic:'Telugu Hanuman devotional song: courage, humility, Rama bhakti and service',category:'Devotional',language:'te',subtitleLanguage:'te',mode:'manual',budget:0,generationLimit:0,unknownCostPolicy:'block',targetDuration:Math.round(timeline.seconds),sourceClassification:'interpretation',script:fs.readFileSync(`${root}/lyrics-supplied.txt`,'utf8'),sources:'Owner supplied song and lyrics; existing channel Hanuman artwork and spoken bookends reused. Original devotional lyrics, not a scripture quotation.',logoId:'logo',publishing,scenes,variants:[{id:'anjaneya-editable',name:'Editable 16:9 · Telugu gold highlighting',aspect:'landscape',sceneIds:scenes.map(s=>s.id),captions:true,wordHighlight:true,highlightColor:'#ffd54a',font:'Noto Sans Telugu',fontSize:92,color:'#ffffff',outline:3,background:true,position:'bottom',captionBottom:.065,fps:24,crf:19,encodingPreset:'fast',targetDuration:Math.round(timeline.seconds),maxDuration:7200,publishing}],styleGuide:'Divine Wisdom Telugu cinematic Hanuman artwork, gentle motion, large Telugu captions and gold active words. Full finished MP4 is delivered separately and is authoritative for typography and framing. Original song speed and pitch preserved. Reused spoken channel welcome and closing. Final human listening review pending.'});
const backup={schemaVersion:1,document,assets};
fs.writeFileSync(`${root}/story-studio-project.json`,JSON.stringify(backup));
assert(fs.statSync(`${root}/story-studio-project.json`).size<100*1024*1024);
const ids=new Set(assets.map(a=>a.id));assert(document.scenes.every(s=>ids.has(s.assetId)&&ids.has(s.audioId)));
console.log(JSON.stringify({portableBackup:true,scenes:document.scenes.length,assets:assets.length,bytes:fs.statSync(`${root}/story-studio-project.json`).size}));
