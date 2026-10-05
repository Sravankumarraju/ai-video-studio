import {readFile,writeFile,copyFile} from 'node:fs/promises';
const root='data/productions/divine-wisdom/devi-navaratri-2026',plan=JSON.parse(await readFile(root+'/production-plan.json','utf8'));
for(const v of plan.videos){const prompts=JSON.parse(await readFile(v.dir+'/image-prompts.json','utf8'));
 const p=prompts.find(p=>p.name==='worship');p.source=root+'/shared-worship.png';p.prompt='Reuse reviewed generic Telugu home Devi puja image; not the exact daily goddess form or an actual temple. Simple family worship illustration.';await copyFile(p.source,v.dir+'/worship.png');
 if(!v.form){const p=prompts.find(p=>p.name==='example');p.source=root+'/shared-family.png';p.prompt='Reuse original AI family listening illustration, clearly a modern editorial example.';await copyFile(p.source,v.dir+'/example.png');}
 await writeFile(v.dir+'/image-prompts.json',JSON.stringify(prompts,null,2));
}
console.log('Generic family worship shared with accurate prompt provenance.');
