import 'dotenv/config';
import {readFile,writeFile,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {productionPolicy} from './divine-production-policy.mjs';

const dir=process.argv[2]||'data/productions/divine-wisdom/gita-chapter-1/story-v4';
const read=name=>readFile(`${dir}/${name}`,'utf8').then(JSON.parse);
const config=await read('episode.json'),state=await read('state.json'),verified=await read('verification-full.json'),browser=await read('browser-full-verification.json'),publishing=await read('app-publishing-verification.json');
const {chapterNumber,verseCount}=productionPolicy(config),fileStem=config.fileStem||`gita-chapter-${chapterNumber}`;
assert(verified.decodedEntireFile&&(verified.allVerseMeaningsCovered||verified.all47VerseMeaningsCovered)&&verified.noSanskritRecitation&&verified.explicitChapterLabels);
assert.equal(verified.chapterNumber,chapterNumber);assert.equal(verified.verseCount,verseCount);assert.equal(verified.width,1920);assert.equal(verified.height,1080);
assert.equal(browser.renderJobId,state.renderJobs.full);assert.equal(browser.samples.length,3);assert(browser.samples.every(s=>!s.error&&!s.paused&&s.currentTime>s.requested));
assert(publishing.metadataSavedToCorrectEdition&&publishing.renderStillCompleted&&publishing.descriptionBytes<=5000);
assert((await stat(`${dir}/${fileStem}-full.mp4`)).size>1000000);

const timeline=await read('completed-timeline.json'),variant=timeline.document.variants.find(v=>v.id===config.variantId);assert(variant);
const scenes=variant.sceneIds.map(id=>timeline.document.scenes.find(s=>s.id===id));
assert(timeline.document.musicId&&timeline.document.ducking&&timeline.document.musicVolume<=.25);
assert(scenes.every(s=>s.mediaType!=='video'||s.id.includes('-welcome')),'Only the approved logo welcome may use video');
const engagement=['లైక్','షేర్','కామెంట్','సబ్‌స్క్రైబ్'];
for(const prefix of [`${config.prefix}-act-39`,`${config.prefix}-closing`]){
 const text=scenes.filter(s=>s.id===prefix||s.id.startsWith(prefix+'-part-')).map(s=>s.narration).join(' ');
 assert(engagement.every(word=>text.includes(word)),`${prefix} must ask for all four viewer actions`);
}

const client=new Client({name:'final-chapter-story',version:'2'});
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`,Connection:'close'}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args});assert(!r.isError);return JSON.parse(r.content.find(c=>c.type==='text').text);}
try{
 const job=await call('get_job',{jobId:state.renderJobs.full});assert.equal(job.state,'completed');
 const exports=await call('get_exports',{jobId:job.id});assert(!exports.stale);
 await writeFile(`${dir}/final-export-verification.json`,JSON.stringify({jobId:job.id,stale:false,authenticatedFiles:exports.files},null,2));
}finally{await client.close();}

const duration=`${Math.floor(verified.seconds/60)}:${String(Math.floor(verified.seconds%60)).padStart(2,'0')}`;
const manifest={status:'final',projectId:config.projectId,variantId:config.variantId,renderJobId:state.renderJobs.full,chapterNumber,chapterTitle:config.chapterTitle,verseCount,duration,seconds:verified.seconds,width:1920,height:1080,allVerseMeaningsCovered:true,explicitChapterAndShlokaLabels:true,midAndEndReminders:true,softOriginalMusicWithVoiceDucking:true,noAnimation:true,scenes:scenes.length,uniqueIllustrations:new Set(scenes.filter(s=>s.mediaType==='image').map(s=>s.assetId)).size,entireFileDecoded:true,browserStartMiddleEndVerified:true,youtubeUpload:'pending private upload',finalizedAt:new Date().toISOString()};
await writeFile(`${dir}/FINAL_DELIVERY.json`,JSON.stringify(manifest,null,2));
await writeFile(`${dir}/FINAL_DELIVERY.md`,`# Final Bhagavad Gita Chapter ${chapterNumber}\n\n${duration}, Telugu 1080p 16:9. All ${verseCount} verse meanings have explicit chapter and shloka introductions. The video includes a short branded welcome, middle and ending subscribe/like/share/comment reminders, soft original instrumental music with voice ducking, devotional paintings, gentle pans, and no animation.\n\nFull MP4 decoding and actual Story Studio browser playback at the start, middle and ending passed. Video: ${fileStem}-full.mp4. Publishing files, captions, thumbnail, script, prompts, and verification records are in publishing-package.zip.\n\nYouTube delivery is authorized as Private only and is tracked separately in YOUTUBE_UPLOAD.json after the live API verifies the upload.\n`);
execFileSync('python',['scripts/package-chapter-delivery.py',dir],{stdio:'inherit'});
await writeFile(`${dir}/STATUS.md`,await readFile(`${dir}/FINAL_DELIVERY.md`));
console.log(JSON.stringify(manifest));
