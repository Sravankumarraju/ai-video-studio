import {readFile,writeFile,readdir} from 'node:fs/promises';
const root='data/productions/divine-wisdom';
const read=path=>readFile(path,'utf8').then(JSON.parse).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
const progress=await read(`${root}/CHAPTERS-7-10-PROGRESS.json`);
for(const ch of progress.chapters){
 const s=await read(`${ch.dir}/state.json`),final=await read(`${ch.dir}/FINAL_DELIVERY.json`);
 ch.narrationJobsSaved=Object.keys(s.jobs).length;ch.finishedAudio=Object.keys(s.finished).length;
 ch.artReviewed=Boolean(await read(`${ch.dir}/art-review.json`));
 ch.draftJobId=s.renderJobs.draft||null;ch.fullJobId=s.renderJobs.full||null;
 ch.status=final?.status==='final'?'final verified local video':ch.fullJobId?'full render queued or verifying':ch.draftJobId?'draft queued or reviewing':ch.finishedAudio===ch.calls?'audio finished; artwork/assembly pending':'narration generating or audio finishing';
 if(final){ch.duration=final.duration;ch.video=`${ch.dir}/gita-chapter-${ch.chapter}-full.mp4`;}
}
progress.artFilesSaved=(await readdir(`${root}/chapters-7-10-art`)).filter(p=>p.endsWith('.png')).length;
progress.updatedAt=new Date().toISOString();progress.status=progress.chapters.every(c=>c.status==='final verified local video')?'Chapters 1–10 complete':'Approved production in progress';
await writeFile(`${root}/CHAPTERS-7-10-PROGRESS.json`,JSON.stringify(progress,null,2));
console.log(JSON.stringify({status:progress.status,artFilesSaved:progress.artFilesSaved,chapters:progress.chapters.map(({chapter,narrationJobsSaved,finishedAudio,calls,status})=>({chapter,narrationJobsSaved,finishedAudio,calls,status}))}));
