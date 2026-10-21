import {readFile,copyFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='data/productions/divine-wisdom/chapters-7-10-art';
const chapters=process.argv[2]?[Number(process.argv[2])]:[7,8,9,10];
for(const chapter of chapters) {
  assert([7,8,9,10].includes(chapter));
  const dir=`data/productions/divine-wisdom/gita-chapter-${chapter}/story-v1`;
  const prompts=JSON.parse(await readFile(`${dir}/image-prompts.json`,'utf8'));
  const assets=[];
  for(const {name} of prompts) {
    assert(/^[a-z]+$/.test(name));
    const source=`${root}/${name}.png`, bytes=await readFile(source);
    await copyFile(source,`${dir}/${name}.png`);
    assets.push({name,source,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
  await writeFile(`${dir}/art-provenance.json`,JSON.stringify({chapter,source:'New AI-generated devotional illustration library for Chapters 7–10',assets},null,2));
}
console.log('Chapter artwork synchronized; visual review must be recorded separately.');
