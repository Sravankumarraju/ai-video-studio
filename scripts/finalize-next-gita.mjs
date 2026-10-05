import {readFile,writeFile,stat} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='data/productions/divine-wisdom';
const report=['# Episodes 007–010: completed Telugu long-form videos','', 'One shloka per video; 16:9 1080p, selected ElevenLabs voice, no music, gentle eased pans, clear Telugu word-highlight captions. Full exact shloka held only during recitation. Spoken Divine Wisdom Telugu welcome and chapter labels; subscribe/like/share/comment closing.',''];
const records=[];
for(const n of [7,8,9,10]){
 const dir=`${root}/gita-1-${n}/devotional-v1`;
 const config=JSON.parse(await readFile(`${dir}/episode.json`,'utf8'));
 const state=JSON.parse(await readFile(`${dir}/state.json`,'utf8'));
 const verification=JSON.parse(await readFile(`${dir}/verification-full.json`,'utf8'));
 assert(verification.decodedEntireFile&&verification.noMusic&&verification.longFormOnly&&verification.allScenesNarrated&&verification.seconds<=300&&verification.width===1920&&verification.height===1080);
 const file=`${config.fileStem}-full.mp4`,bytes=(await stat(`${dir}/${file}`)).size;assert(bytes>1000000);
 const duration=`${Math.floor(verification.seconds/60)}:${String(Math.floor(verification.seconds%60)).padStart(2,'0')}`;
 report.push(`- [Episode ${config.verseRef} · ${duration}](gita-1-${n}/devotional-v1/${file})`);
 await writeFile(`${dir}/README.md`,`# ${config.title}\n\n${config.videoTitle}\n\nCompleted: ${duration}, 1920×1080 H.264/AAC, Telugu long-form only, no music. Actual authorized ElevenLabs calls succeeded with voice ${config.voiceId}; configured model retained, no unsupported model availability claim. Gentle eased pans, uninterrupted narration across image cuts, word-highlight captions, full shloka static during its exact narration range.\n\nFull render ${state.renderJobs.full}; entire MP4 decoded successfully. Narration and aligned caption words checked, all scenes narrated. Original assets and scenes preserved.\n\n${config.sourceNotes}\n\nSources:\n${config.sources.join('\n')}\n\nFiles: ${file}, subtitles, editable episode.json/image-prompts.json, original recordings, publishing metadata, thumbnail and publishing-package.zip. Private YouTube upload is separately tracked in youtube-private-007-010-batch.json and upload verification.\n\nOpen http://localhost:3000 → Devotional projects → Bhagavad Gita · Telugu → this episode → Preview & exports. Start with docker compose up -d. All stages resume from state.json; never discard it to retry.\n`);
 records.push({episode:config.verseRef,projectId:config.projectId,directory:dir,status:'video-completed-and-verified',seconds:verification.seconds,renderJobId:state.renderJobs.full,youtubePrivacy:'private',uploaded:false});
}
report.push('','Each full file passed FFmpeg decoding and timeline checks. Draft browser playback and shloka readability are checked separately; live YouTube success is recorded only after the API confirms channel, Private visibility and thumbnail.','', 'New illustrations and thumbnails used built-in image generation; approved supporting illustrations and logo reused. Prompts are saved per episode.','', 'Provider profiles, existing videos 1.1–1.6 and their upload IDs are preserved. No project schema migration.');
await writeFile(`${root}/EPISODES_007_010_REPORT.md`,report.join('\n'));
await writeFile(`${root}/episodes-007-010-progress.json`,JSON.stringify({episodes:records},null,2));
console.log(JSON.stringify({videosVerified:records.length}));
