import {readFile,writeFile,access} from 'node:fs/promises';
const root='data/productions/divine-wisdom/devi-navaratri-2026';
const plan=JSON.parse(await readFile(root+'/production-plan.json','utf8'));
const pending=[];
for(const v of plan.videos){
 const prompts=JSON.parse(await readFile(v.dir+'/image-prompts.json','utf8'));
 for(const p of prompts){if(p.source||await access(v.dir+'/'+p.name+'.png').then(()=>true).catch(()=>false))continue;
 pending.push({slug:v.slug,name:p.name,destination:v.dir+'/'+p.name+'.png',prompt:p.prompt,reference:v.dir+'/hero.png'});}
 if(!await access(v.dir+'/thumbnail.png').then(()=>true).catch(()=>false))pending.push({slug:v.slug,name:'thumbnail',destination:v.dir+'/thumbnail.png',prompt:await readFile(v.dir+'/THUMBNAIL-PROMPT.md','utf8'),reference:v.dir+'/hero.png'});
}
await writeFile(root+'/art-queue.json',JSON.stringify(pending,null,2));
console.log(JSON.stringify(pending));
