import 'dotenv/config';
import {readFile,writeFile,stat,access} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const root='data/productions/divine-wisdom/devi-navaratri-2026';
const readyOnly=process.argv.includes('--ready');
const plan=JSON.parse(await readFile(root+'/production-plan.json','utf8'));
const releases=await readFile(root+'/release-plan.json','utf8').then(JSON.parse).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
const client=new Client({name:'navaratri-publishing',version:'1.0'});
assert(process.env.STORY_STUDIO_MCP_TOKEN);
await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp'),{requestInit:{headers:{Authorization:`Bearer ${process.env.STORY_STUDIO_MCP_TOKEN}`}}}));
async function call(name,args){const r=await client.callTool({name,arguments:args});assert(!r.isError);return JSON.parse(r.content.find(c=>c.type==='text').text);}
try{
 const manifest={playlistId:'PLE1rC25kAhXw',playlistUrl:'https://www.youtube.com/playlist?list=PLE1rC25kAhXw',privacy:'private',videos:[]};
 for(const video of plan.videos){
  if(readyOnly&&!await access(video.dir+'/verification-full.json').then(()=>true).catch(()=>false))continue;
  const config=JSON.parse(await readFile(video.dir+'/episode.json','utf8'));
  const state=JSON.parse(await readFile(video.dir+'/state.json','utf8'));
  const check=JSON.parse(await readFile(video.dir+'/verification-full.json','utf8'));
  assert.equal(check.visualEdition,state.graceEdition,'Upload only the corrected visual edition');
  assert(check.decodedEntireFile&&check.allScenesNarrated&&check.width===1920&&check.height===1080&&check.seconds<=300);
  const publishing=JSON.parse(await readFile(video.dir+'/publishing.json','utf8'));
  assert(!/undefined|భగవద్గీత/.test(publishing.description));
  assert(publishing.description.includes('AI disclosure:'));
  assert(publishing.description.trim().split('\n').at(-1).includes('క్షమాపణలు'));
  if(!state.youtubeThumbnailId){
   const file=video.dir+'/thumbnail.jpg',bytes=await readFile(file);assert(bytes.length<2*1024*1024);
   state.youtubeThumbnailId=(await call('import_asset',{projectId:video.projectId,name:'thumbnail.jpg',base64:bytes.toString('base64')})).id;
   await writeFile(video.dir+'/state.json',JSON.stringify(state,null,2));
  }
  const filename=video.dir+'/'+config.fileStem+'-full.mp4';assert((await stat(filename)).size>0);
  const tags=['Devi Navaratri','Navaratri 2026','Navadurga','Navadurga Telugu','Divine Wisdom Telugu','దేవీ నవరాత్రులు','నవదుర్గలు',...(video.form?[video.slug,video.name]:['Navaratri introduction','Navaratri significance'])];
  manifest.videos.push({episode:video.form,slug:video.slug,projectId:video.projectId,dir:video.dir,renderJobId:state.renderJobs.full,thumbnailAssetId:state.youtubeThumbnailId,mp4:filename,durationSeconds:check.seconds,metadata:releases?.releases.find(r=>r.slug===video.slug)?.metadata||{title:publishing.titles[0],description:publishing.description,tags}});
 }
 await writeFile(root+(readyOnly?'/youtube-ready-batch.json':'/youtube-private-batch.json'),JSON.stringify(manifest,null,2));
 console.log(JSON.stringify({verifiedVideos:manifest.videos.length,privacy:'private',playlistId:manifest.playlistId}));
}finally{await client.close();}
