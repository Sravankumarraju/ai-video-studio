import {readFile,writeFile} from 'node:fs/promises';
const dir='data/productions/divine-wisdom/gita-1-3/devotional-v1',prompts=JSON.parse(await readFile(`${dir}/image-prompts.json`,'utf8'));
for(const p of prompts){
 if(p.name==='teacher')p.prompt='Generate a NEW 16:9 landscape devotional epic illustration for Bhagavad Gita verse 1.3. Reference image is style and character identity ONLY; create a fresh composition. Preserve dignified elderly Dronacharya white beard and silver topknot in cream saffron robes, young dark-haired bearded Duryodhana in gold red armor. Duryodhana stands on RIGHT, gesture toward orderly distant Pandava army on LEFT while addressing Dronacharya at center. Majestic gold sunrise, deep indigo celestial atmosphere, beautiful painterly realism, subtle luminous sky and expressive faces, no divinity halo on human characters. No writing, no watermark, no violence, calm lower central region for large captions. Keep anatomy and hands natural.';
 else if(!p.source)p.prompt+=' Match the approved channel\'s luminous, exquisitely beautiful mythological illustrated style, with subtle celestial atmosphere, rather than flat dull realism.';
 if(p.name==='teacher')p.reference='data/productions/divine-wisdom/gita-1-2/devotional-v2/teacher.png';
}
await writeFile(`${dir}/image-prompts.json`,JSON.stringify(prompts,null,2));
