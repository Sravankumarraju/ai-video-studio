import assert from 'node:assert/strict';
export function youtubeChapterEntries(entries,seconds){
 assert(entries.length&&entries[0].start===0,'Chapters must start at zero');
 const accepted=[];
 for(const entry of entries){
  const start=Math.floor(entry.start),previous=accepted.at(-1);
  assert(Number.isFinite(start)&&start>=0);
  if(previous&&start-previous.start<10){assert(!entry.required,'A required verse chapter is under ten seconds from its predecessor');continue;}
  accepted.push({...entry,start});
 }
 if(Math.floor(seconds)-accepted.at(-1).start<10){assert(!accepted.at(-1).required,'Final required verse chapter is under ten seconds');accepted.pop();}
 assert(accepted.length>=3,'YouTube chapters need at least three markers');
 return accepted;
}
export function youtubeChapterSummaryEntries(entries,seconds){
 const structural=entries.filter(entry=>!entry.section?.verseNumber);
 return youtubeChapterEntries(structural.map(entry=>({...entry,required:false})),seconds);
}
