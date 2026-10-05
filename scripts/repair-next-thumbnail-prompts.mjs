import {readFile,writeFile} from 'node:fs/promises';
const headlines={11:'నాయకుడికి తోడు',12:'ధైర్యం ఇచ్చే సంకేతం',13:'శబ్దం మధ్య స్పష్టత',14:'తోడుగా మార్గదర్శి'};
for(const n of [11,12,13,14]){
 const dir=`data/productions/divine-wisdom/gita-1-${n}/devotional-v1`;
 const generated=JSON.parse(await readFile(`${dir}/GENERATED-MEDIA.json`,'utf8'));
 const thumbnail=generated.assets.find(a=>a.name==='thumbnail');
 thumbnail.prompt=`16:9 devotional YouTube thumbnail. Right: ${generated.assets.find(a=>a.name==='hero').prompt} Left dark indigo: large correctly formed gold Telugu headline exactly "${headlines[n]}". White subtitle exactly "అధ్యాయం 1 • శ్లోకం ${n}". Top-left "Divine Wisdom Telugu". Strong contrast, readable on phone, all text 6% inside edges, no clipping, no watermark.`;
 await writeFile(`${dir}/GENERATED-MEDIA.json`,JSON.stringify(generated,null,2));
 await writeFile(`${dir}/THUMBNAIL-PROMPT.md`,thumbnail.prompt);
}
