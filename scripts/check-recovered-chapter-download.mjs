import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const job='383c72a6-2227-4897-aa51-0243aa029ec1';
const response=await fetch(`http://localhost:3000/api/mcp/files/jobs/${job}/download?format=mp4`,{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`,Range:'bytes=0-1023'}});
if(response.status!==206){await response.body?.cancel();throw Error(`Expected partial download; received ${response.status}`);}
assert.equal(response.headers.get('content-range'),'bytes 0-1023/1073096249');
const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.length,1024);assert.equal(bytes.toString('ascii',4,8),'ftyp');
const report={job,downloadRangePassed:true,status:response.status,bytes:1073096249};
await writeFile('data/productions/divine-wisdom/gita-chapter-1/audio-corrected-v5/download-verification.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
