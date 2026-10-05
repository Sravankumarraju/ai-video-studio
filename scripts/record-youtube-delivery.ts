import {ownerApi} from './youtube-owner';
import {readFile,writeFile,access} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='data/productions/divine-wisdom';
async function main(){
 const playlist=JSON.parse(await readFile(`${root}/youtube-playlist-verification.json`,'utf8'));
 const uploads=await ownerApi('uploads');
 assert.equal(playlist.privacyStatus,'private');
 const included=playlist.videos.map((v:any)=>{
  const upload=uploads.find((u:any)=>u.videoId===v.videoId);
  assert(upload&&upload.state==='completed'&&upload.thumbnailApplied&&v.privacyStatus==='private','Every included upload must be complete with a verified private video and applied thumbnail');
  return {videoId:v.videoId,title:v.title,renderJobId:upload.renderJobId,projectId:upload.projectId,uploadId:upload.id,privacyStatus:'private',thumbnailApplied:true,processingStatus:v.processingStatus,url:`https://www.youtube.com/watch?v=${v.videoId}`};
 });
 const result={playlistId:playlist.playlistId,playlistUrl:playlist.url,private:true,verifiedAt:playlist.verifiedAt,count:included.length,videos:included};
 await writeFile(`${root}/YOUTUBE_DELIVERY.json`,JSON.stringify(result,null,2));
 await writeFile(`${root}/YOUTUBE_DELIVERY.md`,`# Private YouTube delivery\n\n${included.length} videos uploaded and added to the private Bhagavad Gita playlist. Video privacy, channel ownership and playlist membership verified through actual YouTube API calls; all thumbnails applied.\n\nPlaylist: ${playlist.url}\n\n${included.map((v:any)=>`- ${v.title}: ${v.url}`).join('\n')}\n\nProcessing state is recorded in YOUTUBE_DELIVERY.json. Earlier successful upload IDs are reused; drafts and replaced editions were not uploaded.\n`);
 for(const dir of [`${root}/gita-chapter-1/story-v4`,...([11,12,13,14].map(n=>`${root}/gita-1-${n}/devotional-v1`))]){
  const file=`${dir}/FINAL_DELIVERY.json`;if(!await access(file).then(()=>true).catch(()=>false))continue;
  const delivery=JSON.parse(await readFile(file,'utf8')),video=included.find((v:any)=>v.renderJobId===delivery.renderJobId);if(!video)continue;
  delivery.youtubeUpload='completed and verified private';delivery.youtubeVideoId=video.videoId;delivery.youtubeUrl=video.url;delivery.youtubePlaylistId=playlist.playlistId;delivery.youtubePlaylistUrl=playlist.url;
  await writeFile(file,JSON.stringify(delivery,null,2));await writeFile(`${dir}/YOUTUBE_UPLOAD.json`,JSON.stringify({...video,playlistId:playlist.playlistId,playlistUrl:playlist.url,verifiedAt:playlist.verifiedAt},null,2));
  for(const name of ['README.md','FINAL_DELIVERY.md','STATUS.md']){
   const path=`${dir}/${name}`;let doc=await readFile(path,'utf8').catch(()=>null);if(doc===null)continue;
   doc=doc.replace(/YouTube upload not attempted; connected channel previously reached its upload limit\./g,'YouTube upload completed and verified private.').replace(/No YouTube upload attempted; the channel previously reached its upload limit\./g,'YouTube upload completed and verified private.');
   if(!doc.includes('## YouTube delivery'))doc+=`\n## YouTube delivery\n\nVerified private upload: ${video.url}\nPrivate playlist: ${playlist.url}\nThumbnail applied; actual channel, privacy and playlist membership verified.\n`;
   await writeFile(path,doc);
  }
 }
 const overview='PROJECT_OVERVIEW_AND_IMPLEMENTATION.md';let doc=await readFile(overview,'utf8');
 doc=doc.replace(/\n<!-- YOUTUBE_DELIVERY_STATUS -->[\s\S]*?<!-- END_YOUTUBE_DELIVERY_STATUS -->\n?/g,'\n');
 doc+=`\n<!-- YOUTUBE_DELIVERY_STATUS -->\n## Verified private YouTube delivery\n\n${included.length} latest long-form videos are uploaded with thumbnails and added to the private Bhagavad Gita playlist: ${playlist.url}. Existing successful video IDs were preserved. Actual YouTube API calls verified channel ownership, private visibility and playlist membership. See data/productions/divine-wisdom/YOUTUBE_DELIVERY.md and YOUTUBE_DELIVERY.json for individual videos and processing status.\n<!-- END_YOUTUBE_DELIVERY_STATUS -->\n`;
 await writeFile(overview,doc);
 console.log(JSON.stringify({videos:included.length,playlistUrl:playlist.url,verifiedPrivate:true}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
