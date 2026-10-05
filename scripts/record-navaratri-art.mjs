import {copyFile,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const [destination,source]=process.argv.slice(2),root=path.resolve('data/productions/divine-wisdom/devi-navaratri-2026');
assert(path.resolve(destination).startsWith(root+path.sep));
await copyFile(source,destination);
const queue=JSON.parse(await readFile(root+'/art-queue.json','utf8')),spec=queue.find(s=>path.resolve(s.destination)===path.resolve(destination));assert(spec);
await writeFile(destination+'.generation.json',JSON.stringify({tool:'built-in imagegen',prompt:spec.prompt,source,destination,generatedAt:new Date().toISOString(),reviewStatus:'pending visual inspection'},null,2));
console.log(JSON.stringify({slug:spec.slug,name:spec.name,saved:destination}));
