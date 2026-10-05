import {copyFile,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
const [slug,source]=process.argv.slice(2);
const queue=JSON.parse(await readFile('data/productions/divine-wisdom/devi-navaratri-2026/grace-art-queue.json','utf8'));
const spec=queue.find(s=>s.slug===slug);assert(spec);
await copyFile(source,spec.destination);
await writeFile(spec.destination+'.generation.json',JSON.stringify({...spec,source,tool:'built-in imagegen',generatedAt:new Date().toISOString(),reviewStatus:'pending visual inspection'},null,2));
console.log(JSON.stringify({slug,saved:spec.destination}));
