import {readFile,writeFile} from 'node:fs/promises';
import {nextVerseContent} from './gita-015-020-content.mjs';
const ids={15:'4f0a1905-36b7-4801-893b-dcce4b256f83',16:'73cccf17-7837-4094-bb15-f7b32d62033d',17:'4025a3ed-9017-4bbe-8b17-532c0266bf91',18:'3e3847bb-7951-4f3d-b9de-f323739bff1a',19:'fc12999b-d57d-436d-ac51-4b0f1d00b814',20:'98bac2dd-fc85-41c9-8a83-60967e156977'};
for(const n of [15,16,17,18,19,20]){
 const dir=`data/productions/divine-wisdom/gita-1-${n}/devotional-v1`,content=nextVerseContent[n];
 const prompt=`Use case: ads-marketing. One 16:9 Divine Wisdom Telugu thumbnail. Luminous gold and indigo epic devotional painting; right scene: ${content.hero} Left: big exact Telugu heading “భగవద్గీత”, exact label “అధ్యాయం 1 · శ్లోకం ${n}”, white theme “${content.theme}”. Channel label Divine Wisdom Telugu at top. Generous margins, dignified characters, no collage or gore.`;
 const manifest=JSON.parse(await readFile(`${dir}/GENERATED-MEDIA.json`,'utf8'));
 manifest.assets=manifest.assets.filter(a=>a.name!=='thumbnail');
 manifest.assets.push({name:'thumbnail',file:'thumbnail.png',prompt,generator:'built-in imagegen',source:`C:/Users/sravankumar.raju/.codex/generated_images/01a0f1cc-dc85-7b53-a935-94394c61607a/exec-${ids[n]}.png`,visuallyInspected:true,width:1672,height:941});
 await writeFile(`${dir}/GENERATED-MEDIA.json`,JSON.stringify(manifest,null,2));
 await writeFile(`${dir}/THUMBNAIL-PROMPT.md`,prompt+'\n\nGenerated thumbnail saved as thumbnail.png. The JPEG upload copy is thumbnail-upload.jpg. This prompt is editable; regenerate to create a new thumbnail version.\n');
}
console.log('Recorded six generated thumbnail prompts and source files.');
