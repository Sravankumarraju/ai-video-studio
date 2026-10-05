import 'dotenv/config';
import {readFile,writeFile,stat} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const dir='data/productions/divine-wisdom/gita-chapter-1/visual-v2';
const read=name=>readFile(`${dir}/${name}`,'utf8').then(JSON.parse);
const config=await read('episode.json'),state=await read('state.json'),verified=await read('verification-full.json'),browser=await read('browser-full-verification.json'),reuse=await read('visual-reuse-verification.json'),publishing=await read('app-publishing-verification.json');
assert(verified.decodedEntireFile&&verified.all47VerseMeaningsCovered&&verified.noSanskritRecitation&&verified.width===1920&&verified.height===1080);
assert.equal(browser.renderJobId,state.renderJobs.full);assert.equal(browser.samples.length,3);assert(!browser.error&&browser.samples.every(s=>!s.error&&!s.paused&&s.currentTime>s.requested));
assert(reuse.narrationAssetIdsUnchanged&&reuse.all3348CaptionWordTimesUnchanged&&reuse.sourceImageBytesUnchanged&&reuse.noConsecutiveRepeatedImages);assert.equal(reuse.uniqueIllustrations,34);assert.equal(reuse.scenes,100);
assert(publishing.metadataSavedToCorrectEdition&&publishing.renderStillCompleted);assert((await stat(`${dir}/publishing-package.zip`)).size>0);assert((await stat(`${dir}/gita-chapter-1-full.mp4`)).size>1000000);
const client=new Client({name:'chapter-final-delivery',version:'1'});
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`,Connection:'close'}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args});assert(!r.isError);return JSON.parse(r.content.find(c=>c.type==='text').text);}
try{
 const p=await call('get_project',{projectId:config.projectId}),edition=p.document.variants.find(v=>v.id===config.variantId);assert(edition);
 assert.equal((await call('get_job',{jobId:state.renderJobs.full})).state,'completed');
 const originalScenes=JSON.stringify(p.document.scenes),otherEditions=JSON.stringify(p.document.variants.filter(v=>v.id!==edition.id));
 edition.name='Divine Wisdom Telugu · Chapter 1 · FINAL · 1080p · 16:9';
 p.document.variants=[edition,...p.document.variants.filter(v=>v.id!==edition.id)];
 await call('update_project',{projectId:p.id,expectedRevision:p.revision,document:p.document});
 const final=await call('get_project',{projectId:p.id});assert.equal(JSON.stringify(final.document.scenes),originalScenes);assert.equal(JSON.stringify(final.document.variants.filter(v=>v.id!==edition.id)),otherEditions);assert.equal(final.document.variants[0].id,config.variantId);
 assert.equal((await call('get_job',{jobId:state.renderJobs.full})).state,'completed','Final label must preserve the verified export');
 const exported=await call('get_exports',{jobId:state.renderJobs.full});assert(!exported.stale&&exported.files.mp4&&exported.files.srt&&exported.files.vtt);
 await writeFile(`${dir}/final-export-verification.json`,JSON.stringify({jobId:state.renderJobs.full,stale:false,authenticatedFiles:exported.files},null,2));
 const manifest={status:'final',finalizedAt:new Date().toISOString(),projectId:p.id,variantId:config.variantId,variantName:edition.name,renderJobId:state.renderJobs.full,seconds:verified.seconds,width:verified.width,height:verified.height,uniqueIllustrations:34,scenes:100,all47VerseMeaningsCovered:true,fullFileDecoded:true,browserStartMiddleEndVerified:true,earlierEditionsPreserved:true,files:{video:'gita-chapter-1-full.mp4',package:'publishing-package.zip',thumbnail:'thumbnail-upload.jpg'},youtubeUpload:'pending: prior channel uploadLimitExceeded; no upload attempted'};
 await writeFile(`${dir}/FINAL_DELIVERY.json`,JSON.stringify(manifest,null,2));
 await writeFile(`${dir}/FINAL_DELIVERY.md`,`# Final Chapter 1 video\n\n39:16 Telugu, 1080p 16:9 H.264/AAC. All 47 verse meanings, 34 reused illustrations across 100 scenes, original narration and aligned captions, gentle pans and channel branding. No music or Shorts.\n\nFull-file decoding and actual browser playback/seek checks passed at start, middle and ending. Earlier editions preserved. This edition is first in the project version list and labelled FINAL.\n\nVideo: gita-chapter-1-full.mp4\nPublishing files: publishing-package.zip\nThumbnail: thumbnail-upload.jpg\n\nOpen http://localhost:3000 → complete Chapter 1 project → Preview & exports → FINAL. YouTube upload remains pending due the channel limit; no upload attempted.\n`);
 const overviewPath='PROJECT_OVERVIEW_AND_IMPLEMENTATION.md';let overview=await readFile(overviewPath,'utf8');
 overview=overview.replace('### Preferred Chapter 1 visual revision: preview complete, Full HD rendering','### Final Chapter 1 video: verified Full HD delivery');
 overview=overview.replace(/The entire revised draft decoded successfully and actual browser playback\/seek checks passed at start, middle and ending\.[^\n]+/,'The complete revised draft and 1080p Full HD exports decoded successfully and actual browser playback/seek checks passed at start, middle and ending. Final job 3abb6b4c-3750-4f27-8487-759ba0051251 remains completed after final labeling. The preferred edition is labelled FINAL and is first in the project version list; earlier editions are preserved. Thumbnail, measured chapters, description, captions and publishing files are packaged. Final delivery: data/productions/divine-wisdom/gita-chapter-1/visual-v2/FINAL_DELIVERY.md. Private YouTube upload remains pending due the channel upload limit.');
 await writeFile(overviewPath,overview);
 console.log(JSON.stringify(manifest));
}finally{await client.close();}
