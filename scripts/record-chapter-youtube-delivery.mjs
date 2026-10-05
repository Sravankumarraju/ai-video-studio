import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const dir=process.argv[2]||'data/productions/divine-wisdom/gita-chapter-2/story-v1';
const read=name=>readFile(`${dir}/${name}`,'utf8').then(JSON.parse);
const delivery=await read('FINAL_DELIVERY.json'),youtube=await read('YOUTUBE_UPLOAD.json');
assert.equal(youtube.state,'completed');assert.equal(youtube.processingStatus,'succeeded');assert.equal(youtube.privacyStatus,'private');
assert(youtube.thumbnailApplied&&youtube.metadataVerified&&youtube.aiDisclosureInDescription&&youtube.videoId&&youtube.url);
delivery.youtubeUpload={status:'verified',privacy:'private',videoId:youtube.videoId,url:youtube.url,processingStatus:youtube.processingStatus,thumbnailApplied:true,metadataVerified:true,syntheticMediaFlagRequested:youtube.syntheticMediaFlagRequested,syntheticMediaFlagRemoteFieldAvailable:youtube.syntheticMediaFlagRemoteFieldAvailable,syntheticMediaFlagVerified:youtube.syntheticMediaFlagVerified};
await writeFile(`${dir}/FINAL_DELIVERY.json`,JSON.stringify(delivery,null,2));
let md=await readFile(`${dir}/FINAL_DELIVERY.md`,'utf8');
md=md.replace(/YouTube delivery is authorized[\s\S]*$/u,`YouTube delivery completed and was verified on the Divine Wisdom Telugu channel. Privacy: Private. Processing: succeeded. Thumbnail, title, description, tags, AI disclosure, and channel ownership were verified. Video: ${youtube.url}\n\nThe upload policy requested the synthetic-media flag. YouTube's videos.list response did not expose that field, so its remote value remains unverified rather than inferred.\n`);
await writeFile(`${dir}/FINAL_DELIVERY.md`,md);await writeFile(`${dir}/STATUS.md`,md);
execFileSync('python',['scripts/package-chapter-delivery.py',dir],{stdio:'inherit'});
console.log(JSON.stringify({chapter:delivery.chapterNumber,url:youtube.url,privacy:youtube.privacyStatus,processing:youtube.processingStatus,packageUpdated:true}));
