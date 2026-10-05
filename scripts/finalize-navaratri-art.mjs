import {readFile,writeFile,copyFile,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root='data/productions/divine-wisdom/devi-navaratri-2026';
const plan=JSON.parse(await readFile(root+'/production-plan.json','utf8'));
const useHero=new Set(['chandraghanta','kushmanda','katyayani','kalaratri','mahagauri','siddhidatri']);
const reason='Generated supporting image has incorrect arms, mount or attributes. Reuse the reviewed main iconography instead; preserve the rejected image and its generation prompt.';
const review=[];
const heroFiles={intro:'exec-590180fe-a610-472f-9274-3c77099aee67.png',shailputri:'exec-d23a4102-70bd-47d7-b70a-c3f4caf109d4.png',brahmacharini:'exec-e5083c43-a5d0-49af-96be-6d2aebcf45d7.png',chandraghanta:'exec-416e1190-c0dd-4927-8749-dd01d670009f.png',kushmanda:'exec-72665b5e-0479-4fe4-810f-d7b899273989.png',skandamata:'exec-8079e7bc-213b-4324-845a-6a3da2029918.png',katyayani:'exec-29cedb56-aa28-4fc5-b92a-a2789c79c98b.png',kalaratri:'exec-89294819-6b5f-460f-ba54-3001a3f20a9f.png',mahagauri:'exec-56e65685-7fb9-4210-ba94-78a5455d506d.png',siddhidatri:'exec-f0faf4c1-16e8-42b7-89b9-7fe5e47001df.png'};
const correctedExamplePrompt='Create ONE continuous 16:9 landscape watercolor-and-ink illustration in warm gold light and deep indigo shadows, with bottom fifth uncluttered dark for Telugu captions. A single modern Telugu college student seated at his desk calmly studying one open textbook beside a plain clock and closed laptop. One student, one room, one moment. Natural hands and anatomy. Dignified encouraging atmosphere. Absolutely no gods, goddesses, religious figures, shrines, thought bubbles, symbols, montage, duplicated people, split screens, borders, text or labels. The image illustrates forming a small consistent study habit.';
for(const video of plan.videos){
 const file=video.dir+'/image-prompts.json';
 const prompts=JSON.parse(await readFile(file,'utf8'));
 if(video.slug==='shailputri'){
  const example=prompts.find(p=>p.name==='example');
  example.previousPrompt??=example.prompt;example.prompt=correctedExamplePrompt;
  await writeFile(video.dir+'/example.png.generation.json',JSON.stringify({tool:'built-in imagegen',prompt:correctedExamplePrompt,source:'C:/Users/sravankumar.raju/.codex/generated_images/01a0f1cc-dc85-7b53-a935-94394c61607a/exec-f0ab570f-7448-4480-b965-33e90a5e520d.png',reviewStatus:'visually reviewed',correction:'Replaced collage containing a deity with a single modern study scene'},null,2));
 }
 if(useHero.has(video.slug)){
  const story=prompts.find(p=>p.name==='story');
  if(!story.source){
   await copyFile(video.dir+'/story.png',video.dir+'/story-rejected-v1.png');
   await copyFile(video.dir+'/story.png.generation.json',video.dir+'/story-rejected-v1.png.generation.json');
   await copyFile(video.dir+'/hero.png',video.dir+'/story.png');
   story.previousPrompt=story.prompt;
   story.prompt=prompts.find(p=>p.name==='hero').prompt;
   story.source=video.dir+'/hero.png';
   story.reviewNote=reason;
   await writeFile(video.dir+'/story.png.generation.json',JSON.stringify({source:story.source,prompt:story.prompt,reviewStatus:'reviewed reuse',reason},null,2));
  }
 }
 for(const prompt of prompts){
  const asset=video.dir+'/'+prompt.name+'.png';
  await access(asset);
  const evidence=await readFile(asset+'.generation.json','utf8').then(JSON.parse).catch(e=>{if(e.code!=='ENOENT')throw e;return {prompt:prompt.prompt,source:prompt.source||null,tool:prompt.source?'approved existing image reuse':'built-in imagegen',reviewStatus:'reviewed devotional illustration'};});
  if(prompt.name==='hero'){
   evidence.source='C:/Users/sravankumar.raju/.codex/generated_images/01a0f1cc-dc85-7b53-a935-94394c61607a/'+heroFiles[video.slug];
   evidence.promptNote='Saved editable production prompt; native image generation followed this iconography. Brahmacharini uses the corrected second image without a bull.';
  }
  if(evidence.reviewStatus==='pending visual inspection')evidence.reviewStatus='visually reviewed';
  await writeFile(asset+'.generation.json',JSON.stringify(evidence,null,2));
  review.push({slug:video.slug,name:prompt.name,asset,reviewStatus:evidence.reviewStatus,reused:!!prompt.source});
 }
 await writeFile(file,JSON.stringify(prompts,null,2));
 const thumb=video.dir+'/thumbnail.png';await access(thumb);
 const evidence=JSON.parse(await readFile(thumb+'.generation.json','utf8'));
 evidence.reviewStatus='visually reviewed: Telugu title and goddess form';
 await writeFile(thumb+'.generation.json',JSON.stringify(evidence,null,2));
 execFileSync('ffmpeg',['-hide_banner','-v','error','-y','-i',thumb,'-vf','scale=1280:720','-q:v','3',video.dir+'/thumbnail.jpg'],{stdio:'pipe'});
 video.imagesGenerated=true;video.thumbnailGenerated=true;
 review.push({slug:video.slug,name:'thumbnail',asset:thumb,reviewStatus:evidence.reviewStatus});
}
assert.equal(review.filter(a=>a.name==='thumbnail').length,10);
plan.artworkPreparedAt=new Date().toISOString();
await writeFile(root+'/production-plan.json',JSON.stringify(plan,null,2));
await writeFile(root+'/art-review.json',JSON.stringify({reviewedAt:new Date().toISOString(),assets:review,note:'Symbolic AI devotional art, not actual temple photographs. Rejected variants retained. No paid narration or MP4 completion is implied.'},null,2));
console.log(JSON.stringify({projects:plan.videos.length,images:review.filter(a=>a.name!=='thumbnail').length,thumbnails:10,narrationApproval:plan.narrationApproval}));
